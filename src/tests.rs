use crate::core::engine::{
 get_active_anomalies, get_endpoint_detail, get_status, import_reference_rows_json, init_db,
 load_saved_endpoint_config_json, merge_status_with_registry_json, process_observation,
 resolve_anomaly_by_id, resolve_endpoint_config_json, save_endpoint_config_json,
 save_references_json, validate_reference_rows_json,
};
use crate::core::grain::{build_grain_key, canonical_grain_key, lookup_dimension};
use crate::core::json::{flatten_json, lookup_path, numeric_value};
use crate::core::storage::{
 checkpoint, endpoint_detail_payload_with_limits, init_schema, next_id, resolve_endpoint_config,
 save_endpoint_config, save_references, upsert_anomaly, upsert_endpoint_record,
};
use crate::core::types::{default_tolerance, Config, RequestPayload};
use crate::{
 get_active_anomalies as py_get_active_anomalies, get_endpoint_detail as py_get_endpoint_detail,
 get_status as py_get_status, import_reference_rows as py_import_reference_rows,
 init_db as py_init_db, merge_status_with_registry as py_merge_status_with_registry,
 process_observation as py_process_observation, resolve_anomaly as py_resolve_anomaly,
 resolve_endpoint_config as py_resolve_endpoint_config,
 save_endpoint_config as py_save_endpoint_config, save_references as py_save_references,
};
use duckdb::{params, Connection};
use pyo3::prelude::PyAnyMethods;
use pyo3::types::PyModule;
use pyo3::Python;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_db_path(name: &str) -> String {
 let nanos = SystemTime::now()
 .duration_since(UNIX_EPOCH)
 .expect("time went backwards")
 .as_nanos();
 env::temp_dir()
 .join(format!("-{name}-{nanos}.duckdb"))
 .to_string_lossy()
 .to_string()
}

fn base_request() -> String {
 json!({
 "path": {"retailer": "amazon", "period": "YTD"},
 "query": {},
 "body": {},
 "headers": {"x-region": "us"}
 })
 .to_string()
}

fn base_config() -> String {
 json!({
 "dimension_fields": ["retailer", "period"],
 "kpi_fields": ["value"],
 "tolerance_pct": 10.0,
 "confirmed": false
 })
 .to_string()
}

#[test]
fn flatten_json_uses_dot_notation() {
 let payload = json!({
 "retailer": "amazon",
 "data": {"RSV": 100.0, "nested": {"units": 5}},
 "items": [{"name": "one"}]
 });
 let flat = flatten_json(&payload);

 assert_eq!(flat.get("retailer"), Some(&json!("amazon")));
 assert_eq!(flat.get("data.RSV"), Some(&json!(100.0)));
 assert_eq!(flat.get("data.nested.units"), Some(&json!(5)));
 assert_eq!(flat.get("items.0.name"), Some(&json!("one")));
}

#[test]
fn flatten_json_ignores_root_scalars_and_lookup_path_rejects_arrays() {
 let flat = flatten_json(&json!(42));
 assert!(flat.is_empty());

 let payload = json!({"items": [{"name": "one"}]});
 assert_eq!(
 lookup_path(&payload, "items"),
 Some(json!([{"name": "one"}]))
 );
 assert_eq!(lookup_path(&payload, "items.0.name"), None);
}

#[test]
fn build_grain_key_sorts_dimensions() {
 let dims = BTreeMap::from([
 ("retailer".to_string(), "amazon".to_string()),
 ("period".to_string(), "YTD".to_string()),
 ]);

 assert_eq!(
 build_grain_key("/api/sales", &dims),
 "/api/sales|period=YTD|retailer=amazon"
 );
 assert_eq!(
 build_grain_key("/api/health", &BTreeMap::new()),
 "/api/health"
 );
}

#[test]
fn canonical_grain_key_ignores_technical_dimensions() {
 assert_eq!(
 canonical_grain_key(
 "/api/sales|api_version=1.0.0|label=current|period=YTD|retailer=amazon|timestamp=2026-03-21T10:00:00Z|_jin_id=row-1"
 ),
 "/api/sales|period=YTD|retailer=amazon"
 );
}

#[test]
fn process_observation_threshold_flow_is_end_to_end() {
 let db_path = temp_db_path("threshold");
 init_db(&db_path).expect("db init");

 let first = process_observation(
 "/api/sales",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 100.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("first observation");
 let second = process_observation(
 "/api/sales",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 150.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("second observation");
 let status = get_status(&db_path).expect("status");

 let first_json: Value = serde_json::from_str(&first).expect("parse first");
 let second_json: Value = serde_json::from_str(&second).expect("parse second");
 let status_json: Value = serde_json::from_str(&status).expect("parse status");

 assert_eq!(first_json["status"], "learning");
 assert_eq!(second_json["status"], "learning");
 assert_eq!(second_json["anomalies"], json!([]));
 assert_eq!(
 second_json["reconciliation"]["missing_reference"],
 1
 );
 assert_eq!(
 second_json["grain_key"],
 "/api/sales|period=YTD|retailer=amazon"
 );
 assert_eq!(status_json["endpoints"][0]["active_anomalies"], 0);

 let _ = fs::remove_file(db_path);
}

#[test]
fn process_observation_uses_reference_thresholds() {
 let db_path = temp_db_path("reference");
 init_db(&db_path).expect("db init");

 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 let reference_id = next_id(&conn, "jin_reference").expect("next id");
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 reference_id,
 "/api/sales",
 "/api/sales|period=YTD|retailer=amazon",
 "value",
 100.0_f64,
 5.0_f64,
 "test"
 ],
 )
 .expect("insert reference");
 checkpoint(&conn).expect("checkpoint");
 drop(conn);

 let result = process_observation(
 "/api/sales",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 120.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("observation");
 let result_json: Value = serde_json::from_str(&result).expect("parse result");

 assert_eq!(result_json["status"], "anomaly");
 assert_eq!(result_json["anomalies"][0]["method"], "reconciliation");
 assert_eq!(
 result_json["comparisons"][0]["reconciliation_status"],
 "mismatch"
 );

 let _ = fs::remove_file(db_path);
}

#[test]
fn process_observation_uses_reference_even_when_uploaded_grain_has_technical_metadata() {
 let db_path = temp_db_path("reference-technical");
 init_db(&db_path).expect("db init");

 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 let reference_id = next_id(&conn, "jin_reference").expect("next id");
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 reference_id,
 "/api/sales",
 "/api/sales|api_version=0.1.0|period=YTD|retailer=amazon",
 "value",
 100.0_f64,
 5.0_f64,
 "test"
 ],
 )
 .expect("insert reference");
 checkpoint(&conn).expect("checkpoint");
 drop(conn);

 let request = json!({
 "path": {"retailer": "amazon", "period": "YTD"},
 "query": {},
 "body": {},
 "headers": {"api_version": "1.0.0"}
 })
 .to_string();
 let config = json!({
 "dimension_fields": ["retailer", "period", "api_version"],
 "kpi_fields": ["value"],
 "tolerance_pct": 10.0,
 "confirmed": true
 })
 .to_string();

 let result = process_observation(
 "/api/sales",
 "GET",
 &request,
 &json!({"retailer": "amazon", "period": "YTD", "value": 120.0}).to_string(),
 &config,
 &db_path,
 )
 .expect("observation");
 let result_json: Value = serde_json::from_str(&result).expect("parse result");

 assert_eq!(result_json["status"], "anomaly");
 assert_eq!(result_json["anomalies"][0]["method"], "reconciliation");

 let _ = fs::remove_file(db_path);
}

#[test]
fn validate_reference_rows_promotes_textual_contextual_expected_fields() {
 let payload = validate_reference_rows_json(
 &json!(["retailer", "data[].label", "data[].revenue"]).to_string(),
 &json!([
 {
 "endpoint": "/api/revenue/{retailer}",
 "dimension_fields": "retailer",
 "kpi_fields": "data[].label,data[].revenue",
 "grain_retailer": "amazon",
 "expected_data[].label": "current",
 "expected_data[].revenue": "4711.9",
 "tolerance_pct": "10"
 }
 ])
 .to_string(),
 None,
 )
 .expect("validate rows");

 let parsed: Value = serde_json::from_str(&payload).expect("parse payload");
 assert_eq!(
 parsed["dimension_fields"],
 json!(["retailer", "data[].label"])
 );
 assert_eq!(parsed["kpi_fields"], json!(["data[].revenue"]));
 assert_eq!(
 parsed["normalized"][0]["dimensions"]["data[].label"],
 json!("current")
 );
 assert!(parsed["warnings"][0]
 .as_str()
 .expect("warning text")
 .contains("treated as contextual field"));
}

#[test]
fn save_config_and_references_are_end_to_end() {
 let db_path = temp_db_path("config");
 init_db(&db_path).expect("db init");

 let config_result = save_endpoint_config_json(
 &db_path,
 "/api/sales",
 "GET",
 &json!(["retailer", "period"]).to_string(),
 &json!(["value"]).to_string(),
 &json!({
 "dimension_fields": ["retailer", "period"],
 "kpi_fields": ["value"],
 "tolerance_pct": 12.0,
 "confirmed": true,
 "references": [{
 "grain_key": "/api/sales|period=YTD|retailer=amazon",
 "kpi_field": "value",
 "expected_value": 110.0
 }]
 })
 .to_string(),
 )
 .expect("save config");
 let reference_result = save_references_json(
 &db_path,
 "/api/sales",
 &json!({
 "references": [{
 "grain_key": "/api/sales|period=YTD|retailer=amazon",
 "kpi_field": "value",
 "expected_value": 120.0,
 "tolerance_pct": 8.0
 }]
 })
 .to_string(),
 "ui",
 )
 .expect("save references");
 let detail = get_endpoint_detail(&db_path, "/api/sales").expect("detail");

 let config_json: Value = serde_json::from_str(&config_result).expect("parse config");
 let reference_json: Value = serde_json::from_str(&reference_result).expect("parse refs");
 let detail_json: Value = serde_json::from_str(&detail).expect("parse detail");

 assert_eq!(config_json["ok"], true);
 assert_eq!(config_json["count"], 1);
 assert_eq!(reference_json["count"], 1);
 assert_eq!(detail_json["config"]["confirmed"], true);
 assert_eq!(detail_json["config"]["tolerance_pct"], 12.0);
 assert_eq!(detail_json["endpoint"]["config_source"], "ui");
 assert_eq!(detail_json["references"][0]["expected_value"], 120.0);
 assert_eq!(detail_json["references"][0]["tolerance_pct"], 8.0);

 let _ = fs::remove_file(db_path);
}

#[test]
fn payloads_fall_back_cleanly_when_stored_json_is_malformed() {
 let db_path = temp_db_path("malformed-json");
 init_db(&db_path).expect("db init");

 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_endpoints (
 endpoint_path, http_method, pydantic_schema, dimension_fields, kpi_fields, config_source
 ) VALUES (?, ?, ?, ?, ?, ?)
 ",
 params!["/api/malformed", "GET", "{bad", "{bad", "{bad", "auto",],
 )
 .expect("insert endpoint");
 conn.execute(
 "
 INSERT INTO jin_observations (
 id, endpoint_path, grain_key, dimension_json, kpi_json, source
 ) VALUES (?, ?, ?, ?, ?, ?)
 ",
 params![
 next_id(&conn, "jin_observations").expect("obs id"),
 "/api/malformed",
 "/api/malformed",
 "{bad",
 "{bad",
 "live",
 ],
 )
 .expect("insert observation");
 checkpoint(&conn).expect("checkpoint");

 let status_json: Value =
 serde_json::from_str(&get_status(&db_path).expect("status")).expect("parse status");
 let endpoint = status_json["endpoints"]
 .as_array()
 .expect("endpoint array")
 .iter()
 .find(|item| item["endpoint_path"] == "/api/malformed")
 .expect("malformed endpoint");
 assert_eq!(endpoint["schema_contract"], json!({}));
 assert_eq!(endpoint["dimension_fields"], json!([]));
 assert_eq!(endpoint["kpi_fields"], json!([]));
 assert_eq!(endpoint["fields"], json!([]));
 assert_eq!(endpoint["current_kpis"], json!([]));

 let detail_json: Value =
 serde_json::from_str(&get_endpoint_detail(&db_path, "/api/malformed").expect("detail"))
 .expect("parse detail");
 assert_eq!(detail_json["schema_contract"], json!({}));
 assert_eq!(detail_json["history"][0]["dimension_json"], json!({}));
 assert_eq!(detail_json["history"][0]["kpi_json"], json!({}));
 assert_eq!(detail_json["recent_history"][0]["kpi_json"], json!({}));
 assert_eq!(detail_json["trend_summary"], json!([]));
 assert_eq!(detail_json["current_kpis"], json!([]));

 let _ = fs::remove_file(db_path);
}

#[test]
fn native_payloads_include_schema_and_trend_summary() {
 let db_path = temp_db_path("native-schema-trends");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_endpoints (
 endpoint_path, http_method, pydantic_schema, dimension_fields, kpi_fields, config_source
 ) VALUES (?, ?, ?, ?, ?, ?)
 ",
 params![
 "/api/native-schema",
 "GET",
 json!({
 "fields": [{"name": "retailer", "kind": "dimension", "annotation": "str"}],
 "dimension_fields": ["retailer", "period"],
 "kpi_fields": ["value"]
 })
 .to_string(),
 json!(["retailer", "period"]).to_string(),
 json!(["value"]).to_string(),
 "confirmed",
 ],
 )
 .expect("insert endpoint");
 checkpoint(&conn).expect("checkpoint");
 drop(conn);

 let config = json!({
 "dimension_fields": ["retailer", "period"],
 "kpi_fields": ["value"],
 "tolerance_pct": 10.0,
 "confirmed": true
 })
 .to_string();
 let request = base_request();
 let _ = process_observation(
 "/api/native-schema",
 "GET",
 &request,
 &json!({"retailer": "amazon", "period": "YTD", "value": 100.0}).to_string(),
 &config,
 &db_path,
 )
 .expect("first");
 let _ = process_observation(
 "/api/native-schema",
 "GET",
 &request,
 &json!({"retailer": "amazon", "period": "YTD", "value": 120.0}).to_string(),
 &config,
 &db_path,
 )
 .expect("second");
 let _ = save_references_json(
 &db_path,
 "/api/native-schema",
 &json!({
 "references": [{
 "grain_key": "/api/native-schema|period=YTD|retailer=amazon",
 "kpi_field": "value",
 "expected_value": 115.0,
 "tolerance_pct": 5.0
 }]
 })
 .to_string(),
 "ui",
 )
 .expect("save reference");
 let _ = process_observation(
 "/api/native-schema",
 "GET",
 &request,
 &json!({"retailer": "amazon", "period": "YTD", "value": 130.0}).to_string(),
 &config,
 &db_path,
 )
 .expect("reconciliation mismatch");

 let status_json: Value =
 serde_json::from_str(&get_status(&db_path).expect("status")).expect("parse status");
 let endpoint = status_json["endpoints"]
 .as_array()
 .expect("endpoint array")
 .iter()
 .find(|item| item["endpoint_path"] == "/api/native-schema")
 .expect("native endpoint");
 assert_eq!(endpoint["schema_contract"]["kpi_fields"], json!(["value"]));
 assert_eq!(endpoint["fields"][0]["name"], "retailer");
 assert_eq!(endpoint["current_kpis"][0]["kpi_field"], "value");
 assert_eq!(endpoint["current_kpis"][0]["expected_value"], 115.0);
 let endpoint_pct_change = endpoint["current_kpis"][0]["pct_change"]
 .as_f64()
 .expect("endpoint pct change");
 assert!((endpoint_pct_change - 13.043478).abs() < 0.001);
 assert_eq!(endpoint["current_kpis"][0]["reconciliation_status"], "mismatch");
 assert_eq!(endpoint["current_kpis"][0]["severity"], "low");
 assert_eq!(endpoint["current_kpis"][0]["confidence"], 0.95);

 let detail_json: Value =
 serde_json::from_str(&get_endpoint_detail(&db_path, "/api/native-schema").expect("detail"))
 .expect("parse detail");
 assert_eq!(
 detail_json["schema_contract"]["dimension_fields"],
 json!(["retailer", "period"])
 );
 assert_eq!(detail_json["trend_summary"][0]["kpi_field"], "value");
 assert_eq!(detail_json["trend_summary"][0]["samples"], 3);
 assert_eq!(detail_json["current_kpis"][0]["expected_value"], 115.0);
 let detail_pct_change = detail_json["current_kpis"][0]["pct_change"]
 .as_f64()
 .expect("detail pct change");
 assert!((detail_pct_change - 13.043478).abs() < 0.001);
 assert_eq!(detail_json["current_kpis"][0]["reconciliation_status"], "mismatch");
 assert_eq!(detail_json["anomalies"][0]["severity"], "low");
 assert_eq!(detail_json["anomalies"][0]["confidence"], 0.95);

 let _ = fs::remove_file(db_path);
}

#[test]
fn resolve_endpoint_config_merges_defaults_database_and_runtime() {
 let db_path = temp_db_path("resolve-config");
 init_db(&db_path).expect("db init");

 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_config (
 endpoint_path, dimension_overrides, kpi_overrides, tolerance_pct, confirmed,
 rows_path, time_end_field, time_profile, time_extraction_rule, time_format,
 time_field, time_granularity
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 "/api/watch",
 json!(["order_id"]).to_string(),
 json!(["amount"]).to_string(),
 12.0_f64,
 true,
 Option::<String>::None,
 Option::<String>::None,
 "auto",
 "single",
 Option::<String>::None,
 Option::<String>::None,
 "minute",
 ],
 )
 .expect("insert config");
 checkpoint(&conn).expect("checkpoint");

 let resolved = resolve_endpoint_config(
 &conn,
 "/api/watch",
 &["retailer".to_string()],
 &["value".to_string()],
 10.0,
 Some(20.0),
 &json!({"confirmed": true}),
 )
 .expect("resolve");
 let resolved_json: Value = serde_json::from_str(&resolved).expect("parse resolved");

 assert_eq!(resolved_json["dimension_fields"], json!(["order_id"]));
 assert_eq!(resolved_json["kpi_fields"], json!(["amount"]));
 assert_eq!(resolved_json["tolerance_pct"], 20.0);
 assert_eq!(resolved_json["confirmed"], true);

 let _ = fs::remove_file(db_path);
}

#[test]
fn save_and_load_endpoint_config_roundtrips_migrated_mapping_columns() {
 let db_path = temp_db_path("save-load-mapping-columns");
 init_db(&db_path).expect("db init");

 let saved = save_endpoint_config_json(
 &db_path,
 "/api/watch",
 "GET",
 &json!(["retailer"]).to_string(),
 &json!(["amount"]).to_string(),
 &json!({
 "dimension_fields": ["retailer", "period"],
 "kpi_fields": ["amount"],
 "tolerance_pct": 12.0,
 "confirmed": true,
 "rows_path": "payload.items[]",
 "time_end_field": "period_end",
 "time_profile": "year_week",
 "time_extraction_rule": "last",
 "time_format": "%Y-W%W",
 "time_field": "period",
 "time_granularity": "week",
 })
 .to_string(),
 )
 .expect("save config");
 let saved_json: Value = serde_json::from_str(&saved).expect("parse saved");
 assert_eq!(saved_json["rows_path"], json!("payload.items[]"));
 assert_eq!(saved_json["time_end_field"], json!("period_end"));
 assert_eq!(saved_json["time_profile"], json!("year_week"));
 assert_eq!(saved_json["time_extraction_rule"], json!("last"));
 assert_eq!(saved_json["time_format"], json!("%Y-W%W"));
 assert_eq!(saved_json["time_field"], json!("period"));
 assert_eq!(saved_json["time_granularity"], json!("week"));

 let loaded = load_saved_endpoint_config_json(&db_path, "/api/watch").expect("load config");
 let loaded_json: Value = serde_json::from_str(&loaded).expect("parse loaded");
 assert_eq!(loaded_json["rows_path"], json!("payload.items[]"));
 assert_eq!(loaded_json["time_end_field"], json!("period_end"));
 assert_eq!(loaded_json["time_profile"], json!("year_week"));
 assert_eq!(loaded_json["time_extraction_rule"], json!("last"));
 assert_eq!(loaded_json["time_format"], json!("%Y-W%W"));
 assert_eq!(loaded_json["time_field"], json!("period"));
 assert_eq!(loaded_json["time_granularity"], json!("week"));

 let _ = fs::remove_file(db_path);
}

#[test]
fn reconciliation_requires_uploaded_reference_to_flag_mismatch() {
 let db_path = temp_db_path("tolerance-modes");
 init_db(&db_path).expect("db init");

 let baseline_request = base_request();
 let relaxed_config = json!({
 "dimension_fields": ["retailer", "period"],
 "kpi_fields": ["value"],
 "tolerance_pct": 10.0,
 "tolerance_relaxed": 60.0,
 "tolerance_normal": 10.0,
 "tolerance_strict": 5.0,
 "active_tolerance": "relaxed",
 "confirmed": true
 })
 .to_string();
 let strict_config = json!({
 "dimension_fields": ["retailer", "period"],
 "kpi_fields": ["value"],
 "tolerance_pct": 10.0,
 "tolerance_relaxed": 60.0,
 "tolerance_normal": 10.0,
 "tolerance_strict": 5.0,
 "active_tolerance": "strict",
 "confirmed": true
 })
 .to_string();

 let _ = process_observation(
 "/api/tolerance",
 "GET",
 &baseline_request,
 &json!({"retailer": "amazon", "period": "YTD", "value": 100.0}).to_string(),
 &relaxed_config,
 &db_path,
 )
 .expect("baseline");
 let relaxed = process_observation(
 "/api/tolerance",
 "GET",
 &baseline_request,
 &json!({"retailer": "amazon", "period": "YTD", "value": 130.0}).to_string(),
 &relaxed_config,
 &db_path,
 )
 .expect("relaxed result");
 let relaxed_json: Value = serde_json::from_str(&relaxed).expect("parse relaxed");
 assert_eq!(relaxed_json["status"], "learning");
 assert_eq!(relaxed_json["anomalies"], json!([]));

 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 next_id(&conn, "jin_reference").expect("next id"),
 "/api/tolerance-strict",
 "/api/tolerance-strict|period=YTD|retailer=amazon",
 "value",
 100.0_f64,
 5.0_f64,
 "test"
 ],
 )
 .expect("insert reference");
 checkpoint(&conn).expect("checkpoint");

 let _strict_baseline = process_observation(
 "/api/tolerance-strict",
 "GET",
 &baseline_request,
 &json!({"retailer": "amazon", "period": "YTD", "value": 100.0}).to_string(),
 &strict_config,
 &db_path,
 )
 .expect("strict baseline");
 let strict = process_observation(
 "/api/tolerance-strict",
 "GET",
 &baseline_request,
 &json!({"retailer": "amazon", "period": "YTD", "value": 111.0}).to_string(),
 &strict_config,
 &db_path,
 )
 .expect("strict result");
 let strict_json: Value = serde_json::from_str(&strict).expect("parse strict");
 assert_eq!(strict_json["status"], "anomaly");
 assert!(strict_json["anomalies"]
 .as_array()
 .expect("anomaly list")
 .iter()
 .any(|item| item["method"] == "reconciliation"));

 let _ = fs::remove_file(db_path);
}

#[test]
fn active_anomalies_can_be_listed_and_resolved() {
 let db_path = temp_db_path("resolve-anomaly");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 next_id(&conn, "jin_reference").expect("next id"),
 "/api/sales",
 "/api/sales|period=YTD|retailer=amazon",
 "value",
 100.0_f64,
 5.0_f64,
 "test"
 ],
 )
 .expect("insert reference");
 checkpoint(&conn).expect("checkpoint");
 drop(conn);

 let _ = process_observation(
 "/api/sales",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 100.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("first observation");
 let _ = process_observation(
 "/api/sales",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 150.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("second observation");

 let anomalies: Value =
 serde_json::from_str(&get_active_anomalies(&db_path).expect("anomalies"))
 .expect("parse anomalies");
 let anomaly_id = anomalies["anomalies"][0]["id"]
 .as_i64()
 .expect("anomaly id");
 let resolved: Value =
 serde_json::from_str(&resolve_anomaly_by_id(&db_path, anomaly_id).expect("resolve"))
 .expect("parse resolve");
 let after: Value =
 serde_json::from_str(&get_active_anomalies(&db_path).expect("anomalies after"))
 .expect("parse after");

 assert_eq!(
 anomalies["anomalies"].as_array().map(|items| items.len()),
 Some(1)
 );
 assert_eq!(resolved["ok"], true);
 assert_eq!(
 after["anomalies"].as_array().map(|items| items.len()),
 Some(0)
 );

 let _ = fs::remove_file(db_path);
}

#[test]
fn upserting_same_native_anomaly_updates_existing_row() {
 let db_path = temp_db_path("anomaly-update");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 upsert_endpoint_record(
 &conn,
 "/api/anomaly-update",
 "GET",
 &json!(["retailer"]).to_string(),
 &json!(["value"]).to_string(),
 "confirmed",
 None,
 )
 .expect("endpoint");
 upsert_anomaly(
 &conn,
 "/api/anomaly-update",
 "/api/anomaly-update|retailer=amazon",
 &crate::core::types::AnomalyResult {
 kpi_field: "value".to_string(),
 actual: 120.0,
 expected: 100.0,
 pct_change: 20.0,
 method: "threshold".to_string(),
 severity: "medium".to_string(),
 priority: "P2".to_string(),
 correlated_with: vec![],
 confidence: 0.75,
 impact: 0.0,
 },
 )
 .expect("first anomaly");
 upsert_anomaly(
 &conn,
 "/api/anomaly-update",
 "/api/anomaly-update|retailer=amazon",
 &crate::core::types::AnomalyResult {
 kpi_field: "value".to_string(),
 actual: 160.0,
 expected: 100.0,
 pct_change: 60.0,
 method: "threshold".to_string(),
 severity: "high".to_string(),
 priority: "P1".to_string(),
 correlated_with: vec![],
 confidence: 0.85,
 impact: 0.0,
 },
 )
 .expect("updated anomaly");
 checkpoint(&conn).expect("checkpoint");

 let anomalies: Value =
 serde_json::from_str(&get_active_anomalies(&db_path).expect("active anomalies"))
 .expect("parse anomalies");
 assert_eq!(
 anomalies["anomalies"].as_array().map(|items| items.len()),
 Some(1)
 );
 assert_eq!(anomalies["anomalies"][0]["actual_value"], 160.0);
 assert_eq!(anomalies["anomalies"][0]["pct_change"], 60.0);
 assert_eq!(anomalies["anomalies"][0]["severity"], "high");
 assert!(anomalies["anomalies"][0]["ai_explanation"]
 .as_str()
 .expect("explanation")
 .contains("60.00%"));

 let _ = fs::remove_file(db_path);
}

#[test]
fn anomaly_recovery_auto_resolves_matching_native_alerts() {
 let db_path = temp_db_path("auto-resolve");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 next_id(&conn, "jin_reference").expect("next id"),
 "/api/sales",
 "/api/sales|period=YTD|retailer=amazon",
 "value",
 100.0_f64,
 5.0_f64,
 "test"
 ],
 )
 .expect("insert reference");
 checkpoint(&conn).expect("checkpoint");
 drop(conn);

 let _ = process_observation(
 "/api/sales",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 100.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("baseline");
 let threshold = process_observation(
 "/api/sales",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 150.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("threshold anomaly");
 let recovered = process_observation(
 "/api/sales",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 102.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("recovered observation");

 let threshold_json: Value = serde_json::from_str(&threshold).expect("parse threshold");
 let recovered_json: Value = serde_json::from_str(&recovered).expect("parse recovered");
 let active_after: Value =
 serde_json::from_str(&get_active_anomalies(&db_path).expect("active anomalies"))
 .expect("parse active");
 let status_after: Value =
 serde_json::from_str(&get_status(&db_path).expect("status after")).expect("parse status");

 assert_eq!(threshold_json["status"], "anomaly");
 assert_eq!(recovered_json["status"], "healthy");
 assert_eq!(active_after["anomalies"], json!([]));
 assert_eq!(status_after["endpoints"][0]["active_anomalies"], 0);
 assert_eq!(status_after["endpoints"][0]["status"], "warning");

 let _ = fs::remove_file(db_path);
}

#[test]
fn merge_status_with_registry_adds_missing_routes() {
 let merged = merge_status_with_registry_json(
 &json!({
 "summary": {"total_endpoints": 1, "healthy": 0, "anomalies": 1, "unconfirmed": 1},
 "endpoints": [{
 "endpoint_path": "/api/sales",
 "http_method": "GET",
 "dimension_fields": ["retailer"],
 "kpi_fields": ["value"],
 "grain_count": 1,
 "active_anomalies": 1,
 "status": "anomaly",
 "confirmed": false,
 "tolerance_pct": 10.0,
 "config_source": "auto",
 "last_checked": "2026-03-12 10:00:00"
 }]
 })
 .to_string(),
 &json!([
 {
 "endpoint_path": "/api/info",
 "http_method": "GET",
 "dimension_fields": ["label"],
 "kpi_fields": [],
 "fields": [{"name": "label", "kind": "dimension", "annotation": "str"}]
 },
 {
 "endpoint_path": "/api/sales",
 "http_method": "GET",
 "dimension_fields": ["retailer"],
 "kpi_fields": ["value"],
 "fields": [{"name": "value", "kind": "kpi", "annotation": "float"}]
 }
 ])
 .to_string(),
 10.0,
 )
 .expect("merge");
 let merged_json: Value = serde_json::from_str(&merged).expect("parse merge");

 assert_eq!(merged_json["summary"]["total_endpoints"], 2);
 assert_eq!(merged_json["summary"]["anomalies"], 1);
 assert_eq!(merged_json["endpoints"][0]["endpoint_path"], "/api/info");
 assert_eq!(merged_json["endpoints"][1]["status"], "anomaly");
}

#[test]
fn merge_status_with_registry_prefers_runtime_values_and_wrapper_errors_are_reported() {
 let merged = merge_status_with_registry_json(
 &json!({
 "summary": {"total_endpoints": 1, "healthy": 1, "anomalies": 0, "unconfirmed": 0},
 "endpoints": [{
 "endpoint_path": "/api/demo",
 "http_method": "POST",
 "dimension_fields": ["runtime_dimension"],
 "kpi_fields": ["runtime_kpi"],
 "grain_count": 4,
 "active_anomalies": 0,
 "status": "healthy",
 "confirmed": true,
 "tolerance_pct": 14.0,
 "config_source": "ui",
 "last_checked": "2026-03-13 11:00:00",
 "fields": [{"name": "runtime_kpi", "kind": "kpi", "annotation": "float"}]
 }]
 })
 .to_string(),
 &json!([
 {
 "endpoint_path": "/api/demo",
 "http_method": "GET",
 "dimension_fields": ["registry_dimension"],
 "kpi_fields": ["registry_kpi"],
 "fields": [{"name": "registry_kpi", "kind": "kpi", "annotation": "float"}]
 }
 ])
 .to_string(),
 10.0,
 )
 .expect("merge");
 let merged_json: Value = serde_json::from_str(&merged).expect("parse merge");

 assert_eq!(merged_json["endpoints"][0]["http_method"], "POST");
 assert_eq!(
 merged_json["endpoints"][0]["dimension_fields"],
 json!(["runtime_dimension"])
 );
 assert_eq!(
 merged_json["endpoints"][0]["fields"][0]["name"],
 "runtime_kpi"
 );

 let db_path = temp_db_path("wrapper-errors");
 init_db(&db_path).expect("db init");

 assert!(merge_status_with_registry_json("{bad", "[]", 10.0).is_err());
 assert!(merge_status_with_registry_json("{}", &json!([{}]).to_string(), 10.0).is_err());
 assert!(import_reference_rows_json(&db_path, "/api/demo", "{bad", "[]", "[]", "csv").is_err());
 assert!(save_endpoint_config_json(&db_path, "/api/demo", "GET", "{bad", "[]", "{}").is_err());
 assert!(save_references_json(&db_path, "/api/demo", "{bad", "ui").is_err());
 assert!(
 resolve_endpoint_config_json(&db_path, "/api/demo", "{bad", "[]", 10.0, None, "{}")
 .is_err()
 );

 let _ = fs::remove_file(db_path);
}

#[test]
fn json_and_grain_helpers_cover_edge_cases() {
 let nested = json!({
 "path": {"retailer": "amazon"},
 "body": {"count": 4, "flag": true},
 "meta": [{"value": "x"}]
 });
 let flat = flatten_json(&nested);
 let request: RequestPayload = serde_json::from_value(json!({
 "path": {"retailer": "amazon"},
 "query": {"period": "YTD"},
 "body": {"count": 4, "flag": true},
 "headers": {"x-region": "us"}
 }))
 .expect("request payload");

 assert_eq!(lookup_path(&nested, "path.retailer"), Some(json!("amazon")));
 assert_eq!(lookup_path(&nested, "body.missing"), None);
 assert_eq!(numeric_value(&json!(4.5)), Some(4.5));
 assert_eq!(numeric_value(&json!("7.25")), Some(7.25));
 assert_eq!(numeric_value(&json!(true)), None);
 assert_eq!(
 lookup_dimension("GET", &request, &flat, "period"),
 Some("YTD".to_string())
 );
 assert_eq!(
 lookup_dimension("POST", &request, &flat, "count"),
 Some("4".to_string())
 );
 assert_eq!(
 lookup_dimension("PATCH", &request, &flat, "x-region"),
 Some("us".to_string())
 );
 assert_eq!(
 lookup_dimension("GET", &request, &flat, "meta.0.value"),
 Some("x".to_string())
 );
 assert_eq!(
 lookup_dimension("DELETE", &request, &flat, "flag"),
 Some("true".to_string())
 );
 assert_eq!(
 lookup_dimension("GET", &request, &flat, "count"),
 Some("4".to_string())
 );
 assert_eq!(
 lookup_dimension(
 "GET",
 &request,
 &BTreeMap::from([("remote_flag".to_string(), json!(true))]),
 "remote_flag"
 ),
 Some("true".to_string())
 );
 assert_eq!(lookup_dimension("GET", &request, &flat, "missing"), None);

 let array_flat = flatten_json(&json!([{"name": "one"}, {"name": "two"}]));
 assert_eq!(array_flat.get("0.name"), Some(&json!("one")));
}

#[test]
fn config_defaults_and_resolution_cover_missing_rows() {
 let parsed: Config = serde_json::from_value(json!({
 "dimension_fields": ["retailer"],
 "kpi_fields": ["value"]
 }))
 .expect("config parse");
 assert_eq!(parsed.tolerance_pct, default_tolerance());
 assert!(!parsed.confirmed);

 let db_path = temp_db_path("resolve-defaults");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");
 let resolved = resolve_endpoint_config(
 &conn,
 "/api/default",
 &["retailer".to_string()],
 &["value".to_string()],
 10.0,
 None,
 &json!({"dimension_fields": ["region"], "kpi_fields": ["amount"], "confirmed": true}),
 )
 .expect("resolve defaults");
 let resolved_json: Value = serde_json::from_str(&resolved).expect("parse resolved");
 assert_eq!(resolved_json["dimension_fields"], json!(["region"]));
 assert_eq!(resolved_json["kpi_fields"], json!(["amount"]));
 assert_eq!(resolved_json["tolerance_pct"], 10.0);
 assert_eq!(resolved_json["confirmed"], true);
 let _ = fs::remove_file(db_path);
}

#[test]
fn resolve_endpoint_config_handles_malformed_db_lists_and_mode_derived_tolerance() {
 let db_path = temp_db_path("resolve-malformed-db");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_config (
 endpoint_path, dimension_overrides, kpi_overrides, tolerance_pct, confirmed,
 tolerance_relaxed, tolerance_normal, tolerance_strict, active_tolerance,
 rows_path, time_end_field, time_profile, time_extraction_rule, time_format,
 time_field, time_granularity
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 "/api/derived",
 "{bad",
 "{bad",
 Option::<f64>::None,
 true,
 21.0_f64,
 11.0_f64,
 4.0_f64,
 "strict",
 Option::<String>::None,
 Option::<String>::None,
 "auto",
 "single",
 Option::<String>::None,
 Option::<String>::None,
 "minute",
 ],
 )
 .expect("insert malformed config");
 checkpoint(&conn).expect("checkpoint");

 let resolved = resolve_endpoint_config(
 &conn,
 "/api/derived",
 &["retailer".to_string()],
 &["value".to_string()],
 10.0,
 None,
 &json!({}),
 )
 .expect("resolve malformed config");
 let resolved_json: Value = serde_json::from_str(&resolved).expect("parse resolved");

 assert_eq!(resolved_json["dimension_fields"], json!(["retailer"]));
 assert_eq!(resolved_json["kpi_fields"], json!(["value"]));
 assert_eq!(resolved_json["active_tolerance"], "strict");
 assert_eq!(resolved_json["tolerance_pct"], 4.0);
 assert_eq!(resolved_json["confirmed"], true);

 let _ = fs::remove_file(db_path);
}

#[test]
fn save_references_and_wrappers_cover_success_and_errors() {
 let db_path = temp_db_path("wrappers");
 py_init_db(&db_path).expect("py init db");

 let status = py_get_status(&db_path).expect("py status");
 let merged = py_merge_status_with_registry(
 &status,
 &json!([{
 "endpoint_path": "/api/demo",
 "http_method": "GET",
 "dimension_fields": [],
 "kpi_fields": [],
 "fields": []
 }])
 .to_string(),
 10.0,
 )
 .expect("py merge");
 let merged_json: Value = serde_json::from_str(&merged).expect("parse merged");
 assert_eq!(merged_json["summary"]["total_endpoints"], 1);

 let process_result = py_process_observation(
 "/api/demo",
 "GET",
 &json!({"path": {}, "query": {}, "body": {}, "headers": {}}).to_string(),
 &json!({"value": "12.5"}).to_string(),
 &json!({"dimension_fields": [], "kpi_fields": ["value"], "tolerance_pct": 10.0, "confirmed": false}).to_string(),
 &db_path,
 )
 .expect("py process");
 let process_json: Value = serde_json::from_str(&process_result).expect("parse process");
 assert_eq!(process_json["status"], "learning");

 let detail = py_get_endpoint_detail(&db_path, "/api/demo", None, None).expect("py detail");
 let detail_json: Value = serde_json::from_str(&detail).expect("parse detail");
 assert_eq!(detail_json["endpoint"]["endpoint_path"], "/api/demo");

 let save_config = py_save_endpoint_config(
 &db_path,
 "/api/demo",
 "GET",
 &json!([]).to_string(),
 &json!(["value"]).to_string(),
 &json!({"confirmed": true}).to_string(),
 )
 .expect("py save config");
 assert_eq!(
 serde_json::from_str::<Value>(&save_config).expect("parse save")["ok"],
 true
 );

 let save_refs = py_save_references(
 &db_path,
 "/api/demo",
 &json!({"references": [{
 "grain_key": "/api/demo",
 "kpi_field": "value",
 "expected_value": 12.5
 }]})
 .to_string(),
 "ui",
 )
 .expect("py save refs");
 assert_eq!(
 serde_json::from_str::<Value>(&save_refs).expect("parse refs")["count"],
 1
 );

 let import_refs = py_import_reference_rows(
 &db_path,
 "/api/demo",
 &json!([]).to_string(),
 &json!(["value"]).to_string(),
 &json!([{
 "dimensions": {},
 "expected": {"value": 13.0},
 "tolerance_pct": 5.0
 }])
 .to_string(),
 "csv",
 )
 .expect("py import refs");
 assert_eq!(
 serde_json::from_str::<Value>(&import_refs).expect("parse import")["imported"],
 1
 );

 let active = py_get_active_anomalies(&db_path).expect("py active anomalies");
 assert_eq!(
 serde_json::from_str::<Value>(&active).expect("parse active")["anomalies"],
 json!([])
 );

 let resolved = py_resolve_anomaly(&db_path, 999).expect("py resolve anomaly");
 assert_eq!(
 serde_json::from_str::<Value>(&resolved).expect("parse resolved")["ok"],
 true
 );

 let resolved_config = py_resolve_endpoint_config(
 &db_path,
 "/api/demo",
 &json!([]).to_string(),
 &json!(["value"]).to_string(),
 10.0,
 None,
 "{}",
 )
 .expect("py resolve config");
 assert_eq!(
 serde_json::from_str::<Value>(&resolved_config).expect("parse config")["confirmed"],
 true
 );

 let conn = Connection::open(&db_path).expect("open db");
 let bad_save = save_references(
 &conn,
 "/api/demo",
 &json!({"references": [{"kpi_field": "value"}]}),
 "ui",
 );
 assert!(bad_save.is_err());
 checkpoint(&conn).expect("checkpoint");
 let _ = fs::remove_file(db_path);
}

#[test]
fn process_observation_covers_ignored_healthy_statistical_and_error_paths() {
 let db_path = temp_db_path("engine-extra");
 init_db(&db_path).expect("db init");

 let ignored = process_observation(
 "/api/empty",
 "GET",
 &json!({"path": {}, "query": {}, "body": {}, "headers": {}}).to_string(),
 &json!({"value": "not-a-number"}).to_string(),
 &json!({"dimension_fields": [], "kpi_fields": ["value"], "tolerance_pct": 10.0, "confirmed": false}).to_string(),
 &db_path,
 )
 .expect("ignored observation");
 let ignored_json: Value = serde_json::from_str(&ignored).expect("parse ignored");
 assert_eq!(ignored_json["status"], "ignored");

 for value in [
 100.0, 102.0, 101.0, 99.0, 100.0, 98.0, 103.0, 97.0, 101.0, 100.0,
 ] {
 let _ = process_observation(
 "/api/stats",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": value}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("seed stats");
 }
 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 next_id(&conn, "jin_reference").expect("next id"),
 "/api/stats",
 "/api/stats|period=YTD|retailer=amazon",
 "value",
 100.0_f64,
 10.0_f64,
 "test"
 ],
 )
 .expect("insert reference");
 checkpoint(&conn).expect("checkpoint");
 drop(conn);

 let healthy = process_observation(
 "/api/stats",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 100.5}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("healthy observation");
 let healthy_json: Value = serde_json::from_str(&healthy).expect("parse healthy");
 assert_eq!(healthy_json["status"], "healthy");

 let statistical = process_observation(
 "/api/stats",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 250.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("statistical observation");
 let statistical_json: Value = serde_json::from_str(&statistical).expect("parse statistical");
 assert_eq!(statistical_json["status"], "anomaly");
 assert!(statistical_json["anomalies"]
 .as_array()
 .expect("anomaly array")
 .iter()
 .any(|item| item["method"] == "reconciliation"));

 let invalid_request = process_observation(
 "/api/bad",
 "GET",
 "{bad json",
 "{}",
 &base_config(),
 &db_path,
 );
 assert!(invalid_request.is_err());

 let invalid_response = process_observation(
 "/api/bad",
 "GET",
 &base_request(),
 "{bad json",
 &base_config(),
 &db_path,
 );
 assert!(invalid_response.is_err());

 let invalid_config = process_observation(
 "/api/bad",
 "GET",
 &base_request(),
 "{}",
 "{bad json",
 &db_path,
 );
 assert!(invalid_config.is_err());

 let _ = fs::remove_file(db_path);
}

#[test]
fn process_observation_handles_zero_baselines() {
 let db_path = temp_db_path("zero-baseline");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 next_id(&conn, "jin_reference").expect("next id"),
 "/api/zero",
 "/api/zero|period=YTD|retailer=amazon",
 "value",
 0.0_f64,
 5.0_f64,
 "test"
 ],
 )
 .expect("insert reference");
 checkpoint(&conn).expect("checkpoint");

 let baseline = process_observation(
 "/api/zero",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 0.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("baseline");
 let baseline_json: Value = serde_json::from_str(&baseline).expect("parse baseline");
 assert_eq!(baseline_json["status"], "healthy");

 let anomaly = process_observation(
 "/api/zero",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 5.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("anomaly");
 let anomaly_json: Value = serde_json::from_str(&anomaly).expect("parse anomaly");
 assert_eq!(anomaly_json["anomalies"][0]["pct_change"], 100.0);

 drop(conn);

 let _ = fs::remove_file(db_path);
}

#[test]
fn small_near_zero_noise_does_not_raise_native_anomalies() {
 let db_path = temp_db_path("near-zero-noise");
 init_db(&db_path).expect("db init");

 let config = json!({
 "dimension_fields": ["retailer", "period"],
 "kpi_fields": ["value"],
 "tolerance_pct": 10.0,
 "confirmed": true
 })
 .to_string();
 for value in [0.0, 0.1, -0.1, 0.15, -0.05, 0.2, 0.1, 0.0, 0.12, -0.08] {
 let result = process_observation(
 "/api/noise",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": value}).to_string(),
 &config,
 &db_path,
 )
 .expect("noise observation");
 let result_json: Value = serde_json::from_str(&result).expect("parse result");
 assert_ne!(result_json["status"], "anomaly");
 }

 let active_json: Value = serde_json::from_str(&get_active_anomalies(&db_path).expect("active"))
 .expect("parse active");
 assert_eq!(active_json["anomalies"], json!([]));

 let _ = fs::remove_file(db_path);
}

#[test]
fn reference_anomalies_take_precedence_and_resolve_lower_priority_signals() {
 let db_path = temp_db_path("precedence");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 next_id(&conn, "jin_reference").expect("next id"),
 "/api/precedence",
 "/api/precedence|period=YTD|retailer=amazon",
 "value",
 100.0_f64,
 5.0_f64,
 "test"
 ],
 )
 .expect("insert reference");
 checkpoint(&conn).expect("checkpoint");

 let _ = process_observation(
 "/api/precedence",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 100.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("baseline");
 let result = process_observation(
 "/api/precedence",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 150.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("precedence result");

 let result_json: Value = serde_json::from_str(&result).expect("parse result");
 let anomalies = get_active_anomalies(&db_path).expect("active anomalies");
 let anomalies_json: Value = serde_json::from_str(&anomalies).expect("parse anomalies");
 let fresh_conn = Connection::open(&db_path).expect("re-open db");
 let explanation: String = fresh_conn
 .query_row(
 "SELECT ai_explanation FROM jin_anomalies WHERE endpoint_path = ? LIMIT 1",
 params!["/api/precedence"],
 |row| row.get(0),
 )
 .expect("load explanation");

 assert_eq!(
 result_json["anomalies"].as_array().map(|items| items.len()),
 Some(1)
 );
 assert_eq!(result_json["anomalies"][0]["method"], "reconciliation");
 assert_eq!(
 anomalies_json["anomalies"]
 .as_array()
 .map(|items| items.len()),
 Some(1)
 );
 assert_eq!(
 anomalies_json["anomalies"][0]["detection_method"],
 "reconciliation"
 );
 assert!(explanation.contains("Reconciliation mismatch"));

 let _ = fs::remove_file(db_path);
}

#[test]
fn live_processing_does_not_downgrade_higher_priority_config_sources() {
 let db_path = temp_db_path("source-priority");
 init_db(&db_path).expect("db init");

 let _ = save_endpoint_config_json(
 &db_path,
 "/api/source-priority",
 "GET",
 &json!(["retailer", "period"]).to_string(),
 &json!(["value"]).to_string(),
 &json!({
 "dimension_fields": ["retailer", "period"],
 "kpi_fields": ["value"],
 "tolerance_pct": 10.0,
 "confirmed": true
 })
 .to_string(),
 )
 .expect("save ui config");
 let _ = process_observation(
 "/api/source-priority",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 100.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("process observation");

 let detail_json: Value = serde_json::from_str(
 &get_endpoint_detail(&db_path, "/api/source-priority").expect("detail"),
 )
 .expect("parse detail");
 assert_eq!(detail_json["endpoint"]["config_source"], "ui");

 let _ = import_reference_rows_json(
 &db_path,
 "/api/source-priority",
 &json!(["retailer", "period"]).to_string(),
 &json!(["value"]).to_string(),
 &json!([{
 "dimensions": {"retailer": "amazon", "period": "YTD"},
 "expected": {"value": 120.0},
 "tolerance_pct": 8.0
 }])
 .to_string(),
 "csv",
 )
 .expect("upload references");
 let _ = save_endpoint_config_json(
 &db_path,
 "/api/source-priority",
 "GET",
 &json!(["retailer", "period"]).to_string(),
 &json!(["value"]).to_string(),
 &json!({
 "dimension_fields": ["retailer", "period"],
 "kpi_fields": ["value"],
 "tolerance_pct": 12.0,
 "confirmed": true
 })
 .to_string(),
 )
 .expect("resave ui config");

 let upload_detail_json: Value = serde_json::from_str(
 &get_endpoint_detail(&db_path, "/api/source-priority").expect("detail"),
 )
 .expect("parse detail");
 assert_eq!(upload_detail_json["endpoint"]["config_source"], "upload");

 let _ = fs::remove_file(db_path);
}

#[test]
fn storage_payloads_cover_empty_and_error_cases() {
 let db_path = temp_db_path("storage-extra");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");

 let detail = get_endpoint_detail(&db_path, "/missing").expect("empty detail");
 let detail_json: Value = serde_json::from_str(&detail).expect("parse detail");
 assert_eq!(detail_json["endpoint"], Value::Null);
 assert_eq!(detail_json["references"], json!([]));

 let empty_anomalies = get_active_anomalies(&db_path).expect("empty anomalies");
 assert_eq!(
 serde_json::from_str::<Value>(&empty_anomalies).expect("parse anomalies")["anomalies"],
 json!([])
 );

 let bad_merge = merge_status_with_registry_json("{}", "[{\"http_method\":\"GET\"}]", 10.0);
 assert!(bad_merge.is_err());

 let bad_import = save_references(
 &conn,
 "/api/demo",
 &json!({"references": [{"grain_key": "/api/demo", "kpi_field": "value", "expected_value": "bad"}]}),
 "ui",
 );
 assert!(bad_import.is_err());

 let bad_reference_grain = save_references(
 &conn,
 "/api/demo",
 &json!({"references": [{"grain_key": "/wrong", "kpi_field": "value", "expected_value": 12.0}]}),
 "ui",
 );
 assert!(bad_reference_grain.is_err());

 let empty_reference_kpi = save_references(
 &conn,
 "/api/demo",
 &json!({"references": [{"grain_key": "/api/demo", "kpi_field": " ", "expected_value": 12.0}]}),
 "ui",
 );
 assert!(empty_reference_kpi.is_err());

 let bad_config_endpoint = resolve_endpoint_config(
 &conn,
 "api/demo",
 &[],
 &["value".to_string()],
 10.0,
 None,
 &json!({}),
 );
 assert!(bad_config_endpoint.is_err());

 let bad_saved_config = save_endpoint_config_json(
 &db_path,
 "/api/demo",
 "GET",
 &json!([]).to_string(),
 &json!(["value"]).to_string(),
 &json!({
 "dimension_fields": ["region", "region"],
 "kpi_fields": ["value", "value"],
 "active_tolerance": "wild",
 "tolerance_pct": 12.0
 })
 .to_string(),
 )
 .expect("save config");
 let bad_saved_config_json: Value =
 serde_json::from_str(&bad_saved_config).expect("parse config");
 assert_eq!(bad_saved_config_json["dimension_fields"], json!(["region"]));
 assert_eq!(bad_saved_config_json["kpi_fields"], json!(["value"]));
 assert_eq!(bad_saved_config_json["active_tolerance"], "normal");

 let empty_field_name = save_endpoint_config(
 &conn,
 "/api/demo",
 "GET",
 &[],
 &["value".to_string()],
 &json!({
 "dimension_fields": [""],
 "kpi_fields": ["value"]
 }),
 );
 assert!(empty_field_name.is_err());

 let negative_tolerance = save_endpoint_config(
 &conn,
 "/api/demo",
 "GET",
 &[],
 &["value".to_string()],
 &json!({
 "dimension_fields": [],
 "kpi_fields": ["value"],
 "tolerance_pct": -1.0
 }),
 );
 assert!(negative_tolerance.is_err());

 let bad_row_import = crate::core::storage::import_reference_rows(
 &conn,
 "/api/demo",
 &["region".to_string()],
 &["value".to_string()],
 &[json!({
 "dimensions": {},
 "expected": {"other": 10.0},
 "tolerance_pct": -1.0
 })],
 "csv",
 );
 assert!(bad_row_import.is_err());

 let bad_endpoint_references =
 save_references(&conn, "bad-endpoint", &json!({"references": []}), "ui");
 assert!(bad_endpoint_references.is_err());

 let malformed_registry_merge = merge_status_with_registry_json(
 &json!({"summary": {}, "endpoints": [{"endpoint_path": "/api/demo", "http_method": "GET"}]}).to_string(),
 &json!([
 {
 "endpoint_path": "/api/demo",
 "http_method": "GET",
 "dimension_fields": "bad",
 "kpi_fields": ["value"]
 }
 ])
 .to_string(),
 10.0,
 )
 .expect("malformed registry merge still serializes");
 let malformed_registry_json: Value =
 serde_json::from_str(&malformed_registry_merge).expect("parse merge");
 assert_eq!(
 malformed_registry_json["endpoints"][0]["dimension_fields"],
 "bad"
 );

 let _ = fs::remove_file(db_path);
}

#[test]
fn detail_and_active_payloads_include_ai_explanation() {
 let db_path = temp_db_path("payload-explanation");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 next_id(&conn, "jin_reference").expect("next id"),
 "/api/explain",
 "/api/explain|period=YTD|retailer=amazon",
 "value",
 100.0_f64,
 5.0_f64,
 "test"
 ],
 )
 .expect("insert reference");
 checkpoint(&conn).expect("checkpoint");
 drop(conn);

 let _ = process_observation(
 "/api/explain",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 100.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("baseline");
 let _ = process_observation(
 "/api/explain",
 "GET",
 &base_request(),
 &json!({"retailer": "amazon", "period": "YTD", "value": 150.0}).to_string(),
 &base_config(),
 &db_path,
 )
 .expect("anomaly");

 let detail_json: Value =
 serde_json::from_str(&get_endpoint_detail(&db_path, "/api/explain").expect("detail"))
 .expect("parse detail");
 let active_json: Value = serde_json::from_str(&get_active_anomalies(&db_path).expect("active"))
 .expect("parse active");

 assert!(detail_json["anomalies"][0]["ai_explanation"]
 .as_str()
 .expect("detail explanation")
 .contains("Reconciliation mismatch"));
 assert_eq!(detail_json["anomalies"][0]["severity"], "high");
 assert!(active_json["anomalies"][0]["ai_explanation"]
 .as_str()
 .expect("active explanation")
 .contains("Reconciliation mismatch"));
 assert_eq!(active_json["anomalies"][0]["confidence"], 0.95);

 let _ = fs::remove_file(db_path);
}

#[test]
fn import_reference_rows_covers_upload_success_and_validation_edges() {
 let db_path = temp_db_path("import-edges");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");

 let imported = crate::core::storage::import_reference_rows(
 &conn,
 "/api/upload",
 &["retailer".to_string(), "period".to_string()],
 &["value".to_string()],
 &[json!({
 "dimensions": {"retailer": "amazon", "period": "YTD"},
 "expected": {"value": 120.0},
 "tolerance_pct": 8.0
 })],
 "csv",
 )
 .expect("import rows");
 checkpoint(&conn).expect("checkpoint");
 let imported_json: Value = serde_json::from_str(&imported).expect("parse import");
 let detail_json: Value = serde_json::from_str(
 &endpoint_detail_payload_with_limits(&conn, "/api/upload", None, None).expect("detail"),
 )
 .expect("parse detail");

 assert_eq!(imported_json["imported"], 1);
 assert_eq!(detail_json["endpoint"]["config_source"], "upload");
 assert_eq!(detail_json["references"][0]["tolerance_pct"], 8.0);

 let no_kpis = crate::core::storage::import_reference_rows(
 &conn,
 "/api/upload",
 &["retailer".to_string()],
 &[],
 &[],
 "csv",
 );
 assert!(no_kpis.is_err());

 let missing_dimension = crate::core::storage::import_reference_rows(
 &conn,
 "/api/upload",
 &["retailer".to_string()],
 &["value".to_string()],
 &[json!({
 "dimensions": {},
 "expected": {"value": 120.0}
 })],
 "csv",
 );
 assert!(missing_dimension.is_err());

 let unknown_kpi = crate::core::storage::import_reference_rows(
 &conn,
 "/api/upload",
 &["retailer".to_string()],
 &["value".to_string()],
 &[json!({
 "dimensions": {"retailer": "amazon"},
 "expected": {"other": 120.0}
 })],
 "csv",
 );
 assert!(unknown_kpi.is_err());

 let _ = fs::remove_file(db_path);
}

#[test]
fn resolve_endpoint_config_prefers_watch_threshold_and_normalizes_overrides() {
 let db_path = temp_db_path("resolve-edges");
 init_db(&db_path).expect("db init");
 let conn = Connection::open(&db_path).expect("open db");
 init_schema(&conn).expect("schema");
 conn.execute(
 "
 INSERT INTO jin_config (
 endpoint_path, dimension_overrides, kpi_overrides,
 tolerance_relaxed, tolerance_normal, tolerance_strict, active_tolerance,
 tolerance_pct, confirmed, rows_path, time_end_field, time_profile,
 time_extraction_rule, time_format, time_field, time_granularity
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 ",
 params![
 "/api/resolve-edges",
 json!(["retailer"]).to_string(),
 json!(["value"]).to_string(),
 25.0_f64,
 11.0_f64,
 4.0_f64,
 "strict",
 4.0_f64,
 false,
 Option::<String>::None,
 Option::<String>::None,
 "auto",
 "single",
 Option::<String>::None,
 Option::<String>::None,
 "minute",
 ],
 )
 .expect("insert config");

 let resolved = resolve_endpoint_config(
 &conn,
 "/api/resolve-edges",
 &["fallback".to_string()],
 &["fallback_value".to_string()],
 10.0,
 Some(19.0),
 &json!({
 "dimension_fields": ["retailer", "retailer"],
 "kpi_fields": ["value", "value"],
 "active_tolerance": "wild",
 "confirmed": true
 }),
 )
 .expect("resolve config");
 let resolved_json: Value = serde_json::from_str(&resolved).expect("parse resolved");

 assert_eq!(
 resolved_json["dimension_fields"],
 json!(["retailer", "retailer"])
 );
 assert_eq!(resolved_json["kpi_fields"], json!(["value", "value"]));
 assert_eq!(resolved_json["tolerance_pct"], 19.0);
 assert_eq!(resolved_json["active_tolerance"], "normal");
 assert_eq!(resolved_json["confirmed"], true);

 let _ = fs::remove_file(db_path);
}

#[test]
fn pyo3_module_registration_succeeds() {
 pyo3::prepare_freethreaded_python();
 Python::with_gil(|py| {
 let module = PyModule::new_bound(py, "jin_core").expect("module");
 crate::jin_core(py, &module).expect("init module");
 assert!(module.getattr("init_db").is_ok());
 assert!(module.getattr("process_observation").is_ok());
 assert!(module.getattr("get_status").is_ok());
 assert!(module.getattr("merge_status_with_registry").is_ok());
 assert!(module.getattr("resolve_anomaly").is_ok());
 });
}
