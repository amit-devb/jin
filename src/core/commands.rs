use crate::core::storage::{init_schema, next_id, upsert_endpoint_record};
use duckdb::{Connection, OptionalExt};
use serde_json::{json, Value};
use std::path::Path;

fn env_str(env: &Value, key: &str) -> String {
    env.get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

fn env_bool(env: &Value, key: &str) -> bool {
    matches!(
        env.get(key).and_then(Value::as_str),
        Some("1" | "true" | "yes" | "on" | "TRUE" | "True" | "YES" | "Yes" | "ON" | "On")
    )
}

pub fn auth_status_json(env_json: &str) -> Result<String, String> {
    let env: Value = serde_json::from_str(env_json).map_err(|err| err.to_string())?;
    let auth_enabled = env_bool(&env, "JIN_AUTH_ENABLED");
    let username = env_str(&env, "JIN_USERNAME");
    let password = env_str(&env, "JIN_PASSWORD");
    let password_hash = env_str(&env, "JIN_PASSWORD_HASH");
    let session_secret = env_str(&env, "JIN_SESSION_SECRET");
    let ttl = env_str(&env, "JIN_SESSION_TTL_MINUTES")
        .parse::<i64>()
        .unwrap_or(480);

    let mut warnings = Vec::new();
    if auth_enabled && username.is_empty() {
        warnings.push("JIN_USERNAME is missing.".to_string());
    }
    if auth_enabled && password.is_empty() && password_hash.is_empty() {
        warnings.push("Set JIN_PASSWORD_HASH or JIN_PASSWORD.".to_string());
    }
    if auth_enabled && !password.is_empty() {
        warnings.push("Plaintext JIN_PASSWORD is set. Prefer JIN_PASSWORD_HASH.".to_string());
    }
    if auth_enabled
        && username == "operator"
        && (password == "change-me" || password_hash.is_empty())
    {
        warnings.push("Default login is still in use.".to_string());
    }
    if auth_enabled && session_secret.is_empty() {
        warnings.push("JIN_SESSION_SECRET is missing.".to_string());
    }

    serde_json::to_string(&json!({
        "auth_enabled": auth_enabled,
        "username": if username.is_empty() { Value::Null } else { json!(username) },
        "password_hash": !password_hash.is_empty(),
        "plaintext_password": !password.is_empty(),
        "session_secret": !session_secret.is_empty(),
        "session_ttl_minutes": ttl,
        "warnings": warnings,
        "ready": warnings.is_empty(),
    }))
    .map_err(|err| err.to_string())
}

pub fn env_check_json(
    env_json: &str,
    env_file: &str,
    db_path: &str,
    project_name: &str,
) -> Result<String, String> {
    let auth_payload: Value =
        serde_json::from_str(&auth_status_json(env_json)?).map_err(|err| err.to_string())?;
    let mut warnings = auth_payload
        .get("warnings")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    if !Path::new(env_file).exists() {
        warnings.insert(0, json!(format!("{env_file} does not exist yet.")));
    }
    if !Path::new(db_path).exists() {
        warnings.push(json!(format!(
            "DuckDB file does not exist yet at {db_path}."
        )));
    }

    serde_json::to_string(&json!({
        "env_file": env_file,
        "env_exists": Path::new(env_file).exists(),
        "project_name": project_name,
        "db_path": db_path,
        "db_exists": Path::new(db_path).exists(),
        "auth_enabled": auth_payload["auth_enabled"],
        "username": auth_payload["username"],
        "password_hash": auth_payload["password_hash"],
        "session_secret": auth_payload["session_secret"],
        "warnings": warnings,
        "ready": warnings.is_empty(),
    }))
    .map_err(|err| err.to_string())
}

pub fn urls_json(host: &str, port: i64, scheme: &str) -> Result<String, String> {
    let base = format!("{scheme}://{host}:{port}");
    serde_json::to_string(&json!({
        "app_root": format!("{base}/"),
        "jin_console": format!("{base}/jin"),
        "jin_login": format!("{base}/jin/login"),
        "example_revenue": format!("{base}/api/revenue/amazon/YTD"),
        "example_inventory": format!("{base}/api/inventory/amazon"),
    }))
    .map_err(|err| err.to_string())
}

pub fn project_status_json(
    db_path: &str,
    env_json: &str,
    env_file: &str,
    project_name: &str,
    watch_count: i64,
) -> Result<String, String> {
    let auth_payload: Value =
        serde_json::from_str(&auth_status_json(env_json)?).map_err(|err| err.to_string())?;
    let env_payload: Value =
        serde_json::from_str(&env_check_json(env_json, env_file, db_path, project_name)?)
            .map_err(|err| err.to_string())?;
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    init_schema(&conn).map_err(|err| err.to_string())?;

    let endpoint_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM jin_endpoints", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;
    let issue_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM jin_anomalies WHERE is_active = true",
            [],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    let reference_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM jin_reference", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;

    serde_json::to_string(&json!({
        "project_name": project_name,
        "env": env_payload,
        "auth": auth_payload,
        "metrics": {
            "endpoints": endpoint_count,
            "active_issues": issue_count,
            "references": reference_count,
            "watches": watch_count,
        },
    }))
    .map_err(|err| err.to_string())
}

pub fn report_summary_json(db_path: &str, project_name: &str) -> Result<String, String> {
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    init_schema(&conn).map_err(|err| err.to_string())?;
    let endpoint_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM jin_endpoints", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;
    let issue_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM jin_anomalies WHERE is_active = true",
            [],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    let reference_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM jin_reference", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;
    let config_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM jin_config", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;
    let mut issue_stmt = conn
        .prepare(
            "
            SELECT endpoint_path, kpi_field, actual_value, expected_value, detected_at
            FROM jin_anomalies
            WHERE is_active = true
            ORDER BY detected_at DESC
            LIMIT 1
            ",
        )
        .map_err(|err| err.to_string())?;
    let recent_issue = issue_stmt
        .query_row([], |row| {
            Ok(json!({
                "endpoint": row.get::<_, Option<String>>(0)?,
                "kpi": row.get::<_, Option<String>>(1)?,
                "actual": row.get::<_, Option<f64>>(2)?,
                "expected": row.get::<_, Option<f64>>(3)?,
                "detected_at": row.get::<_, Option<String>>(4)?,
            }))
        })
        .ok();

    serde_json::to_string(&json!({
        "project_name": project_name,
        "endpoints": endpoint_count,
        "active_issues": issue_count,
        "references": reference_count,
        "configs": config_count,
        "recent_issue": recent_issue,
    }))
    .map_err(|err| err.to_string())
}

pub fn doctor_core_json(
    db_path: &str,
    env_json: &str,
    env_file: &str,
    project_name: &str,
) -> Result<String, String> {
    let env_payload: Value =
        serde_json::from_str(&env_check_json(env_json, env_file, db_path, project_name)?)
            .map_err(|err| err.to_string())?;
    let auth_payload: Value =
        serde_json::from_str(&auth_status_json(env_json)?).map_err(|err| err.to_string())?;
    let mut checks = serde_json::Map::new();
    checks.insert("python".to_string(), json!("ok"));
    checks.insert("project".to_string(), json!(project_name));
    checks.insert("env_file".to_string(), json!(env_file));
    checks.insert(
        "env_exists".to_string(),
        json!(if Path::new(env_file).exists() {
            "yes"
        } else {
            "no"
        }),
    );
    checks.insert("db_path".to_string(), json!(db_path));
    checks.insert(
        "db_exists".to_string(),
        json!(if Path::new(db_path).exists() {
            "yes"
        } else {
            "no"
        }),
    );
    checks.insert(
        "auth_enabled".to_string(),
        json!(if env_bool(
            &serde_json::from_str(env_json).map_err(|err| err.to_string())?,
            "JIN_AUTH_ENABLED"
        ) {
            "true"
        } else {
            "false"
        }),
    );
    checks.insert(
        "password_hash".to_string(),
        json!(if env_str(
            &serde_json::from_str(env_json).map_err(|err| err.to_string())?,
            "JIN_PASSWORD_HASH"
        )
        .is_empty()
        {
            "no"
        } else {
            "yes"
        }),
    );
    checks.insert(
        "session_secret".to_string(),
        json!(if env_str(
            &serde_json::from_str(env_json).map_err(|err| err.to_string())?,
            "JIN_SESSION_SECRET"
        )
        .is_empty()
        {
            "no"
        } else {
            "yes"
        }),
    );
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    match init_schema(&conn) {
        Ok(_) => checks.insert("duckdb_schema".to_string(), json!("ok")),
        Err(err) => checks.insert("duckdb_schema".to_string(), json!(format!("error: {err}"))),
    };
    checks.insert("native_extension".to_string(), json!("ok"));
    serde_json::to_string(&json!({
        "env": env_payload,
        "auth": auth_payload,
        "checks": checks,
    }))
    .map_err(|err| err.to_string())
}

pub fn verify_core_json(db_path: &str, project_name: &str) -> Result<String, String> {
    let summary: Value = serde_json::from_str(&report_summary_json(db_path, project_name)?)
        .map_err(|err| err.to_string())?;
    serde_json::to_string(&json!({
        "metrics": {
            "endpoints": summary.get("endpoints").and_then(Value::as_i64).unwrap_or(0),
            "configs": summary.get("configs").and_then(Value::as_i64).unwrap_or(0),
            "references": summary.get("references").and_then(Value::as_i64).unwrap_or(0),
            "active_issues": summary.get("active_issues").and_then(Value::as_i64).unwrap_or(0),
        }
    }))
    .map_err(|err| err.to_string())
}

pub fn sync_registry_json(db_path: &str, records_json: &str) -> Result<String, String> {
    let records: Value = serde_json::from_str(records_json).map_err(|err| err.to_string())?;
    let items = records
        .as_array()
        .ok_or_else(|| "records_json must be a JSON array".to_string())?;
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    init_schema(&conn).map_err(|err| err.to_string())?;

    for item in items {
        let endpoint_path = item
            .get("endpoint_path")
            .and_then(Value::as_str)
            .ok_or_else(|| "record.endpoint_path must be a string".to_string())?;
        let http_method = item
            .get("http_method")
            .and_then(Value::as_str)
            .unwrap_or("GET");
        let dimension_fields = item
            .get("dimension_fields")
            .cloned()
            .unwrap_or_else(|| json!([]));
        let kpi_fields = item.get("kpi_fields").cloned().unwrap_or_else(|| json!([]));
        let schema_contract = item
            .get("schema_contract")
            .cloned()
            .unwrap_or_else(|| json!({}));
        let dimension_fields_json =
            serde_json::to_string(&dimension_fields).map_err(|err| err.to_string())?;
        let kpi_fields_json = serde_json::to_string(&kpi_fields).map_err(|err| err.to_string())?;
        let schema_json = serde_json::to_string(&schema_contract).map_err(|err| err.to_string())?;
        upsert_endpoint_record(
            &conn,
            endpoint_path,
            http_method,
            &dimension_fields_json,
            &kpi_fields_json,
            "auto",
            Some(&schema_json),
        )?;
    }

    serde_json::to_string(&json!({
        "ok": true,
        "count": items.len(),
    }))
    .map_err(|err| err.to_string())
}

pub fn references_export_json(db_path: &str, endpoint_path: &str) -> Result<String, String> {
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    init_schema(&conn).map_err(|err| err.to_string())?;
    let mut stmt = conn
        .prepare(
            "
            SELECT grain_key, kpi_field, expected_value, tolerance_pct, upload_source, CAST(uploaded_at AS VARCHAR)
            FROM jin_reference
            WHERE endpoint_path = ?
            ORDER BY uploaded_at DESC
            ",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([endpoint_path], |row| {
            Ok(json!({
                "grain_key": row.get::<usize, String>(0)?,
                "kpi_field": row.get::<usize, String>(1)?,
                "expected_value": row.get::<usize, Option<f64>>(2)?,
                "tolerance_pct": row.get::<usize, Option<f64>>(3)?,
                "upload_source": row.get::<usize, Option<String>>(4)?,
                "uploaded_at": row.get::<usize, Option<String>>(5)?,
            }))
        })
        .map_err(|err| err.to_string())?;
    let mut payload = Vec::new();
    for row in rows {
        payload.push(row.map_err(|err| err.to_string())?);
    }
    serde_json::to_string(&Value::Array(payload)).map_err(|err| err.to_string())
}

pub fn endpoint_operational_metadata_json(
    db_path: &str,
    endpoint_path: &str,
) -> Result<String, String> {
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    init_schema(&conn).map_err(|err| err.to_string())?;

    let last_upload: Option<String> = conn
        .query_row(
            "SELECT CAST(MAX(uploaded_at) AS VARCHAR) FROM jin_reference WHERE endpoint_path = ?",
            [endpoint_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .flatten();
    let upload_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM jin_reference WHERE endpoint_path = ?",
            [endpoint_path],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    let last_upload_source: Option<String> = conn
        .query_row(
            "
            SELECT upload_source
            FROM jin_reference
            WHERE endpoint_path = ?
            ORDER BY uploaded_at DESC, id DESC
            LIMIT 1
            ",
            [endpoint_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .flatten();
    let config_updated_at: Option<String> = conn
        .query_row(
            "SELECT CAST(updated_at AS VARCHAR) FROM jin_config WHERE endpoint_path = ?",
            [endpoint_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .flatten();
    let (observation_count, last_observed_at): (i64, Option<String>) = conn
        .query_row(
            "SELECT COUNT(*), CAST(MAX(observed_at) AS VARCHAR) FROM jin_observations WHERE endpoint_path = ?",
            [endpoint_path],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|err| err.to_string())?;
    let latest_incident_at: Option<String> = conn
        .query_row(
            "SELECT CAST(MAX(detected_at) AS VARCHAR) FROM jin_anomalies WHERE endpoint_path = ?",
            [endpoint_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .flatten();

    let mut stmt = conn
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
    let rows = stmt
        .query_map([endpoint_path], |row| {
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
    for row in rows {
        recent_uploads.push(row.map_err(|err| err.to_string())?);
    }

    serde_json::to_string(&json!({
        "last_upload_at": last_upload,
        "last_upload_source": last_upload_source,
        "upload_count": upload_count,
        "config_updated_at": config_updated_at,
        "observation_count": observation_count,
        "last_observed_at": last_observed_at,
        "latest_incident_at": latest_incident_at,
        "recent_uploads": recent_uploads,
    }))
    .map_err(|err| err.to_string())
}

pub fn endpoints_list_json(db_path: &str) -> Result<String, String> {
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    init_schema(&conn).map_err(|err| err.to_string())?;
    let mut stmt = conn
        .prepare(
            "
            SELECT endpoint_path, http_method, dimension_fields, kpi_fields, config_source
            FROM jin_endpoints
            ORDER BY endpoint_path, http_method
            ",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let dimension_fields_json: Option<String> = row.get(2)?;
            let kpi_fields_json: Option<String> = row.get(3)?;
            let dimension_fields: Value = dimension_fields_json
                .as_deref()
                .and_then(|raw| serde_json::from_str(raw).ok())
                .unwrap_or_else(|| json!([]));
            let kpi_fields: Value = kpi_fields_json
                .as_deref()
                .and_then(|raw| serde_json::from_str(raw).ok())
                .unwrap_or_else(|| json!([]));
            Ok(json!({
                "method": row.get::<usize, Option<String>>(1)?,
                "endpoint": row.get::<usize, Option<String>>(0)?,
                "dimensions": dimension_fields,
                "kpis": kpi_fields,
                "source": row.get::<usize, Option<String>>(4)?.unwrap_or_else(|| "auto".to_string()),
            }))
        })
        .map_err(|err| err.to_string())?;
    let mut payload = Vec::new();
    for row in rows {
        payload.push(row.map_err(|err| err.to_string())?);
    }
    serde_json::to_string(&Value::Array(payload)).map_err(|err| err.to_string())
}

pub fn config_show_json(db_path: &str, endpoint_path: &str) -> Result<String, String> {
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    init_schema(&conn).map_err(|err| err.to_string())?;

    let endpoint = conn
        .prepare(
            "
            SELECT endpoint_path, http_method, pydantic_schema, dimension_fields, kpi_fields, config_source
            FROM jin_endpoints
            WHERE endpoint_path = ?
            ",
        )
        .map_err(|err| err.to_string())?
        .query_row([endpoint_path], |row| {
            let schema_contract = row
                .get::<usize, Option<String>>(2)?
                .as_deref()
                .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
                .unwrap_or_else(|| json!({}));
            let endpoint_dims = row
                .get::<usize, Option<String>>(3)?
                .as_deref()
                .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
                .unwrap_or_else(|| json!([]));
            let endpoint_kpis = row
                .get::<usize, Option<String>>(4)?
                .as_deref()
                .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
                .unwrap_or_else(|| json!([]));
            Ok(json!({
                "endpoint_path": row.get::<usize, String>(0)?,
                "http_method": row.get::<usize, String>(1)?,
                "schema_contract": schema_contract,
                "dimension_fields": endpoint_dims,
                "kpi_fields": endpoint_kpis,
                "config_source": row.get::<usize, Option<String>>(5)?.unwrap_or_else(|| "auto".to_string()),
            }))
        })
        .optional()
        .map_err(|err| err.to_string())?
        .ok_or_else(|| format!("Endpoint not found: {endpoint_path}"))?;

    let config = conn
        .prepare(
            "
            SELECT dimension_overrides, kpi_overrides, tolerance_relaxed, tolerance_normal, tolerance_strict,
                   active_tolerance, tolerance_pct, confirmed, CAST(updated_at AS VARCHAR)
            FROM jin_config
            WHERE endpoint_path = ?
            ",
        )
        .map_err(|err| err.to_string())?
        .query_row([endpoint_path], |row| {
            Ok(json!({
                "dimension_fields": row
                    .get::<usize, Option<String>>(0)?
                    .as_deref()
                    .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
                    .unwrap_or_else(|| json!([])),
                "kpi_fields": row
                    .get::<usize, Option<String>>(1)?
                    .as_deref()
                    .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
                    .unwrap_or_else(|| json!([])),
                "tolerance_relaxed": row.get::<usize, f64>(2)?,
                "tolerance_normal": row.get::<usize, f64>(3)?,
                "tolerance_strict": row.get::<usize, f64>(4)?,
                "active_tolerance": row.get::<usize, String>(5)?,
                "tolerance_pct": row.get::<usize, f64>(6)?,
                "confirmed": row.get::<usize, bool>(7)?,
                "updated_at": row.get::<usize, Option<String>>(8)?,
            }))
        })
        .optional()
        .map_err(|err| err.to_string())?
        .unwrap_or_else(|| json!({}));

    let endpoint_dims = endpoint
        .get("dimension_fields")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let endpoint_kpis = endpoint
        .get("kpi_fields")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let payload = json!({
        "endpoint_path": endpoint.get("endpoint_path").cloned().unwrap_or_else(|| json!(endpoint_path)),
        "http_method": endpoint.get("http_method").cloned().unwrap_or_else(|| json!("GET")),
        "schema_contract": endpoint.get("schema_contract").cloned().unwrap_or_else(|| json!({})),
        "config_source": endpoint.get("config_source").cloned().unwrap_or_else(|| json!("auto")),
        "config": {
            "dimension_fields": config.get("dimension_fields").cloned().unwrap_or(endpoint_dims),
            "kpi_fields": config.get("kpi_fields").cloned().unwrap_or(endpoint_kpis),
            "tolerance_relaxed": config.get("tolerance_relaxed").cloned().unwrap_or_else(|| json!(20.0)),
            "tolerance_normal": config.get("tolerance_normal").cloned().unwrap_or_else(|| json!(10.0)),
            "tolerance_strict": config.get("tolerance_strict").cloned().unwrap_or_else(|| json!(5.0)),
            "active_tolerance": config.get("active_tolerance").cloned().unwrap_or_else(|| json!("normal")),
            "tolerance_pct": config.get("tolerance_pct").cloned().unwrap_or_else(|| json!(10.0)),
            "confirmed": config.get("confirmed").cloned().unwrap_or_else(|| json!(false)),
            "updated_at": config.get("updated_at").cloned().unwrap_or(Value::Null),
        }
    });
    serde_json::to_string(&payload).map_err(|err| err.to_string())
}

pub fn template_spec_json(db_path: &str, endpoint_path: &str) -> Result<String, String> {
    let config_payload: Value = serde_json::from_str(&config_show_json(db_path, endpoint_path)?)
        .map_err(|err| err.to_string())?;
    let config = config_payload
        .get("config")
        .cloned()
        .unwrap_or_else(|| json!({}));
    serde_json::to_string(&json!({
        "endpoint": endpoint_path,
        "dimension_fields": config.get("dimension_fields").cloned().unwrap_or_else(|| json!([])),
        "kpi_fields": config.get("kpi_fields").cloned().unwrap_or_else(|| json!([])),
    }))
    .map_err(|err| err.to_string())
}

pub fn issues_list_json(
    db_path: &str,
    endpoint: Option<&str>,
    status: Option<&str>,
) -> Result<String, String> {
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    init_schema(&conn).map_err(|err| err.to_string())?;
    let mut query = String::from(
        "
        SELECT a.id, a.endpoint_path, a.grain_key, a.kpi_field, a.actual_value, a.expected_value, a.pct_change,
               a.detection_method, CAST(a.detected_at AS VARCHAR), CAST(a.resolved_at AS VARCHAR), a.is_active,
               a.ai_explanation, s.incident_status, s.note, s.owner, s.resolution_reason
        FROM jin_anomalies a
        LEFT JOIN jin_incident_state s ON s.anomaly_id = a.id
        ",
    );
    let mut clauses = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(endpoint_path) = endpoint {
        clauses.push("a.endpoint_path = ?");
        params.push(endpoint_path.to_string());
    }
    if let Some(status_value) = status {
        if status_value == "resolved" {
            clauses.push("a.is_active = false");
        } else {
            clauses.push("COALESCE(s.incident_status, CASE WHEN a.is_active THEN 'active' ELSE 'resolved' END) = ?");
            params.push(status_value.to_string());
        }
    }
    if !clauses.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&clauses.join(" AND "));
    }
    query.push_str(" ORDER BY a.detected_at DESC");

    let mut stmt = conn.prepare(&query).map_err(|err| err.to_string())?;
    let mut rows = Vec::new();
    match params.len() {
        0 => {
            let payload = stmt
                .query_map([], issue_row_payload)
                .map_err(|err| err.to_string())?;
            for row in payload {
                rows.push(row.map_err(|err| err.to_string())?);
            }
        }
        1 => {
            let payload = stmt
                .query_map([params[0].as_str()], issue_row_payload)
                .map_err(|err| err.to_string())?;
            for row in payload {
                rows.push(row.map_err(|err| err.to_string())?);
            }
        }
        2 => {
            let payload = stmt
                .query_map([params[0].as_str(), params[1].as_str()], issue_row_payload)
                .map_err(|err| err.to_string())?;
            for row in payload {
                rows.push(row.map_err(|err| err.to_string())?);
            }
        }
        _ => return Err("too many issue filters".to_string()),
    }
    serde_json::to_string(&Value::Array(rows)).map_err(|err| err.to_string())
}

fn issue_row_payload(row: &duckdb::Row<'_>) -> Result<Value, duckdb::Error> {
    let is_active = row.get::<usize, bool>(10)?;
    let current_status: Option<String> = row.get(12)?;
    let status = if is_active {
        current_status.unwrap_or_else(|| "active".to_string())
    } else {
        "resolved".to_string()
    };
    Ok(json!({
        "id": row.get::<usize, i64>(0)?,
        "endpoint_path": row.get::<usize, Option<String>>(1)?,
        "grain_key": row.get::<usize, Option<String>>(2)?,
        "kpi_field": row.get::<usize, Option<String>>(3)?,
        "actual_value": row.get::<usize, Option<f64>>(4)?,
        "expected_value": row.get::<usize, Option<f64>>(5)?,
        "pct_change": row.get::<usize, Option<f64>>(6)?,
        "detection_method": row.get::<usize, Option<String>>(7)?,
        "detected_at": row.get::<usize, Option<String>>(8)?,
        "resolved_at": row.get::<usize, Option<String>>(9)?,
        "status": status,
        "ai_explanation": row.get::<usize, Option<String>>(11)?,
        "note": row.get::<usize, Option<String>>(13)?,
        "owner": row.get::<usize, Option<String>>(14)?,
        "resolution_reason": row.get::<usize, Option<String>>(15)?,
    }))
}

pub fn issues_update_json(
    db_path: &str,
    issue_id: i64,
    action: &str,
    note: Option<&str>,
    owner: Option<&str>,
    resolution_reason: Option<&str>,
    until: Option<&str>,
) -> Result<String, String> {
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    init_schema(&conn).map_err(|err| err.to_string())?;
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM jin_anomalies WHERE id = ?",
            [issue_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    if exists == 0 {
        return Err(format!("Issue not found: {issue_id}"));
    }
    if action == "resolved" {
        conn.execute(
            "UPDATE jin_anomalies SET is_active = false, resolved_at = now() WHERE id = ?",
            [issue_id],
        )
        .map_err(|err| err.to_string())?;
    } else {
        conn.execute(
            "
            INSERT OR REPLACE INTO jin_incident_state (
              anomaly_id, incident_status, note, owner, resolution_reason, snoozed_until, suppressed_until, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, now())
            ",
            duckdb::params![
                issue_id,
                action,
                note,
                owner,
                resolution_reason,
                if action == "snoozed" { until } else { None },
                if action == "suppressed" { until } else { None },
            ],
        )
        .map_err(|err| err.to_string())?;
    }
    let event_id = next_id(&conn, "jin_incident_events").map_err(|err| err.to_string())?;
    conn.execute(
        "
        INSERT INTO jin_incident_events (id, anomaly_id, event_type, note, owner, resolution_reason, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ",
        duckdb::params![
            event_id,
            issue_id,
            action,
            note,
            owner,
            resolution_reason,
            "{\"source\":\"cli\"}"
        ],
    )
    .map_err(|err| err.to_string())?;

    serde_json::to_string(&json!({
        "ok": true,
        "id": issue_id,
        "action": action,
        "status": action,
        "note": note,
        "owner": owner,
        "resolution_reason": resolution_reason,
        "until": until,
    }))
    .map_err(|err| err.to_string())
}
