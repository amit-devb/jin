use crate::core::grain::canonical_grain_key;
#[cfg(test)]
use crate::core::json::numeric_value;
use crate::core::types::AnomalyResult;
use duckdb::{params, Connection, OptionalExt};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};

const TECHNICAL_METADATA_FIELDS: &[&str] = &["api_version", "label", "timestamp", "_jin_id"];
const DEFAULT_ENDPOINT_HISTORY_LIMIT: usize = 1000;
const DEFAULT_ENDPOINT_REFERENCE_LIMIT: usize = 1000;

fn field_leaf(field: &str) -> &str {
 field
 .trim()
 .trim_end_matches("[]")
 .split('.')
 .next_back()
 .unwrap_or(field)
}

fn is_technical_metadata_field(field: &str) -> bool {
 let leaf = field_leaf(field);
 TECHNICAL_METADATA_FIELDS
 .iter()
 .any(|candidate| candidate == &leaf)
}

fn technical_default_value(field: &str) -> String {
 match field_leaf(field) {
 "api_version" => "latest".to_string(),
 "label" => "current".to_string(),
 "timestamp" => "latest".to_string(),
 "_jin_id" => "generated".to_string(),
 _ => String::new(),
 }
}

fn as_string(value: Option<&Value>) -> String {
 match value {
 Some(Value::String(text)) => text.clone(),
 Some(Value::Null) | None => String::new(),
 Some(other) => other.to_string().trim_matches('"').to_string(),
 }
}

fn config_source_priority(source: &str) -> i32 {
 match source {
 "upload" => 4,
 "ui" => 3,
 "confirmed" => 2,
 "auto" => 1,
 _ => 0,
 }
}

fn merge_config_source(existing: Option<&str>, incoming: &str) -> String {
 match existing {
 Some(current) if config_source_priority(current) > config_source_priority(incoming) => {
 current.to_string()
 }
 _ => incoming.to_string(),
 }
}

fn validate_endpoint_path(endpoint_path: &str) -> Result<(), String> {
 if endpoint_path.trim().is_empty() || !endpoint_path.starts_with('/') {
 return Err("endpoint_path must start with '/'".to_string());
 }
 Ok(())
}

fn sanitize_field_list(fields: &[String], field_type: &str) -> Result<Vec<String>, String> {
 let mut seen = BTreeSet::new();
 let mut sanitized = Vec::new();
 for field in fields {
 let trimmed = field.trim();
 if trimmed.is_empty() {
 return Err(format!("{field_type} field names must be non-empty"));
 }
 if seen.insert(trimmed.to_string()) {
 sanitized.push(trimmed.to_string());
 }
 }
 Ok(sanitized)
}

pub fn validate_reference_upload_rows(
 rows: &[Value],
 field_names: &[String],
 expected_fields: Option<&[String]>,
) -> Result<String, String> {
 if rows.is_empty() {
 return Err("Empty file".to_string());
 }
  let first = rows
  .first()
  .and_then(Value::as_object)
  .ok_or_else(|| "upload rows must be objects".to_string())?;

  let is_internal = first.contains_key("endpoint")
  && first.contains_key("dimension_fields")
  && first.contains_key("kpi_fields");

  if is_internal {
  let required = [
    "endpoint",
    "dimension_fields",
    "kpi_fields",
    "tolerance_pct",
  ];
  let missing: Vec<&str> = required
    .iter()
    .copied()
    .filter(|column| !first.contains_key(*column))
    .collect();
  if !missing.is_empty() {
    return Err(format!("Missing required columns: {}", missing.join(", ")));
  }
  }

  let raw_dimensions: Vec<String> = if is_internal {
  first
    .get("dimension_fields")
    .and_then(Value::as_str)
    .unwrap_or_default()
    .split(',')
    .map(str::trim)
    .filter(|item| !item.is_empty())
    .map(ToOwned::to_owned)
    .collect()
  } else {
  Vec::new()
  };

  let raw_kpis: Vec<String> = if is_internal {
  first
    .get("kpi_fields")
    .and_then(Value::as_str)
    .unwrap_or_default()
    .split(',')
    .map(str::trim)
    .filter(|item| !item.is_empty())
    .map(ToOwned::to_owned)
    .collect()
  } else {
  Vec::new()
  };

  if is_internal {
  for field in raw_dimensions.iter().chain(raw_kpis.iter()) {
    if !field_names.iter().any(|item| item == field) {
    return Err(format!("Unknown field in upload: {field}"));
    }
  }
  }

 if let Some(expected) = expected_fields {
 let row_columns: Vec<String> = first.keys().cloned().collect();
 if row_columns != expected {
 let missing: Vec<String> = expected
 .iter()
 .filter(|column| !first.contains_key(column.as_str()))
 .cloned()
 .collect();
 let extra: Vec<String> = first
 .keys()
 .filter(|column| {
 !expected
 .iter()
 .any(|expected_column| expected_column == *column)
 })
 .cloned()
 .collect();
 let mut parts = Vec::new();
 if !missing.is_empty() {
 parts.push(format!("missing {}", missing.join(", ")));
 }
 if !extra.is_empty() {
 parts.push(format!("unexpected {}", extra.join(", ")));
 }
 let detail = if parts.is_empty() {
 "column order mismatch".to_string()
 } else {
 parts.join("; ")
 };
 return Err(format!("Upload columns do not match template: {detail}"));
 }
 }

 let mut warnings = Vec::new();
 let mut normalized = Vec::new();
 let mut promoted_dimensions = Vec::new();
 let mut promoted_dimension_set = BTreeSet::new();
 let raw_dimension_set: BTreeSet<String> = raw_dimensions.iter().cloned().collect();

 for (offset, row) in rows.iter().enumerate() {
 let index = offset + 2;
 let row_obj = row
 .as_object()
 .ok_or_else(|| format!("row {index} must be an object"))?;
 let tolerance_value = match row_obj.get("tolerance_pct") {
 Some(Value::Number(number)) => number.as_f64().unwrap_or(10.0),
 Some(Value::String(text)) => text
 .parse::<f64>()
 .map_err(|_| format!("Invalid tolerance at row {index}"))?,
 Some(Value::Null) | None => 10.0,
 _ => return Err(format!("Invalid tolerance at row {index}")),
 };
 let tolerance_value = if (1.0..=100.0).contains(&tolerance_value) {
 tolerance_value
 } else {
 warnings.push(format!(
 "Row {index}: tolerance_pct {tolerance_value} out of range, defaulted to 10"
 ));
 10.0
 };

 let endpoint_value = row_obj
 .get("endpoint")
 .and_then(Value::as_str)
 .unwrap_or_default()
 .to_string();
 let mut dimensions = serde_json::Map::new();
 let mut expected = serde_json::Map::new();

 for field in &raw_dimensions {
 let column = format!("grain_{field}");
 if !row_obj.contains_key(&column) && !is_technical_metadata_field(field) {
 return Err(format!("Missing required columns: {column}"));
 }
 let value = if row_obj.contains_key(&column) {
 as_string(row_obj.get(&column))
 } else {
 technical_default_value(field)
 };
 dimensions.insert(field.clone(), json!(value));
 }

 for field in &raw_kpis {
 let column = format!("expected_{field}");
 if !row_obj.contains_key(&column) {
 return Err(format!("Missing required columns: {column}"));
 }
 match row_obj.get(&column) {
 Some(Value::Null) | None => {}
 Some(Value::String(text)) if text.is_empty() => {}
 Some(Value::Number(number)) => {
 let parsed = number.as_f64().ok_or_else(|| {
 format!("Expected value must be numeric at row {index} column {column}")
 })?;
 expected.insert(field.clone(), json!(parsed));
 }
 Some(Value::String(text)) => {
 if let Ok(parsed) = text.parse::<f64>() {
 expected.insert(field.clone(), json!(parsed));
 continue;
 }
 if raw_dimension_set.contains(field) || is_technical_metadata_field(field) {
 if !raw_dimension_set.contains(field)
 && promoted_dimension_set.insert(field.clone())
 {
 promoted_dimensions.push(field.clone());
 }
 dimensions.insert(field.clone(), json!(text.clone()));
 warnings.push(format!(
 "Row {index}: {column} is text; treated as contextual field and excluded from numeric KPI checks"
 ));
 continue;
 }
 return Err(format!(
 "Expected value must be numeric at row {index} column {column}"
 ));
 }
 _ => {
 return Err(format!(
 "Expected value must be numeric at row {index} column {column}"
 ))
 }
 }
 }
 normalized.push(json!({
 "endpoint": endpoint_value,
 "dimension_fields": raw_dimensions,
 "kpi_fields": raw_kpis,
 "tolerance_pct": tolerance_value,
 "dimensions": dimensions,
 "expected": expected,
 "_row_index": index,
 }));
 }

 let mut final_dimensions = raw_dimensions.clone();
 for field in &promoted_dimensions {
 if !final_dimensions.iter().any(|item| item == field) {
 final_dimensions.push(field.clone());
 }
 }
 let final_kpis: Vec<String> = raw_kpis
 .iter()
 .filter(|field| !promoted_dimension_set.contains(*field))
 .cloned()
 .collect();

 let mut seen_combinations: std::collections::BTreeMap<String, usize> =
 std::collections::BTreeMap::new();
 for (position, entry) in normalized.iter_mut().enumerate() {
 let row_index = entry
 .get("_row_index")
 .and_then(Value::as_i64)
 .unwrap_or((position + 2) as i64) as usize;
 let endpoint_value = entry
 .get("endpoint")
 .and_then(Value::as_str)
 .unwrap_or_default()
 .to_string();
 let dimensions = entry
 .get_mut("dimensions")
 .and_then(Value::as_object_mut)
 .ok_or_else(|| format!("row {row_index} dimensions must be an object"))?;

 for field in &final_dimensions {
 let value = dimensions
 .get(field)
 .and_then(Value::as_str)
 .unwrap_or_default()
 .to_string();
 if !value.is_empty() {
 continue;
 }
 if is_technical_metadata_field(field) {
 dimensions.insert(field.clone(), json!(technical_default_value(field)));
 } else {
 dimensions.insert(field.clone(), json!(String::new()));
 }
 }

 let combination_key = format!(
 "{}|{}",
 endpoint_value,
 final_dimensions
 .iter()
 .map(|field| format!(
 "{}={}",
 field,
 dimensions
 .get(field)
 .and_then(Value::as_str)
 .unwrap_or_default()
 ))
 .collect::<Vec<_>>()
 .join("|")
 );
 if seen_combinations.contains_key(&combination_key) {
 warnings.push(format!(
 "Row {row_index}: duplicate grain combination for endpoint {endpoint_value}; last row wins"
 ));
 }
 seen_combinations.insert(combination_key, position);
 entry["dimension_fields"] = json!(final_dimensions.clone());
 entry["kpi_fields"] = json!(final_kpis.clone());
 }

 let deduped: Vec<Value> = seen_combinations
 .values()
 .copied()
 .map(|idx| {
 let mut item = normalized[idx].clone();
 if let Some(obj) = item.as_object_mut() {
 obj.remove("_row_index");
 }
 item
 })
 .collect();

 serde_json::to_string(&json!({
 "dimension_fields": final_dimensions,
 "kpi_fields": final_kpis,
 "normalized": deduped,
 "warnings": warnings,
 }))
 .map_err(|err| err.to_string())
}

fn validate_tolerance(value: f64, label: &str) -> Result<f64, String> {
 if !value.is_finite() || value < 0.0 {
 return Err(format!("{label} must be a non-negative finite number"));
 }
 Ok(value)
}

fn normalize_active_tolerance(value: &str) -> String {
 match value {
 "relaxed" | "strict" | "normal" => value.to_string(),
 _ => "normal".to_string(),
 }
}

fn anomaly_explanation(anomaly: &AnomalyResult) -> String {
 format!(
 "Reconciliation mismatch for {}: actual {:.4} vs expected {:.4} ({:.2}% difference, {} severity).",
 anomaly.kpi_field,
 anomaly.actual,
 anomaly.expected,
 anomaly.pct_change,
 anomaly.severity
 )
}

fn baseline_label(method: &str) -> &'static str {
 match method {
 "reconciliation" | "reference" => "Uploaded reference",
 "threshold" => "Previous observation (legacy)",
 "statistical" => "Historical average (legacy)",
 _ => "Reference",
 }
}

fn anomaly_reason(
 method: &str,
 kpi_field: &str,
 actual_value: f64,
 expected_value: f64,
 pct_change: f64,
) -> String {
 if method == "reconciliation" || method == "reference" {
 format!(
 "Reconciliation mismatch on {kpi_field}: API returned {actual_value} while uploaded reference expected {expected_value} ({pct_change:.2}% difference)."
 )
 } else {
 format!(
 "Reconciliation mismatch on {kpi_field}: API returned {actual_value} while expected was {expected_value} ({pct_change:.2}% difference)."
 )
 }
}

fn change_summary(actual_value: f64, expected_value: f64, pct_change: f64) -> String {
 format!(
 "Expected {:.4}, got {:.4} ({:.2}% difference).",
 expected_value, actual_value, pct_change
 )
}

fn incident_status_for(
 is_active: bool,
 incident_status: Option<&str>,
 snoozed_until: Option<&str>,
 suppressed_until: Option<&str>,
) -> String {
 if suppressed_until
 .and_then(|value| {
 if value.trim().is_empty() {
 None
 } else {
 Some(value)
 }
 })
 .is_some()
 {
 return "suppressed".to_string();
 }
 if snoozed_until
 .and_then(|value| {
 if value.trim().is_empty() {
 None
 } else {
 Some(value)
 }
 })
 .is_some()
 {
 return "snoozed".to_string();
 }
 if !is_active {
 return "resolved".to_string();
 }
 match incident_status {
 Some("active" | "resolved") | None => "active".to_string(),
 Some(other) => other.to_string(),
 }
}

fn anomaly_severity_label(pct_change: f64) -> &'static str {
 let magnitude = pct_change.abs();
 if magnitude >= 75.0 {
 "critical"
 } else if magnitude >= 30.0 {
 "high"
 } else if magnitude >= 15.0 {
 "medium"
 } else {
 "low"
 }
}

fn anomaly_confidence_value(method: &str) -> f64 {
 match method {
 "reconciliation" | "reference" => 0.95,
 "statistical" => 0.88,
 "threshold" => 0.75,
 _ => 0.5,
 }
}

fn parse_json_or_default(raw: &str, default: Value) -> Value {
 serde_json::from_str(raw).unwrap_or(default)
}

fn trend_summary(history: &[Value], kpi_fields: &[String]) -> Value {
 let mut rows = Vec::new();
 for kpi_field in kpi_fields {
 let mut series = Vec::new();
 for row in history {
 if let Some(value) = row
 .get("kpi_json")
 .and_then(Value::as_object)
 .and_then(|payload| payload.get(kpi_field))
 .and_then(Value::as_f64)
 {
 series.push(value);
 }
 }
 if series.is_empty() {
 continue;
 }
 let latest = series[0];
 let earliest = *series.last().unwrap_or(&latest);
 let delta_pct = if earliest == 0.0 {
 0.0
 } else {
 (((latest - earliest) / earliest) * 100.0 * 100.0).round() / 100.0
 };
 rows.push(json!({
 "kpi_field": kpi_field,
 "latest": latest,
 "min": series.iter().fold(f64::INFINITY, |left, right| left.min(*right)),
 "max": series.iter().fold(f64::NEG_INFINITY, |left, right| left.max(*right)),
 "samples": series.len(),
 "delta_pct": delta_pct,
 }));
 }
 Value::Array(rows)
}

fn tolerance_from_mode(relaxed: f64, normal: f64, strict: f64, active: &str, fallback: f64) -> f64 {
 match active {
 "relaxed" => relaxed,
 "strict" => strict,
 "normal" => normal,
 _ => fallback,
 }
}

fn tolerance_bundle_from_payload(payload: &Value, fallback: f64) -> (f64, f64, f64, String, f64) {
 let relaxed = payload
 .get("tolerance_relaxed")
 .and_then(Value::as_f64)
 .unwrap_or(20.0);
 let normal = payload
 .get("tolerance_normal")
 .and_then(Value::as_f64)
 .unwrap_or(
 payload
 .get("tolerance_pct")
 .and_then(Value::as_f64)
 .unwrap_or(fallback),
 );
 let strict = payload
 .get("tolerance_strict")
 .and_then(Value::as_f64)
 .unwrap_or(5.0);
 let active = payload
 .get("active_tolerance")
 .and_then(Value::as_str)
 .unwrap_or("normal")
 .to_string();
 let effective = tolerance_from_mode(relaxed, normal, strict, &active, normal);
 (relaxed, normal, strict, active, effective)
}

fn endpoint_operational_metadata(conn: &Connection, endpoint_path: &str) -> Result<Value, String> {
 let upload_row = conn
 .prepare(
 "
 SELECT CAST(MAX(uploaded_at) AS VARCHAR), COUNT(*)
 FROM jin_reference
 WHERE endpoint_path = ?
 ",
 )
 .map_err(|err| err.to_string())?
 .query_row(params![endpoint_path], |row| {
 Ok((
 row.get::<usize, Option<String>>(0)?,
 row.get::<usize, i64>(1)?,
 ))
 })
 .optional()
 .map_err(|err| err.to_string())?
 .unwrap_or((None, 0));

 let latest_upload_source = conn
 .prepare(
 "
 SELECT upload_source
 FROM jin_reference
 WHERE endpoint_path = ?
 ORDER BY uploaded_at DESC, id DESC
 LIMIT 1
 ",
 )
 .map_err(|err| err.to_string())?
 .query_row(params![endpoint_path], |row| {
 row.get::<usize, Option<String>>(0)
 })
 .optional()
 .map_err(|err| err.to_string())?
 .flatten();

 let config_updated_at = conn
 .prepare(
 "
 SELECT CAST(updated_at AS VARCHAR)
 FROM jin_config
 WHERE endpoint_path = ?
 ",
 )
 .map_err(|err| err.to_string())?
 .query_row(params![endpoint_path], |row| {
 row.get::<usize, Option<String>>(0)
 })
 .optional()
 .map_err(|err| err.to_string())?;

 let observation_row = conn
 .prepare(
 "
 SELECT COUNT(*), CAST(MAX(observed_at) AS VARCHAR)
 FROM jin_observations
 WHERE endpoint_path = ?
 ",
 )
 .map_err(|err| err.to_string())?
 .query_row(params![endpoint_path], |row| {
 Ok((
 row.get::<usize, i64>(0)?,
 row.get::<usize, Option<String>>(1)?,
 ))
 })
 .optional()
 .map_err(|err| err.to_string())?
 .unwrap_or((0, None));

 let latest_incident_at = conn
 .prepare(
 "
 SELECT CAST(MAX(detected_at) AS VARCHAR)
 FROM jin_anomalies
 WHERE endpoint_path = ?
 ",
 )
 .map_err(|err| err.to_string())?
 .query_row(params![endpoint_path], |row| {
 row.get::<usize, Option<String>>(0)
 })
 .optional()
 .map_err(|err| err.to_string())?;

 let mut upload_stmt = conn
 .prepare(
 "
 SELECT grain_key, kpi_field, expected_value, tolerance_pct, upload_source, CAST(uploaded_at AS VARCHAR)
 FROM jin_reference
 WHERE endpoint_path = ?
 ORDER BY uploaded_at DESC, id DESC
 LIMIT 8
 ",
 )
 .map_err(|err| err.to_string())?;
 let upload_rows = upload_stmt
 .query_map(params![endpoint_path], |row| {
 Ok(json!({
 "grain_key": row.get::<usize, Option<String>>(0)?,
 "kpi_field": row.get::<usize, Option<String>>(1)?,
 "expected_value": row.get::<usize, Option<f64>>(2)?,
 "tolerance_pct": row.get::<usize, Option<f64>>(3)?,
 "upload_source": row.get::<usize, Option<String>>(4)?,
 "uploaded_at": row.get::<usize, Option<String>>(5)?,
 }))
 })
 .map_err(|err| err.to_string())?;
 let mut recent_uploads = Vec::new();
 for row in upload_rows {
 recent_uploads.push(row.map_err(|err| err.to_string())?);
 }

 Ok(json!({
 "last_upload_at": upload_row.0,
 "last_upload_source": latest_upload_source,
 "upload_count": upload_row.1,
 "config_updated_at": config_updated_at,
 "observation_count": observation_row.0,
 "last_observed_at": observation_row.1,
 "latest_incident_at": latest_incident_at,
 "recent_uploads": recent_uploads,
 }))
}

pub fn upsert_endpoint_record(
    conn: &Connection,
    endpoint_path: &str,
    http_method: &str,
    dimension_fields_json: &str,
    kpi_fields_json: &str,
    incoming_source: &str,
    pydantic_schema_json: Option<&str>,
) -> Result<(), String> {
    init_schema(conn).map_err(|err| err.to_string())?;
    validate_endpoint_path(endpoint_path)?;
    let existing_row: Option<(String, Option<String>, String)> = conn
        .prepare(
            "SELECT http_method, pydantic_schema, config_source FROM jin_endpoints WHERE endpoint_path = ? LIMIT 1",
        )
        .map_err(|err| err.to_string())?
        .query_row(params![endpoint_path], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .optional()
        .map_err(|err| err.to_string())?;
    let had_existing_row = existing_row.is_some();
    let (stored_http_method, stored_schema, existing_source) = match existing_row {
        Some(row) => row,
        None => (http_method.to_string(), None, incoming_source.to_string()),
    };
    let effective_source = merge_config_source(Some(existing_source.as_str()), incoming_source);
    let schema = pydantic_schema_json.or(stored_schema.as_deref());

    if had_existing_row {
        match schema {
            Some(schema) => conn
                .execute(
                    "
                    UPDATE jin_endpoints
                    SET http_method = ?,
                        pydantic_schema = ?,
                        dimension_fields = ?,
                        kpi_fields = ?,
                        config_source = ?
                    WHERE endpoint_path = ? AND http_method = ?
                    ",
                    params![
                        stored_http_method.as_str(),
                        schema,
                        dimension_fields_json,
                        kpi_fields_json,
                        effective_source,
                        endpoint_path,
                        stored_http_method.as_str(),
                    ],
                )
                .map_err(|err| err.to_string())?,
            None => conn
                .execute(
                    "
                    UPDATE jin_endpoints
                    SET http_method = ?,
                        dimension_fields = ?,
                        kpi_fields = ?,
                        config_source = ?
                    WHERE endpoint_path = ? AND http_method = ?
                    ",
                    params![
                        stored_http_method.as_str(),
                        dimension_fields_json,
                        kpi_fields_json,
                        effective_source,
                        endpoint_path,
                        stored_http_method.as_str(),
                    ],
                )
                .map_err(|err| err.to_string())?,
        };
    } else {
        match schema {
            Some(schema) => conn
                .execute(
                    "
                    INSERT INTO jin_endpoints (
                        endpoint_path, http_method, pydantic_schema, dimension_fields, kpi_fields, config_source, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, now())
                    ",
                    params![
                        endpoint_path,
                        stored_http_method.as_str(),
                        schema,
                        dimension_fields_json,
                        kpi_fields_json,
                        effective_source,
                    ],
                )
                .map_err(|err| err.to_string())?,
            None => conn
                .execute(
                    "
                    INSERT INTO jin_endpoints (
                        endpoint_path, http_method, dimension_fields, kpi_fields, config_source, created_at
                    ) VALUES (?, ?, ?, ?, ?, now())
                    ",
                    params![
                        endpoint_path,
                        stored_http_method.as_str(),
                        dimension_fields_json,
                        kpi_fields_json,
                        effective_source,
                    ],
                )
                .map_err(|err| err.to_string())?,
        };
    }

    Ok(())
}


pub fn init_schema(conn: &Connection) -> Result<(), duckdb::Error> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS jin_endpoints (
          endpoint_path TEXT,
          http_method TEXT,
          pydantic_schema TEXT,
          dimension_fields TEXT,
          kpi_fields TEXT,
          config_source TEXT DEFAULT 'auto',
          created_at TIMESTAMP DEFAULT now(),
          PRIMARY KEY (endpoint_path, http_method)
        );
        CREATE TABLE IF NOT EXISTS jin_observations (
          id BIGINT PRIMARY KEY,
          endpoint_path TEXT,
          grain_key TEXT,
          dimension_json TEXT,
          kpi_json TEXT,
          observed_at TIMESTAMP DEFAULT now(),
          source TEXT
        );
        CREATE TABLE IF NOT EXISTS jin_anomalies (
          id BIGINT PRIMARY KEY,
          endpoint_path TEXT,
          grain_key TEXT,
          kpi_field TEXT,
          expected_value DOUBLE,
          actual_value DOUBLE,
          pct_change DOUBLE,
          detection_method TEXT,
          detected_at TIMESTAMP DEFAULT now(),
          resolved_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          reviewed_at TIMESTAMP,
          note TEXT,
          ai_explanation TEXT,
          impact DOUBLE DEFAULT 0.0
        );
        CREATE TABLE IF NOT EXISTS jin_reference (
          id BIGINT PRIMARY KEY,
          endpoint_path TEXT,
          grain_key TEXT,
          kpi_field TEXT,
          expected_value DOUBLE,
          tolerance_pct DOUBLE DEFAULT 10.0,
          uploaded_at TIMESTAMP DEFAULT now(),
          upload_source TEXT
        );
        CREATE TABLE IF NOT EXISTS jin_config (
          endpoint_path TEXT PRIMARY KEY,
          dimension_overrides TEXT,
          kpi_overrides TEXT,
          tolerance_relaxed DOUBLE DEFAULT 20.0,
          tolerance_normal DOUBLE DEFAULT 10.0,
          tolerance_strict DOUBLE DEFAULT 5.0,
          active_tolerance TEXT DEFAULT 'normal',
          tolerance_pct DOUBLE DEFAULT 10.0,
          confirmed BOOLEAN DEFAULT false,
          rows_path TEXT,
          time_end_field TEXT,
          time_profile TEXT DEFAULT 'auto',
          time_extraction_rule TEXT DEFAULT 'single',
          time_format TEXT,
          time_field TEXT,
          time_granularity TEXT DEFAULT 'minute',
          updated_at TIMESTAMP DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS jin_incident_state (
          anomaly_id BIGINT PRIMARY KEY,
          incident_status TEXT DEFAULT 'active',
          note TEXT,
          owner TEXT,
          resolution_reason TEXT,
          snoozed_until TIMESTAMP,
          suppressed_until TIMESTAMP,
          updated_at TIMESTAMP DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS jin_incident_events (
          id BIGINT PRIMARY KEY,
          anomaly_id BIGINT,
          event_type TEXT,
          note TEXT,
          owner TEXT,
          resolution_reason TEXT,
          payload_json TEXT,
          created_at TIMESTAMP DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS jin_error (
          id BIGINT PRIMARY KEY,
          code TEXT,
          message TEXT,
          hint TEXT,
          detail TEXT,
          level TEXT,
          created_at TIMESTAMP DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS jin_rollups (
          endpoint_path TEXT NOT NULL,
          metric_name TEXT NOT NULL,
          grain_key TEXT NOT NULL,
          time_bucket TIMESTAMP NOT NULL,
          value DOUBLE NOT NULL,
          samples BIGINT DEFAULT 1 NOT NULL,
          PRIMARY KEY (endpoint_path, metric_name, grain_key, time_bucket)
        );
        ",
    )?;

    // Migration: add columns that may not exist in extremely old DB files
    let _ = conn.execute(
        "ALTER TABLE jin_endpoints ADD COLUMN IF NOT EXISTS pydantic_schema TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE jin_anomalies ADD COLUMN IF NOT EXISTS detection_method TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_field TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_granularity TEXT DEFAULT 'minute'",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS rows_path TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_end_field TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_profile TEXT DEFAULT 'auto'",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_extraction_rule TEXT DEFAULT 'single'",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_format TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE jin_incident_state ADD COLUMN IF NOT EXISTS owner TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE jin_incident_events ADD COLUMN IF NOT EXISTS owner TEXT",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX jin_idx_observations_grain_observed_at ON jin_observations(grain_key, observed_at)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX jin_idx_observations_endpoint_observed_at ON jin_observations(endpoint_path, observed_at)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX jin_idx_anomalies_endpoint_active_detected_at ON jin_anomalies(endpoint_path, is_active, detected_at)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX jin_idx_anomalies_grain_kpi_method_active ON jin_anomalies(grain_key, kpi_field, detection_method, is_active)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX jin_idx_reference_grain_kpi_uploaded_at ON jin_reference(grain_key, kpi_field, uploaded_at)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX jin_idx_reference_endpoint_kpi_uploaded_at ON jin_reference(endpoint_path, kpi_field, uploaded_at)",
        [],
    );

    Ok(())
}

pub fn next_id(conn: &Connection, table: &str) -> Result<i64, duckdb::Error> {
    let next_from_table_sql = format!("SELECT COALESCE(MAX(id), 0) + 1 FROM {table}");
    let next_from_table: i64 = conn.query_row(&next_from_table_sql, [], |row| row.get(0))?;
    let sequence_name = format!(
        "jin_seq_{}",
        table.replace(|c: char| !c.is_ascii_alphanumeric(), "_")
    );
    let create_sequence_sql = format!(
        "CREATE SEQUENCE IF NOT EXISTS {sequence_name} START {next_from_table} INCREMENT 1"
    );
    conn.execute(&create_sequence_sql, [])?;

    let next_value_sql = format!("SELECT nextval('{sequence_name}')");
    let mut next_value: i64 = conn.query_row(&next_value_sql, [], |row| row.get(0))?;
    // Keep sequence monotonic without restarting it. Restarting with a stale
    // floor under concurrent writes can reissue ids and trigger fatal PK
    // collisions in DuckDB internals.
    while next_value < next_from_table {
        next_value = conn.query_row(&next_value_sql, [], |row| row.get(0))?;
    }
    Ok(next_value)
}

pub fn checkpoint(conn: &Connection) -> Result<(), duckdb::Error> {
    conn.execute("CHECKPOINT", [])?;
    Ok(())
}


#[cfg(test)]
pub fn read_kpi_history(
 conn: &Connection,
 grain_key: &str,
 kpi_field: &str,
) -> Result<Vec<f64>, duckdb::Error> {
 read_kpi_history_window(conn, grain_key, kpi_field, usize::MAX)
}

#[cfg(test)]
pub fn read_kpi_history_window(
 conn: &Connection,
 grain_key: &str,
 kpi_field: &str,
 max_points: usize,
) -> Result<Vec<f64>, duckdb::Error> {
 let limit = max_points.max(1).min(i64::MAX as usize) as i64;
 let mut stmt = conn.prepare(
 "
 SELECT kpi_json
 FROM jin_observations
 WHERE grain_key = ?
 ORDER BY observed_at DESC, id DESC
 LIMIT ?
 ",
 )?;
 let rows = stmt.query_map(params![grain_key, limit], |row| row.get::<usize, String>(0))?;
 let mut values = Vec::new();
 for row in rows {
 let payload = row?;
 if let Ok(parsed) = serde_json::from_str::<Value>(&payload) {
 if let Some(value) = parsed.get(kpi_field).and_then(numeric_value) {
 values.push(value);
 }
 }
 }
 values.reverse();
 Ok(values)
}

pub fn reference_value(
 conn: &Connection,
 grain_key: &str,
 kpi_field: &str,
) -> Result<Option<(f64, f64)>, duckdb::Error> {
 let mut stmt = conn.prepare(
 "
 SELECT expected_value, tolerance_pct
 FROM jin_reference
 WHERE grain_key = ? AND kpi_field = ?
 ORDER BY uploaded_at DESC, id DESC
 LIMIT 1
 ",
 )?;
 let mut rows = stmt.query(params![grain_key, kpi_field])?;
 if let Some(row) = rows.next()? {
 return Ok(Some((row.get(0)?, row.get(1)?)));
 }

 let canonical_target = canonical_grain_key(grain_key);
 if canonical_target == grain_key {
 return Ok(None);
 }
 let endpoint = grain_key.split('|').next().unwrap_or_default();
 if endpoint.is_empty() {
 return Ok(None);
 }

 let mut fallback_stmt = conn.prepare(
 "
 SELECT grain_key, expected_value, tolerance_pct
 FROM jin_reference
 WHERE endpoint_path = ? AND kpi_field = ?
 ORDER BY uploaded_at DESC, id DESC
 ",
 )?;
 let fallback_rows = fallback_stmt.query_map(params![endpoint, kpi_field], |row| {
 Ok((
 row.get::<usize, String>(0)?,
 row.get::<usize, f64>(1)?,
 row.get::<usize, f64>(2)?,
 ))
 })?;
 for row in fallback_rows {
 let (candidate_grain_key, expected, tolerance) = row?;
 if canonical_grain_key(&candidate_grain_key) == canonical_target {
 return Ok(Some((expected, tolerance)));
 }
 }
 Ok(None)
}

pub fn upsert_anomaly(
 conn: &Connection,
 endpoint: &str,
 grain_key: &str,
 anomaly: &AnomalyResult,
) -> Result<(), duckdb::Error> {
 let mut stmt = conn.prepare(
 "
 SELECT id
 FROM jin_anomalies
 WHERE grain_key = ? AND kpi_field = ? AND detection_method = ? AND is_active = true
 ORDER BY detected_at DESC, id DESC
 LIMIT 1
 ",
 )?;
 let mut rows = stmt.query(params![grain_key, anomaly.kpi_field, anomaly.method])?;
 if let Some(row) = rows.next()? {
 let id: i64 = row.get(0)?;
 conn.execute(
 "
 UPDATE jin_anomalies
 SET expected_value = ?, actual_value = ?, pct_change = ?, ai_explanation = ?, detected_at = now(), impact = ?
 WHERE id = ?
 ",
 params![
 anomaly.expected,
 anomaly.actual,
 anomaly.pct_change,
 anomaly_explanation(anomaly),
 anomaly.impact,
 id
 ],
 )?;
 } else {
 let explanation = anomaly_explanation(anomaly);
 let mut inserted = false;
 for _ in 0..8 {
 let next = next_id(conn, "jin_anomalies")?;
 let changed = conn.execute(
 "
 INSERT INTO jin_anomalies (
 id, endpoint_path, grain_key, kpi_field, expected_value, actual_value, pct_change, detection_method, ai_explanation, impact
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 ON CONFLICT(id) DO NOTHING
 ",
 params![
 next,
 endpoint,
 grain_key,
 anomaly.kpi_field,
 anomaly.expected,
 anomaly.actual,
 anomaly.pct_change,
 anomaly.method,
 &explanation,
 anomaly.impact
 ],
 )?;
 if changed > 0 {
 inserted = true;
 break;
 }
 }
 if !inserted {
 let retry_existing: Option<i64> = conn
 .query_row(
 "
 SELECT id
 FROM jin_anomalies
 WHERE grain_key = ? AND kpi_field = ? AND detection_method = ? AND is_active = true
 ORDER BY detected_at DESC, id DESC
 LIMIT 1
 ",
 params![grain_key, anomaly.kpi_field, anomaly.method],
 |row| row.get(0),
 )
 .ok();
 if let Some(id) = retry_existing {
 conn.execute(
 "
 UPDATE jin_anomalies
 SET expected_value = ?, actual_value = ?, pct_change = ?, ai_explanation = ?, detected_at = now(), impact = ?
 WHERE id = ?
 ",
 params![
 anomaly.expected,
 anomaly.actual,
 anomaly.pct_change,
 &explanation,
 anomaly.impact,
 id
 ],
 )?;
 }
 }
 }
 Ok(())
}

fn active_anomaly_lookup_for_grain(
 conn: &Connection,
 endpoint_path: &str,
 grain_key: &str,
) -> Result<BTreeMap<String, (f64, f64, String)>, String> {
 let mut stmt = conn
 .prepare(
 "
 SELECT kpi_field, expected_value, pct_change, detection_method
 FROM jin_anomalies
 WHERE endpoint_path = ? AND grain_key = ? AND is_active = true
 ORDER BY detected_at DESC, id DESC
 ",
 )
 .map_err(|err| err.to_string())?;
 let rows = stmt
 .query_map(params![endpoint_path, grain_key], |row| {
 Ok((
 row.get::<usize, String>(0)?,
 row.get::<usize, f64>(1)?,
 row.get::<usize, f64>(2)?,
 row.get::<usize, String>(3)?,
 ))
 })
 .map_err(|err| err.to_string())?;
 let mut by_kpi = BTreeMap::new();
 for row in rows {
 let (kpi_field, expected_value, pct_change, method) = row.map_err(|err| err.to_string())?;
 by_kpi
 .entry(kpi_field)
 .or_insert((expected_value, pct_change, method));
 }
 Ok(by_kpi)
}

fn reference_lookup_for_grain(
 conn: &Connection,
 endpoint_path: &str,
 grain_key: &str,
 kpi_fields: &[String],
) -> Result<BTreeMap<String, (f64, f64)>, String> {
 if kpi_fields.is_empty() {
 return Ok(BTreeMap::new());
 }
 let wanted: BTreeSet<String> = kpi_fields.iter().cloned().collect();
 let canonical_target = canonical_grain_key(grain_key);
 let mut direct = BTreeMap::new();
 let mut canonical = BTreeMap::new();

 let mut stmt = conn
 .prepare(
 "
 SELECT grain_key, kpi_field, expected_value, tolerance_pct
 FROM jin_reference
 WHERE endpoint_path = ?
 ORDER BY uploaded_at DESC, id DESC
 ",
 )
 .map_err(|err| err.to_string())?;
 let rows = stmt
 .query_map(params![endpoint_path], |row| {
 Ok((
 row.get::<usize, Option<String>>(0)?,
 row.get::<usize, String>(1)?,
 row.get::<usize, f64>(2)?,
 row.get::<usize, f64>(3)?,
 ))
 })
 .map_err(|err| err.to_string())?;

 for row in rows {
 let (candidate_grain_key, kpi_field, expected_value, tolerance_pct) =
 row.map_err(|err| err.to_string())?;
 if !wanted.contains(&kpi_field) {
 continue;
 }
 let candidate_grain_key = candidate_grain_key.unwrap_or_default();
 if candidate_grain_key == grain_key {
 direct
 .entry(kpi_field.clone())
 .or_insert((expected_value, tolerance_pct));
 } else if canonical_grain_key(&candidate_grain_key) == canonical_target {
 canonical
 .entry(kpi_field.clone())
 .or_insert((expected_value, tolerance_pct));
 }
 if wanted
 .iter()
 .all(|field| direct.contains_key(field) || canonical.contains_key(field))
 {
 break;
 }
 }

 for (kpi_field, reference) in direct {
 canonical.insert(kpi_field, reference);
 }
 Ok(canonical)
}

pub fn status_payload(conn: &Connection) -> Result<String, String> {
 let mut stmt = conn
 .prepare(
 "
 SELECT
 e.endpoint_path,
 e.http_method,
 e.pydantic_schema,
 COALESCE(c.dimension_overrides, e.dimension_fields),
 COALESCE(c.kpi_overrides, e.kpi_fields),
 COUNT(DISTINCT o.grain_key) AS grain_count,
 COUNT(DISTINCT CASE WHEN a.is_active THEN a.id END) AS active_anomalies,
 CAST(MAX(o.observed_at) AS VARCHAR) AS last_checked,
 COALESCE(
 CASE COALESCE(c.active_tolerance, 'normal')
 WHEN 'relaxed' THEN c.tolerance_relaxed
 WHEN 'strict' THEN c.tolerance_strict
 ELSE c.tolerance_normal
 END,
 c.tolerance_pct,
 10.0
 ) AS tolerance_pct,
 COALESCE(c.confirmed, false) AS confirmed,
 COALESCE(e.config_source, 'auto') AS config_source
 FROM jin_endpoints e
 LEFT JOIN jin_observations o ON o.endpoint_path = e.endpoint_path
 LEFT JOIN jin_anomalies a ON a.endpoint_path = e.endpoint_path
 LEFT JOIN jin_config c ON c.endpoint_path = e.endpoint_path
 GROUP BY 1, 2, 3, 4, 5, 9, 10, 11
 ORDER BY 1, 2
 ",
 )
 .map_err(|err| err.to_string())?;
 let rows = stmt
 .query_map([], |row| {
 let schema_contract = row
 .get::<usize, Option<String>>(2)?
 .map(|value| parse_json_or_default(&value, json!({})))
 .unwrap_or(json!({}));
 let dimension_fields = parse_json_or_default(&row.get::<usize, String>(3)?, json!([]));
 let kpi_fields = parse_json_or_default(&row.get::<usize, String>(4)?, json!([]));
 Ok(json!({
 "endpoint_path": row.get::<usize, String>(0)?,
 "http_method": row.get::<usize, String>(1)?,
 "schema_contract": schema_contract,
 "dimension_fields": dimension_fields,
 "kpi_fields": kpi_fields,
 "fields": schema_contract.get("fields").cloned().unwrap_or(json!([])),
 "grain_count": row.get::<usize, i64>(5)?,
 "active_anomalies": row.get::<usize, i64>(6)?,
 "active_mismatches": row.get::<usize, i64>(6)?,
 "last_checked": row.get::<usize, Option<String>>(7)?,
 "tolerance_pct": row.get::<usize, f64>(8)?,
 "confirmed": row.get::<usize, bool>(9)?,
 "config_source": row.get::<usize, String>(10)?,
 "status": if row.get::<usize, i64>(6)? > 0 {
 "anomaly"
 } else if row.get::<usize, i64>(5)? > 0 {
 if row.get::<usize, bool>(9)? { "healthy" } else { "warning" }
 } else if kpi_fields.as_array().map(|v| !v.is_empty()).unwrap_or(false) {
 "unconfirmed"
 } else {
 "healthy"
 },
 "reconciliation_status": if row.get::<usize, i64>(6)? > 0 {
 "mismatch"
 } else if row.get::<usize, i64>(5)? > 0 {
 "match"
 } else {
 "missing_reference"
 },
 "current_kpis": json!([]),
 }))
 })
 .map_err(|err| err.to_string())?;

 let mut endpoints = Vec::new();
 for row in rows {
 endpoints.push(row.map_err(|err| err.to_string())?);
 }
 for endpoint in &mut endpoints {
 let path = endpoint
 .get("endpoint_path")
 .and_then(Value::as_str)
 .unwrap_or_default()
 .to_string();
 let kpi_fields: Vec<String> = endpoint
 .get("kpi_fields")
 .and_then(Value::as_array)
 .map(|items| {
 items
 .iter()
 .filter_map(|item| item.as_str().map(ToOwned::to_owned))
 .collect()
 })
 .unwrap_or_default();
 let mut latest_stmt = conn
 .prepare(
 "SELECT grain_key, kpi_json, CAST(observed_at AS VARCHAR) FROM jin_observations WHERE endpoint_path = ? ORDER BY observed_at DESC LIMIT 1",
 )
 .map_err(|err| err.to_string())?;
 let history = latest_stmt
 .query_map(params![path], |row| {
 Ok(json!({
 "grain_key": row.get::<usize, String>(0)?,
 "kpi_json": parse_json_or_default(&row.get::<usize, String>(1)?, json!({})),
 "observed_at": row.get::<usize, String>(2)?,
 }))
 })
 .map_err(|err| err.to_string())?;
 let mut current_kpis = Vec::new();
 for row in history {
 let latest = row.map_err(|err| err.to_string())?;
 let grain_key = latest
 .get("grain_key")
 .and_then(Value::as_str)
 .unwrap_or_default()
 .to_string();
 let active_anomaly_by_kpi = active_anomaly_lookup_for_grain(conn, &path, &grain_key)?;
 let reference_by_kpi =
 reference_lookup_for_grain(conn, &path, &grain_key, &kpi_fields)?;
 if let Some(kpi_json) = latest.get("kpi_json").and_then(Value::as_object) {
 for kpi_field in &kpi_fields {
 if let Some(actual) = kpi_json.get(kpi_field).and_then(Value::as_f64) {
 let active_anomaly = active_anomaly_by_kpi.get(kpi_field);
 let reference = reference_by_kpi.get(kpi_field).copied();
 let (expected_value, pct_change, severity, confidence, reconciliation_status, tolerance_pct) =
 if let Some((expected, change, method)) = active_anomaly {
 (
 json!(*expected),
 json!(*change),
 anomaly_severity_label(*change),
 anomaly_confidence_value(method),
 "mismatch",
 reference.map(|(_, tolerance)| tolerance),
 )
 } else if let Some((expected, tolerance)) = reference {
 (json!(expected), json!(0.0), "info", 0.0, "match", Some(tolerance))
 } else {
 (Value::Null, json!(0.0), "info", 0.0, "missing_reference", None)
 };
 let delta = expected_value.as_f64().map(|expected| actual - expected);
 let reason = match reconciliation_status {
 "mismatch" => format!(
 "API value for {} does not match the uploaded reference for this grain.",
 kpi_field
 ),
 "match" => format!(
 "API value for {} matches the uploaded reference for this grain.",
 kpi_field
 ),
 _ => format!(
 "No uploaded reference found for {} on this grain, so reconciliation could not run.",
 kpi_field
 ),
 };
 current_kpis.push(json!({
 "grain_key": latest.get("grain_key").cloned().unwrap_or(Value::Null),
 "kpi_field": kpi_field,
 "actual_value": actual,
 "expected_value": expected_value,
 "delta": delta,
 "pct_change": pct_change,
 "tolerance_pct": tolerance_pct,
 "reconciliation_status": reconciliation_status,
 "reason": reason,
 "severity": severity,
 "confidence": confidence,
 }));
 }
 }
 }
 }
 let operator_metadata = endpoint_operational_metadata(conn, &path)?;
 if let Some(endpoint_obj) = endpoint.as_object_mut() {
 endpoint_obj.insert("current_kpis".to_string(), Value::Array(current_kpis));
 if let Some(metadata_obj) = operator_metadata.as_object() {
 for (key, value) in metadata_obj {
 endpoint_obj.insert(key.clone(), value.clone());
 }
 }
 }
 }
 let summary = json!({
 "total_endpoints": endpoints.len(),
 "healthy": endpoints.iter().filter(|item| item["status"] == "healthy").count(),
 "anomalies": endpoints.iter().map(|item| item["active_anomalies"].as_i64().unwrap_or(0)).sum::<i64>(),
 "mismatches": endpoints.iter().map(|item| item["active_anomalies"].as_i64().unwrap_or(0)).sum::<i64>(),
 "unconfirmed": endpoints.iter().filter(|item| item["confirmed"] == false).count(),
 });

 serde_json::to_string(&json!({ "summary": summary, "endpoints": endpoints }))
 .map_err(|err| err.to_string())
}

pub fn endpoint_detail_payload_with_limits(
 conn: &Connection,
 endpoint_path: &str,
 history_limit: Option<usize>,
 reference_limit: Option<usize>,
) -> Result<String, String> {
 let effective_history_limit = history_limit
 .unwrap_or(DEFAULT_ENDPOINT_HISTORY_LIMIT)
 .max(1);
 let effective_reference_limit = reference_limit
 .unwrap_or(DEFAULT_ENDPOINT_REFERENCE_LIMIT)
 .max(1);

 let endpoint = conn
 .execute("SELECT 1", [])
 .map_err(|err| err.to_string())?;
 let _ = endpoint;

 let endpoint_row = conn
 .prepare(
 "SELECT endpoint_path, http_method, pydantic_schema, dimension_fields, kpi_fields, config_source FROM jin_endpoints WHERE endpoint_path = ?",
 )
 .map_err(|err| err.to_string())?
 .query_row(params![endpoint_path], |row| {
 Ok(json!({
 "endpoint_path": row.get::<usize, String>(0)?,
 "http_method": row.get::<usize, String>(1)?,
 "schema_contract": row.get::<usize, Option<String>>(2)?.map(|value| parse_json_or_default(&value, json!({}))).unwrap_or(json!({})),
 "dimension_fields": parse_json_or_default(&row.get::<usize, String>(3)?, json!([])),
 "kpi_fields": parse_json_or_default(&row.get::<usize, String>(4)?, json!([])),
 "config_source": row.get::<usize, String>(5)?,
 }))
 })
 .optional()
 .map_err(|err| err.to_string())?;

 let mut history_stmt = conn
 .prepare(
 "SELECT grain_key, dimension_json, kpi_json, CAST(observed_at AS VARCHAR) FROM jin_observations WHERE endpoint_path = ? ORDER BY observed_at DESC LIMIT ?",
 )
 .map_err(|err| err.to_string())?;
 let history_rows = history_stmt
 .query_map(params![endpoint_path, effective_history_limit as i64], |row| {
 Ok(json!({
 "grain_key": row.get::<usize, String>(0)?,
 "dimension_json": parse_json_or_default(&row.get::<usize, String>(1)?, json!({})),
 "kpi_json": parse_json_or_default(&row.get::<usize, String>(2)?, json!({})),
 "observed_at": row.get::<usize, String>(3)?,
 }))
 })
 .map_err(|err| err.to_string())?;
 let mut history = Vec::new();
 for row in history_rows {
 history.push(row.map_err(|err| err.to_string())?);
 }

 let mut recent_stmt = conn
 .prepare(
 "
 SELECT grain_key, dimension_json, kpi_json, CAST(observed_at AS VARCHAR) 
 FROM jin_observations 
 WHERE endpoint_path = ? 
 ORDER BY observed_at DESC 
 LIMIT ?
 ",
 )
 .map_err(|err| err.to_string())?;
 let recent_rows = recent_stmt
 .query_map(
 params![endpoint_path, effective_history_limit.min(50) as i64],
 |row| {
 Ok(json!({
 "grain_key": row.get::<usize, String>(0)?,
 "dimension_json": parse_json_or_default(&row.get::<usize, String>(1)?, json!({})),
 "kpi_json": parse_json_or_default(&row.get::<usize, String>(2)?, json!({})),
 "observed_at": row.get::<usize, String>(3)?,
 }))
 },
 )
 .map_err(|err| err.to_string())?;
 let mut recent_history = Vec::new();
 for row in recent_rows {
 recent_history.push(row.map_err(|err| err.to_string())?);
 }

 let mut anomaly_stmt = conn
 .prepare(
 "
 SELECT
 a.id,
 a.grain_key,
 a.kpi_field,
 a.actual_value,
 a.expected_value,
 a.pct_change,
 a.detection_method,
 a.ai_explanation,
 a.is_active,
 s.incident_status,
 s.note,
 s.owner,
 s.resolution_reason,
 CAST(s.snoozed_until AS VARCHAR),
 CAST(s.suppressed_until AS VARCHAR),
 a.impact
 FROM jin_anomalies a
 LEFT JOIN jin_incident_state s ON s.anomaly_id = a.id
 WHERE a.endpoint_path = ? AND a.is_active = true
 ORDER BY a.detected_at DESC
 ",
 )
 .map_err(|err| err.to_string())?;
 let anomaly_rows = anomaly_stmt
 .query_map(params![endpoint_path], |row| {
 let actual_value = row.get::<usize, f64>(3)?;
 let expected_value = row.get::<usize, f64>(4)?;
 let pct_change = row.get::<usize, f64>(5)?;
 let detection_method = row.get::<usize, String>(6)?;
 let is_active = row.get::<usize, bool>(8)?;
 let incident_status = row.get::<usize, Option<String>>(9)?;
 let note = row.get::<usize, Option<String>>(10)?;
 let owner = row.get::<usize, Option<String>>(11)?;
 let resolution_reason = row.get::<usize, Option<String>>(12)?;
 let snoozed_until = row.get::<usize, Option<String>>(13)?;
 let suppressed_until = row.get::<usize, Option<String>>(14)?;
 let impact = row.get::<usize, f64>(15)?;
 let status = incident_status_for(
 is_active,
 incident_status.as_deref(),
 snoozed_until.as_deref(),
 suppressed_until.as_deref(),
 );
 Ok(json!({
 "id": row.get::<usize, i64>(0)?,
 "grain_key": row.get::<usize, Option<String>>(1)?,
 "kpi_field": row.get::<usize, Option<String>>(2)?,
 "actual_value": actual_value,
 "expected_value": expected_value,
 "pct_change": pct_change,
 "detection_method": detection_method,
 "ai_explanation": row.get::<usize, Option<String>>(7)?,
 "severity": anomaly_severity_label(pct_change),
 "confidence": anomaly_confidence_value(&row.get::<usize, String>(6)?),
 "incident_status": incident_status,
 "note": note,
 "owner": owner,
 "resolution_reason": resolution_reason,
 "snoozed_until": snoozed_until,
 "suppressed_until": suppressed_until,
 "status": status,
 "reconciliation_status": "mismatch",
 "baseline_label": baseline_label(&row.get::<usize, String>(6)?),
 "expected_source_label": baseline_label(&row.get::<usize, String>(6)?),
 "why_flagged": anomaly_reason(
 &row.get::<usize, String>(6)?,
 &row.get::<usize, String>(2)?,
 actual_value,
 expected_value,
 pct_change,
 ),
 "why_mismatch": anomaly_reason(
 &row.get::<usize, String>(6)?,
 &row.get::<usize, String>(2)?,
 actual_value,
 expected_value,
 pct_change,
 ),
 "baseline_used": expected_value,
 "delta": actual_value - expected_value,
 "delta_pct": pct_change,
 "change_since_last_healthy_run": change_summary(actual_value, expected_value, pct_change),
 "difference_summary": change_summary(actual_value, expected_value, pct_change),
 "impact": impact,
 }))
 })
 .map_err(|err| err.to_string())?;
 let mut anomalies = Vec::new();
 for row in anomaly_rows {
 anomalies.push(row.map_err(|err| err.to_string())?);
 }

 let mut ref_stmt = conn
 .prepare(
 "SELECT grain_key, kpi_field, expected_value, tolerance_pct, upload_source FROM jin_reference WHERE endpoint_path = ? ORDER BY uploaded_at DESC LIMIT ?",
 )
 .map_err(|err| err.to_string())?;
 let ref_rows = ref_stmt
 .query_map(
 params![endpoint_path, effective_reference_limit as i64],
 |row| {
 Ok(json!({
 "grain_key": row.get::<usize, Option<String>>(0)?,
 "kpi_field": row.get::<usize, Option<String>>(1)?,
 "expected_value": row.get::<usize, Option<f64>>(2)?,
 "tolerance_pct": row.get::<usize, Option<f64>>(3)?,
 "upload_source": row.get::<usize, Option<String>>(4)?,
 }))
 },
 )
 .map_err(|err| err.to_string())?;
 let mut references = Vec::new();
 for row in ref_rows {
 references.push(row.map_err(|err| err.to_string())?);
 }

 let config = conn
 .prepare(
 "SELECT dimension_overrides, kpi_overrides, tolerance_pct, confirmed, tolerance_relaxed, tolerance_normal, tolerance_strict, active_tolerance, time_field, time_granularity FROM jin_config WHERE endpoint_path = ?",
 )
 .map_err(|err| err.to_string())?
 .query_row(params![endpoint_path], |row| {
 Ok(json!({
 "dimension_fields": parse_json_or_default(&row.get::<usize, String>(0)?, json!([])),
 "kpi_fields": parse_json_or_default(&row.get::<usize, String>(1)?, json!([])),
 "tolerance_pct": row.get::<usize, f64>(2)?,
 "confirmed": row.get::<usize, bool>(3)?,
 "tolerance_relaxed": row.get::<usize, f64>(4)?,
 "tolerance_normal": row.get::<usize, f64>(5)?,
 "tolerance_strict": row.get::<usize, f64>(6)?,
 "active_tolerance": row.get::<usize, String>(7)?,
 "time_field": row.get::<usize, Option<String>>(8)?,
 "time_granularity": row.get::<usize, Option<String>>(9)?,
 }))
 })
 .optional()
 .map_err(|err| err.to_string())?
 .unwrap_or(json!({}));

 let endpoint_schema = endpoint_row
 .as_ref()
 .and_then(|item| item.get("schema_contract"))
 .cloned()
 .unwrap_or(json!({}));
 let endpoint_kpis: Vec<String> = endpoint_row
 .as_ref()
 .and_then(|item| item.get("kpi_fields"))
 .and_then(Value::as_array)
 .map(|items| {
 items
 .iter()
 .filter_map(|item| item.as_str().map(ToOwned::to_owned))
 .collect()
 })
 .unwrap_or_default();
 let current_kpis = history
 .first()
 .and_then(|row| {
 let grain_key = row.get("grain_key").and_then(Value::as_str)?.to_string();
 let kpi_json = row.get("kpi_json").and_then(Value::as_object)?;
 let active_anomaly_by_kpi =
 active_anomaly_lookup_for_grain(conn, endpoint_path, &grain_key).ok()?;
 let reference_by_kpi =
 reference_lookup_for_grain(conn, endpoint_path, &grain_key, &endpoint_kpis).ok()?;
 let mut items = Vec::new();
 for kpi_field in &endpoint_kpis {
 if let Some(actual) = kpi_json.get(kpi_field).and_then(Value::as_f64) {
 let active_anomaly = active_anomaly_by_kpi.get(kpi_field);
 let reference = reference_by_kpi.get(kpi_field).copied();
 let (expected_value, pct_change, severity, confidence, reconciliation_status, tolerance_pct) =
 if let Some((expected, change, method)) = active_anomaly {
 (
 json!(*expected),
 json!(*change),
 anomaly_severity_label(*change),
 anomaly_confidence_value(method),
 "mismatch",
 reference.map(|(_, tolerance)| tolerance),
 )
 } else if let Some((expected, tolerance)) = reference {
 (json!(expected), json!(0.0), "info", 0.0, "match", Some(tolerance))
 } else {
 (Value::Null, json!(0.0), "info", 0.0, "missing_reference", None)
 };
 let delta = expected_value.as_f64().map(|expected| actual - expected);
 let reason = match reconciliation_status {
 "mismatch" => format!(
 "API value for {} does not match the uploaded reference for this grain.",
 kpi_field
 ),
 "match" => format!(
 "API value for {} matches the uploaded reference for this grain.",
 kpi_field
 ),
 _ => format!(
 "No uploaded reference found for {} on this grain, so reconciliation could not run.",
 kpi_field
 ),
 };
 items.push(json!({
 "grain_key": grain_key,
 "kpi_field": kpi_field,
 "actual_value": actual,
 "expected_value": expected_value,
 "delta": delta,
 "pct_change": pct_change,
 "tolerance_pct": tolerance_pct,
 "reconciliation_status": reconciliation_status,
 "reason": reason,
 "severity": severity,
 "confidence": confidence,
 }));
 }
 }
 Some(Value::Array(items))
 })
 .unwrap_or(json!([]));
 let operator_metadata = endpoint_operational_metadata(conn, endpoint_path)?;

 serde_json::to_string(&json!({
 "endpoint": endpoint_row,
 "schema_contract": endpoint_schema,
 "config": config,
 "history": history,
 "recent_history": recent_history,
 "anomalies": anomalies,
 "references": references,
 "trend_summary": trend_summary(&history, &endpoint_kpis),
 "current_kpis": current_kpis,
 "operator_metadata": operator_metadata,
 "upload_activity": operator_metadata.get("recent_uploads").cloned().unwrap_or(json!([])),
 "history_limited_to": effective_history_limit,
 "references_limited_to": effective_reference_limit,
 }))
 .map_err(|err| err.to_string())
}

pub fn active_anomalies_payload(conn: &Connection) -> Result<String, String> {
 let mut stmt = conn
 .prepare(
 "
 SELECT
 a.id,
 a.endpoint_path,
 a.grain_key,
 a.kpi_field,
 a.actual_value,
 a.expected_value,
 a.pct_change,
 a.detection_method,
 a.ai_explanation,
 a.is_active,
 s.incident_status,
 s.note,
 s.owner,
 s.resolution_reason,
 CAST(s.snoozed_until AS VARCHAR),
 CAST(s.suppressed_until AS VARCHAR),
 a.impact
 FROM jin_anomalies a
 LEFT JOIN jin_incident_state s ON s.anomaly_id = a.id
 WHERE a.is_active = true
 ORDER BY a.detected_at DESC, a.id DESC
 ",
 )
 .map_err(|err| err.to_string())?;
 let rows = stmt
 .query_map([], |row| {
 let actual_value = row.get::<usize, f64>(4)?;
 let expected_value = row.get::<usize, f64>(5)?;
 let pct_change = row.get::<usize, f64>(6)?;
 let detection_method = row.get::<usize, String>(7)?;
 let is_active = row.get::<usize, bool>(9)?;
 let incident_status = row.get::<usize, Option<String>>(10)?;
 let note = row.get::<usize, Option<String>>(11)?;
 let owner = row.get::<usize, Option<String>>(12)?;
 let resolution_reason = row.get::<usize, Option<String>>(13)?;
 let snoozed_until = row.get::<usize, Option<String>>(14)?;
 let suppressed_until = row.get::<usize, Option<String>>(15)?;
 let impact = row.get::<usize, f64>(16)?;
 let status = incident_status_for(
 is_active,
 incident_status.as_deref(),
 snoozed_until.as_deref(),
 suppressed_until.as_deref(),
 );
 Ok(json!({
 "id": row.get::<usize, i64>(0)?,
 "endpoint_path": row.get::<usize, Option<String>>(1)?,
 "grain_key": row.get::<usize, Option<String>>(2)?,
 "kpi_field": row.get::<usize, Option<String>>(3)?,
 "actual_value": actual_value,
 "expected_value": expected_value,
 "pct_change": pct_change,
 "detection_method": detection_method,
 "ai_explanation": row.get::<usize, Option<String>>(8)?,
 "severity": anomaly_severity_label(pct_change),
 "confidence": anomaly_confidence_value(&row.get::<usize, String>(7)?),
 "incident_status": incident_status,
 "note": note,
 "owner": owner,
 "resolution_reason": resolution_reason,
 "snoozed_until": snoozed_until,
 "suppressed_until": suppressed_until,
 "status": status,
 "reconciliation_status": "mismatch",
 "baseline_label": baseline_label(&row.get::<usize, String>(7)?),
 "expected_source_label": baseline_label(&row.get::<usize, String>(7)?),
 "why_flagged": anomaly_reason(
 &row.get::<usize, String>(7)?,
 &row.get::<usize, String>(3)?,
 actual_value,
 expected_value,
 pct_change,
 ),
 "why_mismatch": anomaly_reason(
 &row.get::<usize, String>(7)?,
 &row.get::<usize, String>(3)?,
 actual_value,
 expected_value,
 pct_change,
 ),
 "baseline_used": expected_value,
 "delta": actual_value - expected_value,
 "delta_pct": pct_change,
 "change_since_last_healthy_run": change_summary(actual_value, expected_value, pct_change),
 "difference_summary": change_summary(actual_value, expected_value, pct_change),
 "impact": impact,
 }))
 })
 .map_err(|err| err.to_string())?;

 let mut anomalies = Vec::new();
 for row in rows {
 anomalies.push(row.map_err(|err| err.to_string())?);
 }

 serde_json::to_string(&json!({ "anomalies": anomalies })).map_err(|err| err.to_string())
}

pub fn resolve_anomaly(conn: &Connection, anomaly_id: i64) -> Result<String, String> {
 conn.execute(
 "UPDATE jin_anomalies SET is_active = false, resolved_at = now() WHERE id = ?",
 params![anomaly_id],
 )
 .map_err(|err| err.to_string())?;
 serde_json::to_string(&json!({ "ok": true, "id": anomaly_id })).map_err(|err| err.to_string())
}

pub fn resolve_matching_anomaly(
 conn: &Connection,
 grain_key: &str,
 kpi_field: &str,
 method: &str,
) -> Result<(), duckdb::Error> {
 conn.execute(
 "
 UPDATE jin_anomalies
 SET is_active = false, resolved_at = now()
 WHERE grain_key = ? AND kpi_field = ? AND detection_method = ? AND is_active = true
 ",
 params![grain_key, kpi_field, method],
 )?;
 Ok(())
}

pub fn import_reference_rows(
 conn: &Connection,
 endpoint_path: &str,
 dimension_fields: &[String],
 kpi_fields: &[String],
 rows: &[Value],
 upload_source: &str,
) -> Result<String, String> {
 validate_endpoint_path(endpoint_path)?;
 let dimension_fields = sanitize_field_list(dimension_fields, "dimension")?;
 let kpi_fields = sanitize_field_list(kpi_fields, "kpi")?;
 if kpi_fields.is_empty() {
 return Err("kpi_fields include at least one field".to_string());
 }
 conn.execute(
 "
 INSERT OR REPLACE INTO jin_config (
 endpoint_path, dimension_overrides, kpi_overrides,
 tolerance_relaxed, tolerance_normal, tolerance_strict, active_tolerance,
 tolerance_pct, confirmed, updated_at
 ) VALUES (?, ?, ?, ?, ?, ?, 'normal', ?, true, now())
 ",
 params![
 endpoint_path,
 serde_json::to_string(&dimension_fields).map_err(|err| err.to_string())?,
 serde_json::to_string(&kpi_fields).map_err(|err| err.to_string())?,
 20.0_f64,
 10.0_f64,
 5.0_f64,
 10.0_f64,
 ],
 )
 .map_err(|err| err.to_string())?;

 let dimension_fields_json =
 serde_json::to_string(&dimension_fields).map_err(|err| err.to_string())?;
 let kpi_fields_json = serde_json::to_string(&kpi_fields).map_err(|err| err.to_string())?;
 upsert_endpoint_record(
 conn,
 endpoint_path,
 "GET",
 &dimension_fields_json,
 &kpi_fields_json,
 "upload",
 None,
 )?;

 let mut imported = 0_i64;
 for row in rows {
 let dimensions = row
 .get("dimensions")
 .and_then(Value::as_object)
 .ok_or_else(|| "row.dimensions must be an object".to_string())?;
 let expected = row
 .get("expected")
 .and_then(Value::as_object)
 .ok_or_else(|| "row.expected must be an object".to_string())?;
 let tolerance_pct = row
 .get("tolerance_pct")
 .and_then(Value::as_f64)
 .unwrap_or(10.0);
 let tolerance_pct = validate_tolerance(tolerance_pct, "row tolerance_pct")?;

 let mut row_dims = std::collections::BTreeMap::new();
 for field in &dimension_fields {
 let value = dimensions
 .get(field.as_str())
 .and_then(Value::as_str)
 .ok_or_else(|| format!("row.dimensions missing non-empty value for {field}"))?;
 row_dims.insert(field.clone(), value.to_string());
 }
 let grain_key = crate::core::grain::build_grain_key(endpoint_path, &row_dims);

 for (kpi_field, expected_value) in expected {
 if !kpi_fields.iter().any(|item| item == kpi_field) {
 return Err(format!(
 "expected field {kpi_field} is not configured as a KPI"
 ));
 }
 let expected_value = expected_value
 .as_f64()
 .ok_or_else(|| format!("expected value for {kpi_field} must be numeric"))?;
 if !expected_value.is_finite() {
 return Err(format!("expected value for {kpi_field} must be finite"));
 }
 conn.execute(
 "DELETE FROM jin_reference WHERE endpoint_path = ? AND grain_key = ? AND kpi_field = ?",
 params![endpoint_path, grain_key, kpi_field],
 )
 .map_err(|err| err.to_string())?;
 let next = next_id(conn, "jin_reference").map_err(|err| err.to_string())?;
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![next, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source],
 )
 .map_err(|err| err.to_string())?;
 imported += 1;
 }
 }

 serde_json::to_string(&json!({
 "ok": true,
 "rows": rows.len(),
 "imported": imported,
 "dimension_fields": dimension_fields,
 "kpi_fields": kpi_fields,
 }))
 .map_err(|err| err.to_string())
}

pub fn save_endpoint_config(
 conn: &Connection,
 endpoint_path: &str,
 http_method: &str,
 default_dimension_fields: &[String],
 default_kpi_fields: &[String],
 payload: &Value,
) -> Result<String, String> {
 validate_endpoint_path(endpoint_path)?;
 let dimension_fields: Vec<String> = payload
 .get("dimension_fields")
 .and_then(Value::as_array)
 .map(|items| {
 items
 .iter()
 .filter_map(|item| item.as_str().map(ToOwned::to_owned))
 .collect()
 })
 .unwrap_or_else(|| default_dimension_fields.to_vec());
 let kpi_fields: Vec<String> = payload
 .get("kpi_fields")
 .and_then(Value::as_array)
 .map(|items| {
 items
 .iter()
 .filter_map(|item| item.as_str().map(ToOwned::to_owned))
 .collect()
 })
 .unwrap_or_else(|| default_kpi_fields.to_vec());
 let dimension_fields = sanitize_field_list(&dimension_fields, "dimension")?;
 let kpi_fields = sanitize_field_list(&kpi_fields, "kpi")?;
 let tolerance_pct = payload
 .get("tolerance_pct")
 .and_then(Value::as_f64)
 .unwrap_or(10.0);
 let tolerance_pct = validate_tolerance(tolerance_pct, "tolerance_pct")?;
 let (
 tolerance_relaxed,
 tolerance_normal,
 tolerance_strict,
 active_tolerance,
 effective_tolerance,
 ) = tolerance_bundle_from_payload(payload, tolerance_pct);
 validate_tolerance(tolerance_relaxed, "tolerance_relaxed")?;
 validate_tolerance(tolerance_normal, "tolerance_normal")?;
 validate_tolerance(tolerance_strict, "tolerance_strict")?;
 let active_tolerance = normalize_active_tolerance(&active_tolerance);
 let confirmed = payload
 .get("confirmed")
 .and_then(Value::as_bool)
 .unwrap_or(true);
 let rows_path = payload
 .get("rows_path")
 .and_then(Value::as_str)
 .map(ToOwned::to_owned);
 let time_end_field = payload
 .get("time_end_field")
 .and_then(Value::as_str)
 .map(ToOwned::to_owned);
 let time_profile = payload
 .get("time_profile")
 .and_then(Value::as_str)
 .unwrap_or("auto")
 .to_string();
 let time_extraction_rule = payload
 .get("time_extraction_rule")
 .and_then(Value::as_str)
 .unwrap_or("single")
 .to_string();
 let time_format = payload
 .get("time_format")
 .and_then(Value::as_str)
 .map(ToOwned::to_owned);
 let time_field = payload
 .get("time_field")
 .and_then(Value::as_str)
 .map(ToOwned::to_owned);
 let time_granularity = payload
 .get("time_granularity")
 .and_then(Value::as_str)
 .unwrap_or("minute")
 .to_string();

 conn.execute(
 "
 INSERT OR REPLACE INTO jin_config (
 endpoint_path, dimension_overrides, kpi_overrides,
 tolerance_relaxed, tolerance_normal, tolerance_strict, active_tolerance,
 tolerance_pct, confirmed, rows_path, time_end_field, time_profile,
 time_extraction_rule, time_format, time_field, time_granularity, updated_at
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
 ",
 params![
 endpoint_path,
 serde_json::to_string(&dimension_fields).map_err(|err| err.to_string())?,
 serde_json::to_string(&kpi_fields).map_err(|err| err.to_string())?,
 tolerance_relaxed,
 tolerance_normal,
 tolerance_strict,
 active_tolerance,
 effective_tolerance,
 confirmed,
 rows_path.as_deref(),
 time_end_field.as_deref(),
 &time_profile,
 &time_extraction_rule,
 time_format.as_deref(),
 time_field.as_deref(),
 &time_granularity,
 ],
 )
 .map_err(|err| err.to_string())?;

 let dimension_fields_json =
 serde_json::to_string(&dimension_fields).map_err(|err| err.to_string())?;
 let kpi_fields_json = serde_json::to_string(&kpi_fields).map_err(|err| err.to_string())?;
 upsert_endpoint_record(
    conn,
    endpoint_path,
    http_method,
    &dimension_fields_json,
    &kpi_fields_json,
    "ui",
    None,
 )?;

 let references = payload
 .get("references")
 .and_then(Value::as_array)
 .cloned()
 .unwrap_or_default();
 let imported =
 save_reference_items(conn, endpoint_path, &references, effective_tolerance, "ui")?;

 serde_json::to_string(&json!({
 "ok": true,
 "count": imported,
 "dimension_fields": dimension_fields,
 "kpi_fields": kpi_fields,
 "tolerance_pct": effective_tolerance,
 "tolerance_relaxed": tolerance_relaxed,
 "tolerance_normal": tolerance_normal,
 "tolerance_strict": tolerance_strict,
 "active_tolerance": active_tolerance,
 "confirmed": confirmed,
 "rows_path": rows_path,
 "time_end_field": time_end_field,
 "time_profile": time_profile,
 "time_extraction_rule": time_extraction_rule,
 "time_format": time_format,
 "time_field": time_field,
 "time_granularity": time_granularity,
 }))
 .map_err(|err| err.to_string())
}

pub fn save_reference_items(
 conn: &Connection,
 endpoint_path: &str,
 references: &[Value],
 default_tolerance_pct: f64,
 upload_source: &str,
) -> Result<i64, String> {
    init_schema(conn).map_err(|err| err.to_string())?;
 validate_endpoint_path(endpoint_path)?;
 let mut imported = 0_i64;
 for item in references {
 let grain_key = item
 .get("grain_key")
 .and_then(Value::as_str)
 .ok_or_else(|| "reference item grain_key must be a string".to_string())?;
 if !grain_key.starts_with(endpoint_path) {
 return Err("reference item grain_key must belong to the target endpoint".to_string());
 }
 let kpi_field = item
 .get("kpi_field")
 .and_then(Value::as_str)
 .ok_or_else(|| "reference item kpi_field must be a string".to_string())?;
 if kpi_field.trim().is_empty() {
 return Err("reference item kpi_field must be non-empty".to_string());
 }
 let expected_value = item
 .get("expected_value")
 .and_then(Value::as_f64)
 .ok_or_else(|| "reference item expected_value must be numeric".to_string())?;
 if !expected_value.is_finite() {
 return Err("reference item expected_value must be finite".to_string());
 }
 let tolerance_pct = item
 .get("tolerance_pct")
 .and_then(Value::as_f64)
 .unwrap_or(default_tolerance_pct);
 let tolerance_pct = validate_tolerance(tolerance_pct, "reference item tolerance_pct")?;

 conn.execute(
 "DELETE FROM jin_reference WHERE endpoint_path = ? AND grain_key = ? AND kpi_field = ?",
 params![endpoint_path, grain_key, kpi_field],
 )
 .map_err(|err| err.to_string())?;
 let next = next_id(conn, "jin_reference").map_err(|err| err.to_string())?;
 conn.execute(
 "
 INSERT INTO jin_reference (
 id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 ",
 params![next, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source],
 )
 .map_err(|err| err.to_string())?;
 imported += 1;
 }
 Ok(imported)
}

pub fn save_references(
 conn: &Connection,
 endpoint_path: &str,
 payload: &Value,
 upload_source: &str,
) -> Result<String, String> {
    init_schema(conn).map_err(|err| err.to_string())?;
 validate_endpoint_path(endpoint_path)?;
 let references = payload
 .get("references")
 .and_then(Value::as_array)
 .cloned()
 .unwrap_or_default();
 let imported = save_reference_items(conn, endpoint_path, &references, 10.0, upload_source)?;
 serde_json::to_string(&json!({
 "ok": true,
 "count": imported,
 }))
 .map_err(|err| err.to_string())
}

pub fn resolve_endpoint_config(
 conn: &Connection,
 endpoint_path: &str,
 default_dimension_fields: &[String],
 default_kpi_fields: &[String],
 default_tolerance_pct: f64,
 watch_threshold: Option<f64>,
 extra_overrides: &Value,
) -> Result<String, String> {
    init_schema(conn).map_err(|err| err.to_string())?;
 validate_endpoint_path(endpoint_path)?;
 let row = conn
 .prepare(
 "
 SELECT dimension_overrides, kpi_overrides, tolerance_pct, confirmed
 , tolerance_relaxed, tolerance_normal, tolerance_strict, active_tolerance
 , rows_path, time_end_field, time_profile, time_extraction_rule, time_format
 , time_field, time_granularity
 FROM jin_config
 WHERE endpoint_path = ?
 ",
 )
 .map_err(|err| err.to_string())?
 .query_row(params![endpoint_path], |row| {
 Ok((
 row.get::<usize, Option<String>>(0)?,
 row.get::<usize, Option<String>>(1)?,
 row.get::<usize, Option<f64>>(2)?,
 row.get::<usize, Option<bool>>(3)?,
 row.get::<usize, Option<f64>>(4)?,
 row.get::<usize, Option<f64>>(5)?,
 row.get::<usize, Option<f64>>(6)?,
 row.get::<usize, Option<String>>(7)?,
 row.get::<usize, Option<String>>(8)?,
 row.get::<usize, Option<String>>(9)?,
 row.get::<usize, Option<String>>(10)?,
 row.get::<usize, Option<String>>(11)?,
 row.get::<usize, Option<String>>(12)?,
 row.get::<usize, Option<String>>(13)?,
 row.get::<usize, Option<String>>(14)?,
 ))
 })
 .optional()
 .map_err(|err| err.to_string())?;

 let mut dimension_fields = default_dimension_fields.to_vec();
 let mut kpi_fields = default_kpi_fields.to_vec();
 let mut tolerance_pct = default_tolerance_pct;
 let mut tolerance_relaxed = 20.0;
 let mut tolerance_normal = default_tolerance_pct;
 let mut tolerance_strict = 5.0;
 let mut active_tolerance = "normal".to_string();
 let mut confirmed = false;
 let mut rows_path: Option<String> = None;
 let mut time_end_field: Option<String> = None;
 let mut time_profile = "auto".to_string();
 let mut time_extraction_rule = "single".to_string();
 let mut time_format: Option<String> = None;
 let mut time_field = None;
 let mut time_granularity = "minute".to_string();

 if let Some((
 db_dims,
 db_kpis,
 db_tolerance,
 db_confirmed,
 db_relaxed,
 db_normal,
 db_strict,
 db_active,
 db_rows_path,
 db_time_end_field,
 db_time_profile,
 db_time_extraction_rule,
 db_time_format,
 db_time,
 db_granule,
 )) = row
 {
 if let Some(items) = db_dims {
 dimension_fields =
 serde_json::from_str(&items).unwrap_or_else(|_| default_dimension_fields.to_vec());
 }
 if let Some(items) = db_kpis {
 kpi_fields =
 serde_json::from_str(&items).unwrap_or_else(|_| default_kpi_fields.to_vec());
 }
 if let Some(value) = db_relaxed {
 tolerance_relaxed = value;
 }
 if let Some(value) = db_normal {
 tolerance_normal = value;
 }
 if let Some(value) = db_strict {
 tolerance_strict = value;
 }
 if let Some(value) = db_active {
 active_tolerance = normalize_active_tolerance(&value);
 }
 if let Some(value) = db_tolerance {
 tolerance_pct = value;
 } else {
 tolerance_pct = tolerance_from_mode(
 tolerance_relaxed,
 tolerance_normal,
 tolerance_strict,
 &active_tolerance,
 tolerance_normal,
 );
 }
 if let Some(value) = db_confirmed {
 confirmed = value;
 }
 if let Some(value) = db_rows_path {
 rows_path = Some(value);
 }
 if let Some(value) = db_time_end_field {
 time_end_field = Some(value);
 }
 if let Some(value) = db_time_profile {
 time_profile = value;
 }
 if let Some(value) = db_time_extraction_rule {
 // Keep the existing normalized default if the DB column is empty.
 if !value.trim().is_empty() {
 time_extraction_rule = value;
 }
 }
 if let Some(value) = db_time_format {
 time_format = Some(value);
 }
 if let Some(value) = db_time {
 time_field = Some(value);
 }
 if let Some(value) = db_granule {
 time_granularity = value;
 }
 }

 if let Some(value) = watch_threshold {
 tolerance_pct = value;
 tolerance_normal = value;
 active_tolerance = "normal".to_string();
 }

 if let Some(items) = extra_overrides
 .get("dimension_fields")
 .and_then(Value::as_array)
 {
 dimension_fields = items
 .iter()
 .filter_map(|item| item.as_str().map(ToOwned::to_owned))
 .collect();
 }
 if let Some(items) = extra_overrides.get("kpi_fields").and_then(Value::as_array) {
 kpi_fields = items
 .iter()
 .filter_map(|item| item.as_str().map(ToOwned::to_owned))
 .collect();
 }
 if let Some(value) = extra_overrides.get("tolerance_pct").and_then(Value::as_f64) {
 tolerance_pct = value;
 tolerance_normal = value;
 }
 if let Some(value) = extra_overrides
 .get("tolerance_relaxed")
 .and_then(Value::as_f64)
 {
 tolerance_relaxed = value;
 }
 if let Some(value) = extra_overrides
 .get("tolerance_normal")
 .and_then(Value::as_f64)
 {
 tolerance_normal = value;
 tolerance_pct = value;
 }
 if let Some(value) = extra_overrides
 .get("tolerance_strict")
 .and_then(Value::as_f64)
 {
 tolerance_strict = value;
 }
 if let Some(value) = extra_overrides
 .get("active_tolerance")
 .and_then(Value::as_str)
 {
 active_tolerance = normalize_active_tolerance(value);
 tolerance_pct = tolerance_from_mode(
 tolerance_relaxed,
 tolerance_normal,
 tolerance_strict,
 &active_tolerance,
 tolerance_pct,
 );
 }
 if let Some(value) = extra_overrides.get("confirmed").and_then(Value::as_bool) {
 confirmed = value;
 }
 if let Some(value) = extra_overrides.get("rows_path").and_then(Value::as_str) {
 rows_path = Some(value.to_string());
 }
 if let Some(value) = extra_overrides
 .get("time_end_field")
 .and_then(Value::as_str)
 {
 time_end_field = Some(value.to_string());
 }
 if let Some(value) = extra_overrides.get("time_profile").and_then(Value::as_str) {
 time_profile = value.to_string();
 }
 if let Some(value) = extra_overrides
 .get("time_extraction_rule")
 .and_then(Value::as_str)
 {
 if !value.trim().is_empty() {
 time_extraction_rule = value.to_string();
 }
 }
 if let Some(value) = extra_overrides.get("time_format").and_then(Value::as_str) {
 time_format = Some(value.to_string());
 }
 if let Some(value) = extra_overrides.get("time_field").and_then(Value::as_str) {
 time_field = Some(value.to_string());
 }
 if let Some(value) = extra_overrides
 .get("time_granularity")
 .and_then(Value::as_str)
 {
 time_granularity = value.to_string();
 }
 let kpi_weights = extra_overrides
 .get("kpi_weights")
 .cloned()
 .unwrap_or(json!({}));
 let currency = extra_overrides
 .get("currency")
 .and_then(Value::as_str)
 .unwrap_or("$")
 .to_string();

 serde_json::to_string(&json!({
 "dimension_fields": dimension_fields,
 "kpi_fields": kpi_fields,
 "tolerance_pct": tolerance_pct,
 "tolerance_relaxed": tolerance_relaxed,
 "tolerance_normal": tolerance_normal,
 "tolerance_strict": tolerance_strict,
 "active_tolerance": active_tolerance,
 "confirmed": confirmed,
 "rows_path": rows_path,
 "time_end_field": time_end_field,
 "time_profile": time_profile,
 "time_extraction_rule": time_extraction_rule,
 "time_format": time_format,
 "time_field": time_field,
 "time_granularity": time_granularity,
 "kpi_weights": kpi_weights,
 "currency": currency,
 }))
 .map_err(|err| err.to_string())
}

pub fn load_saved_endpoint_config(
 conn: &Connection,
 endpoint_path: &str,
) -> Result<String, String> {
    init_schema(conn).map_err(|err| err.to_string())?;
 validate_endpoint_path(endpoint_path)?;
 let row = conn
 .prepare(
 "
 SELECT dimension_overrides, kpi_overrides, tolerance_pct, confirmed
 , tolerance_relaxed, tolerance_normal, tolerance_strict, active_tolerance
 , rows_path, time_end_field, time_profile, time_extraction_rule, time_format
 , time_field, time_granularity
 FROM jin_config
 WHERE endpoint_path = ?
 ",
 )
 .map_err(|err| err.to_string())?
 .query_row(params![endpoint_path], |row| {
 Ok(json!({
 "dimension_fields": parse_json_or_default(&row.get::<usize, Option<String>>(0)?.unwrap_or_default(), json!(null)),
 "kpi_fields": parse_json_or_default(&row.get::<usize, Option<String>>(1)?.unwrap_or_default(), json!(null)),
 "tolerance_pct": row.get::<usize, Option<f64>>(2)?,
 "confirmed": row.get::<usize, Option<bool>>(3)?,
 "tolerance_relaxed": row.get::<usize, Option<f64>>(4)?,
 "tolerance_normal": row.get::<usize, Option<f64>>(5)?,
 "tolerance_strict": row.get::<usize, Option<f64>>(6)?,
 "active_tolerance": row.get::<usize, Option<String>>(7)?,
 "rows_path": row.get::<usize, Option<String>>(8)?,
 "time_end_field": row.get::<usize, Option<String>>(9)?,
 "time_profile": row.get::<usize, Option<String>>(10)?.unwrap_or_else(|| "auto".to_string()),
 "time_extraction_rule": row.get::<usize, Option<String>>(11)?.unwrap_or_else(|| "single".to_string()),
 "time_format": row.get::<usize, Option<String>>(12)?,
 "time_field": row.get::<usize, Option<String>>(13)?,
 "time_granularity": row.get::<usize, Option<String>>(14)?,
 }))
 })
 .optional()
 .map_err(|err| err.to_string())?
 .unwrap_or(json!({}));
 serde_json::to_string(&row).map_err(|err| err.to_string())
}

#[cfg(test)]
mod internal_tests {
 use super::{
 anomaly_confidence_value, anomaly_explanation, anomaly_severity_label,
 config_source_priority, init_schema, merge_config_source, next_id,
 normalize_active_tolerance, parse_json_or_default, read_kpi_history,
 read_kpi_history_window, sanitize_field_list, tolerance_bundle_from_payload,
 tolerance_from_mode, trend_summary, validate_endpoint_path, validate_tolerance,
 };
 use crate::core::types::AnomalyResult;
 use duckdb::{params, Connection};
 use serde_json::json;

 #[test]
 fn validation_helpers_cover_success_and_error_cases() {
 assert!(validate_endpoint_path("/api/demo").is_ok());
 assert!(validate_endpoint_path("api/demo").is_err());
 assert!(validate_endpoint_path("").is_err());

 assert_eq!(
 sanitize_field_list(
 &["retailer".to_string(), "retailer".to_string()],
 "dimension"
 )
 .expect("sanitized"),
 vec!["retailer".to_string()]
 );
 assert!(sanitize_field_list(&["".to_string()], "dimension").is_err());

 assert_eq!(validate_tolerance(10.0, "tol").expect("tolerance"), 10.0);
 assert!(validate_tolerance(-1.0, "tol").is_err());
 assert!(validate_tolerance(f64::INFINITY, "tol").is_err());
 }

 #[test]
 fn tolerance_helpers_cover_modes_and_payload_defaults() {
 assert_eq!(normalize_active_tolerance("relaxed"), "relaxed");
 assert_eq!(normalize_active_tolerance("weird"), "normal");

 assert_eq!(tolerance_from_mode(20.0, 10.0, 5.0, "relaxed", 7.0), 20.0);
 assert_eq!(tolerance_from_mode(20.0, 10.0, 5.0, "strict", 7.0), 5.0);
 assert_eq!(tolerance_from_mode(20.0, 10.0, 5.0, "normal", 7.0), 10.0);
 assert_eq!(tolerance_from_mode(20.0, 10.0, 5.0, "unknown", 7.0), 7.0);

 let bundle = tolerance_bundle_from_payload(
 &json!({
 "tolerance_relaxed": 22.0,
 "tolerance_normal": 11.0,
 "tolerance_strict": 4.0,
 "active_tolerance": "strict"
 }),
 10.0,
 );
 assert_eq!(bundle, (22.0, 11.0, 4.0, "strict".to_string(), 4.0));

 let fallback_bundle = tolerance_bundle_from_payload(&json!({}), 13.0);
 assert_eq!(
 fallback_bundle,
 (20.0, 13.0, 5.0, "normal".to_string(), 13.0)
 );
 }

 #[test]
 fn anomaly_explanation_is_human_readable() {
 let explanation = anomaly_explanation(&AnomalyResult {
 kpi_field: "value".to_string(),
 actual: 145.0,
 expected: 100.0,
 pct_change: 45.0,
 method: "reference".to_string(),
 severity: "high".to_string(),
 priority: "P1".to_string(),
 correlated_with: vec![],
 confidence: 0.95,
 impact: 0.0,
 });

 assert!(explanation.contains("Reconciliation mismatch"));
 assert!(explanation.contains("value"));
 assert!(explanation.contains("45.00%"));
 assert!(explanation.contains("high severity"));
 }

 #[test]
 fn payload_helpers_cover_defaults_and_zero_baselines() {
 assert_eq!(
 parse_json_or_default("{bad", json!({"fallback": true})),
 json!({"fallback": true})
 );
 assert_eq!(anomaly_severity_label(12.0), "low");
 assert_eq!(anomaly_confidence_value("unknown"), 0.5);

 let summary = trend_summary(
 &[
 json!({"kpi_json": {"value": 5.0}}),
 json!({"kpi_json": {"value": 0.0}}),
 ],
 &["value".to_string(), "missing".to_string()],
 );
 assert_eq!(
 summary,
 json!([{
 "kpi_field": "value",
 "latest": 5.0,
 "min": 0.0,
 "max": 5.0,
 "samples": 2,
 "delta_pct": 0.0
 }])
 );
 }

 #[test]
 fn config_source_helpers_preserve_highest_priority() {
 assert!(config_source_priority("upload") > config_source_priority("ui"));
 assert!(config_source_priority("ui") > config_source_priority("confirmed"));
 assert_eq!(config_source_priority("unknown"), 0);
 assert_eq!(merge_config_source(Some("upload"), "auto"), "upload");
 assert_eq!(merge_config_source(Some("auto"), "ui"), "ui");
 assert_eq!(merge_config_source(None, "confirmed"), "confirmed");
 }

 #[test]
 fn next_id_counter_advances_from_existing_rows() {
 let conn = Connection::open_in_memory().expect("open in-memory db");
 init_schema(&conn).expect("init schema");
 conn.execute(
 "
 INSERT INTO jin_reference (id, endpoint_path, grain_key, kpi_field, expected_value)
 VALUES (41, '/api/revenue', '/api/revenue|retailer=acme', 'value', 100.0)
 ",
 [],
 )
 .expect("seed reference row");

 let first = next_id(&conn, "jin_reference").expect("first next id");
 let second = next_id(&conn, "jin_reference").expect("second next id");
 assert_eq!(first, 42);
 assert_eq!(second, 43);
 }

 #[test]
 fn read_kpi_history_window_returns_latest_values_in_time_order() {
 let conn = Connection::open_in_memory().expect("open in-memory db");
 init_schema(&conn).expect("init schema");
 for (id, observed_at, value) in [
 (1_i64, "2025-01-01 00:00:01", 1.0_f64),
 (2_i64, "2025-01-01 00:00:02", 2.0_f64),
 (3_i64, "2025-01-01 00:00:03", 3.0_f64),
 ] {
 conn.execute(
 "
 INSERT INTO jin_observations (
 id, endpoint_path, grain_key, dimension_json, kpi_json, observed_at, source
 )
 VALUES (?, '/api/revenue', '/api/revenue|retailer=acme', '{}', ?, CAST(? AS TIMESTAMP), 'live')
 ",
 params![id, format!("{{\"value\":{value}}}"), observed_at],
 )
 .expect("insert observation");
 }

 let latest_two = read_kpi_history_window(&conn, "/api/revenue|retailer=acme", "value", 2)
 .expect("latest two");
 assert_eq!(latest_two, vec![2.0, 3.0]);

 let full =
 read_kpi_history(&conn, "/api/revenue|retailer=acme", "value").expect("full history");
 assert_eq!(full, vec![1.0, 2.0, 3.0]);
 }
}
