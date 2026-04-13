use crate::core::grain::{build_grain_key, lookup_dimension};
use crate::core::json::{flatten_json, numeric_value};
use crate::core::storage;
use crate::core::storage::{
    active_anomalies_payload, checkpoint, endpoint_detail_payload_with_limits,
    import_reference_rows, init_schema, next_id, read_kpi_history_window, reference_value,
    resolve_anomaly, resolve_endpoint_config, resolve_matching_anomaly, save_endpoint_config,
    save_references, status_payload, upsert_anomaly, upsert_endpoint_record,
};
use crate::core::types::{
    AnomalyResult, ComparisonResult, Config, ProcessResult, ReconciliationSummary, RequestPayload,
};
use duckdb::{params, Connection};
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::OnceLock;

const MIN_MATERIAL_DELTA: f64 = 0.5;
static OBSERVATION_CHECKPOINT_EVERY: OnceLock<u64> = OnceLock::new();
static OBSERVATION_CHECKPOINT_COUNTER: AtomicU64 = AtomicU64::new(0);

fn with_connection<T, F>(db_path: &str, op: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> Result<T, String>,
{
    let conn = Connection::open(db_path).map_err(|err| err.to_string())?;
    op(&conn)
}

fn observation_checkpoint_every() -> u64 {
    *OBSERVATION_CHECKPOINT_EVERY.get_or_init(|| {
        std::env::var("JIN_NATIVE_CHECKPOINT_EVERY")
            .ok()
            .and_then(|raw| raw.parse::<u64>().ok())
            .unwrap_or(0)
    })
}

fn should_checkpoint_observation_with_interval(counter: u64, interval: u64) -> bool {
    interval > 0 && counter % interval == 0
}

fn should_checkpoint_observation(counter: u64) -> bool {
    should_checkpoint_observation_with_interval(counter, observation_checkpoint_every())
}

fn checkpoint_after_observation(conn: &Connection) -> Result<(), String> {
    let counter = OBSERVATION_CHECKPOINT_COUNTER.fetch_add(1, Ordering::Relaxed) + 1;
    if should_checkpoint_observation(counter) {
        checkpoint(conn).map_err(|err| err.to_string())?;
    }
    Ok(())
}

fn pct_delta(actual: f64, expected: f64) -> f64 {
    if expected == 0.0 {
        if actual == 0.0 {
            0.0
        } else {
            100.0 * actual.signum()
        }
    } else {
        ((actual - expected) / expected) * 100.0
    }
}

fn materially_different(actual: f64, expected: f64, tolerance_pct: f64) -> bool {
    let absolute_delta = (actual - expected).abs();
    let scaled_floor = expected.abs() * (tolerance_pct.abs() / 100.0);
    absolute_delta >= scaled_floor.max(MIN_MATERIAL_DELTA)
}

#[cfg(test)]
fn distinct_history_points(history: &[f64]) -> usize {
    let mut distinct = Vec::new();
    for value in history {
        let rounded = (value * 1000.0).round() / 1000.0;
        if !distinct
            .iter()
            .any(|seen: &f64| (*seen - rounded).abs() < f64::EPSILON)
        {
            distinct.push(rounded);
        }
    }
    distinct.len()
}

#[allow(dead_code)]
fn anomaly_priority(method: &str) -> i32 {
    match method {
        "reconciliation" => 4,
        "reference" => 3,
        "statistical" => 2,
        "threshold" => 1,
        _ => 0,
    }
}

fn anomaly_severity(pct_change: f64) -> String {
    let magnitude = pct_change.abs();
    if magnitude >= 75.0 {
        "critical".to_string()
    } else if magnitude >= 30.0 {
        "high".to_string()
    } else if magnitude >= 15.0 {
        "medium".to_string()
    } else {
        "low".to_string()
    }
}

fn anomaly_business_priority(severity: &str) -> String {
    match severity {
        "critical" => "P0".to_string(),
        "high" => "P1".to_string(),
        "medium" => "P2".to_string(),
        _ => "P3".to_string(),
    }
}

fn anomaly_confidence(method: &str, pct_change: f64, tolerance_pct: f64) -> f64 {
    let base = match method {
        "reference" => 0.95,
        "statistical" => 0.88,
        "threshold" => 0.75,
        _ => 0.5,
    };
    let relative = if tolerance_pct <= 0.0 {
        1.0
    } else {
        (pct_change.abs() / tolerance_pct).min(3.0) / 3.0
    };
    ((base + (relative * 0.15)) * 100.0).round() / 100.0
}

#[allow(dead_code)]
fn choose_preferred_anomaly(candidates: &[AnomalyResult]) -> Option<AnomalyResult> {
    candidates.iter().cloned().max_by(|left, right| {
        anomaly_priority(&left.method)
            .cmp(&anomaly_priority(&right.method))
            .then_with(|| left.pct_change.abs().total_cmp(&right.pct_change.abs()))
    })
}

fn effective_tolerance(config: &Config) -> f64 {
    match config.active_tolerance.as_str() {
        "relaxed" => config.tolerance_relaxed,
        "strict" => config.tolerance_strict,
        "normal" => config.tolerance_normal,
        _ => config.tolerance_pct,
    }
}

fn reconciliation_reason(
    kpi_field: &str,
    status: &str,
    actual: f64,
    expected: Option<f64>,
    tolerance_pct: Option<f64>,
    delta_pct: Option<f64>,
) -> String {
    match status {
        "missing_reference" => format!(
            "No uploaded reference was found for KPI '{kpi_field}' at this business grain."
        ),
        "mismatch" => {
            let expected_text = expected
                .map(|value| format!("{value:.4}"))
                .unwrap_or_else(|| "unknown".to_string());
            let pct_text = delta_pct
                .map(|value| format!("{:.2}%", value.abs()))
                .unwrap_or_else(|| "unknown".to_string());
            if let Some(tolerance) = tolerance_pct {
                format!(
                    "KPI '{kpi_field}' mismatch: API returned {actual:.4}, expected {expected_text}. Difference {pct_text} exceeds tolerance +/-{tolerance:.2}%."
                )
            } else {
                format!(
                    "KPI '{kpi_field}' mismatch: API returned {actual:.4}, expected {expected_text}. Difference {pct_text}."
                )
            }
        }
        _ => {
            let expected_text = expected
                .map(|value| format!("{value:.4}"))
                .unwrap_or_else(|| "unknown".to_string());
            if let Some(tolerance) = tolerance_pct {
                format!(
                    "KPI '{kpi_field}' matched: API returned {actual:.4}, expected {expected_text}, within +/-{tolerance:.2}% tolerance."
                )
            } else {
                format!(
                    "KPI '{kpi_field}' matched: API returned {actual:.4}, expected {expected_text}."
                )
            }
        }
    }
}

pub fn init_db(db_path: &str) -> Result<(), String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        Ok(())
    })
}

pub fn process_observation(
    endpoint: &str,
    method: &str,
    request_json: &str,
    response_json: &str,
    config_json: &str,
    db_path: &str,
) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        let request: RequestPayload =
            serde_json::from_str(request_json).map_err(|err| err.to_string())?;
        let response: Value = serde_json::from_str(response_json).map_err(|err| err.to_string())?;
        let config: Config = serde_json::from_str(config_json).map_err(|err| err.to_string())?;
        let result =
            process_observation_value(conn, endpoint, method, &request, response, &config)?;
        serde_json::to_string(&result).map_err(|err| err.to_string())
    })
}

pub fn process_observations(
    endpoint: &str,
    method: &str,
    request_json: &str,
    response_json: &str,
    config_json: &str,
    db_path: &str,
) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        let request: RequestPayload =
            serde_json::from_str(request_json).map_err(|err| err.to_string())?;
        let response: Value = serde_json::from_str(response_json).map_err(|err| err.to_string())?;
        let config: Config = serde_json::from_str(config_json).map_err(|err| err.to_string())?;

        let items = match response {
            Value::Array(values) => values,
            value => vec![value],
        };
        let mut results = Vec::with_capacity(items.len());
        for item in items {
            results.push(process_observation_value(
                conn, endpoint, method, &request, item, &config,
            )?);
        }
        serde_json::to_string(&results).map_err(|err| err.to_string())
    })
}

fn process_observation_value(
    conn: &Connection,
    endpoint: &str,
    method: &str,
    request: &RequestPayload,
    response: Value,
    config: &Config,
) -> Result<ProcessResult, String> {
    let flat = flatten_json(&response);

    let mut dims = BTreeMap::new();
    for field in &config.dimension_fields {
        if let Some(value) = lookup_dimension(method, request, &flat, field) {
            dims.insert(field.clone(), value);
        }
    }

    let mut kpis = Map::new();
    for field in &config.kpi_fields {
        if let Some(value) = flat.get(field).and_then(numeric_value) {
            kpis.insert(field.clone(), json!(value));
        }
    }

    let grain_key = build_grain_key(endpoint, &dims);

    // Extract custom time / range if configured
    let custom_time = config.time_field.as_ref().and_then(|field| {
        let val = response.pointer(&format!("/{}", field.replace(".", "/")))?;

        // If an explicit end field is provided, we prefer the 'start' point for the bucket ID
        // but the 'range' logic will use both for windowing in the future.
        if let Some(end_field) = &config.time_end_field {
            let _end_val = response.pointer(&format!("/{}", end_field.replace(".", "/")));
            // For now, anchor to start
            return val.as_str().map(|s| s.to_string());
        }

        match config.time_extraction_rule.as_str() {
            "first" | "range" => val.as_array()?.first()?.as_str().map(|s| s.to_string()),
            "last" => val.as_array()?.last()?.as_str().map(|s| s.to_string()),
            _ => val.as_str().map(|s| {
                let s = s.to_string();
                // Normalization: Handle YYYYMM by adding -01
                if s.len() == 6 && s.chars().all(|c| c.is_ascii_digit()) {
                    format!("{}-{}-01", &s[0..4], &s[4..6])
                } else {
                    s
                }
            }),
        }
    });
    let granularity = &config.time_granularity;

    let dimension_fields_json =
        serde_json::to_string(&config.dimension_fields).map_err(|err| err.to_string())?;
    let kpi_fields_json =
        serde_json::to_string(&config.kpi_fields).map_err(|err| err.to_string())?;
    upsert_endpoint_record(
        conn,
        endpoint,
        method,
        &dimension_fields_json,
        &kpi_fields_json,
        if config.confirmed {
            "confirmed"
        } else {
            "auto"
        },
        None,
    )?;

    let mut anomalies = Vec::new();
    let kpi_json = Value::Object(kpis.clone());
    let mut references_by_kpi: BTreeMap<String, Option<(f64, f64)>> = BTreeMap::new();
    let mut matched_checks = 0_usize;
    let mut mismatched_checks = 0_usize;
    let mut missing_reference_checks = 0_usize;
    for (kpi_field, value) in &kpis {
        let actual = value.as_f64().unwrap_or(0.0);
        let reference =
            reference_value(conn, &grain_key, kpi_field).map_err(|err| err.to_string())?;
        references_by_kpi.insert(kpi_field.clone(), reference);

        let mut expected_val = None;
        let mut tolerance_val = None;
        let mut method = None;

        if let Some((expected, tolerance)) = reference {
            expected_val = Some(expected);
            tolerance_val = Some(tolerance);
            method = Some("reconciliation");
        } else {
            let history = read_kpi_history_window(conn, &grain_key, kpi_field, 1)
                .map_err(|err| err.to_string())?;
            if let Some(prev) = history.first() {
                expected_val = Some(*prev);
                tolerance_val = Some(effective_tolerance(config));
                method = Some("threshold");
            }
        }

        if let (Some(expected), Some(tolerance), Some(detection_method)) =
            (expected_val, tolerance_val, method)
        {
            let pct_change = pct_delta(actual, expected);
            let is_mismatch = pct_change.abs() > tolerance
                && materially_different(actual, expected, tolerance);

            if is_mismatch {
                let selected = AnomalyResult {
                    kpi_field: kpi_field.clone(),
                    actual,
                    expected,
                    pct_change,
                    method: detection_method.to_string(),
                    severity: anomaly_severity(pct_change),
                    priority: anomaly_business_priority(&anomaly_severity(pct_change)),
                    correlated_with: vec![],
                    confidence: anomaly_confidence(detection_method, pct_change, tolerance),
                    impact: ((actual - expected).abs()
                        * config.kpi_weights.get(kpi_field).cloned().unwrap_or(1.0)
                        * 100.0)
                        .round()
                        / 100.0,
                };
                upsert_anomaly(conn, endpoint, &grain_key, &selected)
                    .map_err(|err| err.to_string())?;
                anomalies.push(selected);
                mismatched_checks += 1;
            } else {
                matched_checks += 1;
            }

            for m in ["threshold", "statistical", "reference", "reconciliation"] {
                if Some(m) != method {
                    resolve_matching_anomaly(conn, &grain_key, kpi_field, m)
                        .map_err(|err| err.to_string())?;
                }
            }
        } else {
            missing_reference_checks += 1;
            for m in ["threshold", "statistical", "reference", "reconciliation"] {
                resolve_matching_anomaly(conn, &grain_key, kpi_field, m)
                    .map_err(|err| err.to_string())?;
            }
        }
    }

    let mut comparisons = Vec::new();
    for (kpi_field, value) in &kpis {
        let actual = value.as_f64().unwrap_or(0.0);
        let reference = references_by_kpi.get(kpi_field).cloned().flatten();

        let mut expected = None;
        let mut tolerance = None;
        let mut reconciliation_status = "missing_reference".to_string();

        if let Some((e, t)) = reference {
            expected = Some(e);
            tolerance = Some(t);
            let pct = pct_delta(actual, e);
            if pct.abs() > t && materially_different(actual, e, t) {
                reconciliation_status = "mismatch".to_string();
            } else {
                reconciliation_status = "match".to_string();
            }
        } else {
            let history = read_kpi_history_window(conn, &grain_key, kpi_field, 1)
                .map_err(|err| err.to_string())?;
            if let Some(prev) = history.first() {
                expected = Some(*prev);
                let t = effective_tolerance(config);
                tolerance = Some(t);
                let pct = pct_delta(actual, *prev);
                if pct.abs() > t && materially_different(actual, *prev, t) {
                    reconciliation_status = "mismatch".to_string();
                } else {
                    reconciliation_status = "match".to_string();
                }
            }
        }

        let delta = expected.map(|e| actual - e);
        let delta_pct = expected.map(|e| pct_delta(actual, e));

        comparisons.push(ComparisonResult {
            kpi_field: kpi_field.clone(),
            actual,
            expected,
            delta,
            delta_pct,
            tolerance_pct: tolerance,
            reason: reconciliation_reason(
                kpi_field,
                &reconciliation_status,
                actual,
                expected,
                tolerance,
                delta_pct,
            ),
            reconciliation_status,
        });
    }

    if let Some(t) = &custom_time {
        conn.execute(
            "INSERT INTO jin_observations (id, endpoint_path, grain_key, dimension_json, kpi_json, source, observed_at) VALUES (?, ?, ?, ?, ?, ?, CAST(? AS TIMESTAMP))",
            params![
                next_id(conn, "jin_observations").map_err(|err| err.to_string())?,
                endpoint,
                grain_key,
                serde_json::to_string(&dims).map_err(|err| err.to_string())?,
                serde_json::to_string(&kpi_json).map_err(|err| err.to_string())?,
                "live",
                t
            ],
        ).map_err(|err| err.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO jin_observations (id, endpoint_path, grain_key, dimension_json, kpi_json, source) VALUES (?, ?, ?, ?, ?, ?)",
            params![
                next_id(conn, "jin_observations").map_err(|err| err.to_string())?,
                endpoint,
                grain_key,
                serde_json::to_string(&dims).map_err(|err| err.to_string())?,
                serde_json::to_string(&kpi_json).map_err(|err| err.to_string())?,
                "live"
            ],
        ).map_err(|err| err.to_string())?;
    }

    for (kpi_field, value) in &kpis {
        let actual = value.as_f64().unwrap_or(0.0);
        if let Some(t) = &custom_time {
            let sql = format!("INSERT INTO jin_rollups (endpoint_path, metric_name, grain_key, time_bucket, value, samples) VALUES (?, ?, ?, date_trunc('{}', CAST(? AS TIMESTAMP)), ?, 1) ON CONFLICT (endpoint_path, metric_name, grain_key, time_bucket) DO UPDATE SET value = jin_rollups.value + EXCLUDED.value, samples = jin_rollups.samples + 1", granularity);
            conn.execute(&sql, params![endpoint, kpi_field, grain_key, t, actual])
                .map_err(|err| err.to_string())?;
        } else {
            let sql = format!("INSERT INTO jin_rollups (endpoint_path, metric_name, grain_key, time_bucket, value, samples) VALUES (?, ?, ?, date_trunc('{}', now()), ?, 1) ON CONFLICT (endpoint_path, metric_name, grain_key, time_bucket) DO UPDATE SET value = jin_rollups.value + EXCLUDED.value, samples = jin_rollups.samples + 1", granularity);
            conn.execute(&sql, params![endpoint, kpi_field, grain_key, actual])
                .map_err(|err| err.to_string())?;
        }
    }
    checkpoint_after_observation(conn)?;

    let status = if kpis.is_empty() {
        "ignored"
    } else if mismatched_checks > 0 {
        "anomaly"
    } else if missing_reference_checks > 0 {
        "learning"
    } else {
        "healthy"
    };

    find_correlations(&mut anomalies);

    Ok(ProcessResult {
        grain_key,
        status: status.to_string(),
        dimension_json: serde_json::to_value(&dims).map_err(|err| err.to_string())?,
        kpi_json,
        anomalies,
        comparisons,
        reconciliation: ReconciliationSummary {
            total_checks: kpis.len(),
            matched: matched_checks,
            mismatched: mismatched_checks,
            missing_reference: missing_reference_checks,
        },
    })
}

pub fn get_status(db_path: &str) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        status_payload(conn)
    })
}

pub fn merge_status_with_registry_json(
    status_payload_json: &str,
    registry_json: &str,
    default_tolerance_pct: f64,
) -> Result<String, String> {
    let status_payload: Value =
        serde_json::from_str(status_payload_json).map_err(|err| err.to_string())?;
    let registry: Vec<Value> =
        serde_json::from_str(registry_json).map_err(|err| err.to_string())?;

    let mut runtime_endpoints = BTreeMap::new();
    if let Some(endpoints) = status_payload.get("endpoints").and_then(Value::as_array) {
        for item in endpoints {
            if let Some(path) = item.get("endpoint_path").and_then(Value::as_str) {
                runtime_endpoints.insert(path.to_string(), item.clone());
            }
        }
    }

    let mut merged = Vec::new();
    for item in registry {
        let endpoint_path = item
            .get("endpoint_path")
            .and_then(Value::as_str)
            .ok_or_else(|| "registry item missing endpoint_path".to_string())?;
        let mut base = json!({
            "endpoint_path": endpoint_path,
            "http_method": item.get("http_method").cloned().unwrap_or(json!("GET")),
            "dimension_fields": item.get("dimension_fields").cloned().unwrap_or(json!([])),
            "kpi_fields": item.get("kpi_fields").cloned().unwrap_or(json!([])),
            "grain_count": 0,
            "active_anomalies": 0,
            "active_mismatches": 0,
            "status": if item.get("kpi_fields").and_then(Value::as_array).map(|values| !values.is_empty()).unwrap_or(false) {
                json!("unconfirmed")
            } else {
                json!("healthy")
            },
            "confirmed": false,
            "tolerance_pct": default_tolerance_pct,
        "config_source": "auto",
            "fields": item.get("fields").cloned().unwrap_or(json!([])),
            "last_checked": Value::Null,
        });
        if let Some(runtime) = runtime_endpoints.get(endpoint_path) {
            if let (Some(base_obj), Some(runtime_obj)) = (base.as_object_mut(), runtime.as_object())
            {
                for (key, value) in runtime_obj {
                    base_obj.insert(key.clone(), value.clone());
                }
            }
        }
        merged.push(base);
    }

    merged.sort_by(|left, right| {
        let left_path = left
            .get("endpoint_path")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let left_method = left
            .get("http_method")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let right_path = right
            .get("endpoint_path")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let right_method = right
            .get("http_method")
            .and_then(Value::as_str)
            .unwrap_or_default();
        left_path
            .cmp(right_path)
            .then(left_method.cmp(right_method))
    });

    let summary = json!({
        "total_endpoints": merged.len(),
        "healthy": merged.iter().filter(|item| item["status"] == "healthy").count(),
        "anomalies": merged.iter().map(|item| item["active_anomalies"].as_i64().unwrap_or(0)).sum::<i64>(),
        "mismatches": merged.iter().map(|item| item["active_anomalies"].as_i64().unwrap_or(0)).sum::<i64>(),
        "unconfirmed": merged.iter().filter(|item| item["confirmed"] == false).count(),
    });

    serde_json::to_string(&json!({ "summary": summary, "endpoints": merged }))
        .map_err(|err| err.to_string())
}

pub fn get_endpoint_detail(db_path: &str, endpoint_path: &str) -> Result<String, String> {
    get_endpoint_detail_with_limits(db_path, endpoint_path, None, None)
}

pub fn get_endpoint_detail_with_limits(
    db_path: &str,
    endpoint_path: &str,
    history_limit: Option<usize>,
    reference_limit: Option<usize>,
) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        endpoint_detail_payload_with_limits(conn, endpoint_path, history_limit, reference_limit)
    })
}

pub fn get_active_anomalies(db_path: &str) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        active_anomalies_payload(conn)
    })
}

pub fn resolve_anomaly_by_id(db_path: &str, anomaly_id: i64) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        let result = resolve_anomaly(conn, anomaly_id)?;
        checkpoint(conn).map_err(|err| err.to_string())?;
        Ok(result)
    })
}

pub fn import_reference_rows_json(
    db_path: &str,
    endpoint_path: &str,
    dimension_fields_json: &str,
    kpi_fields_json: &str,
    rows_json: &str,
    upload_source: &str,
) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        let dimension_fields: Vec<String> =
            serde_json::from_str(dimension_fields_json).map_err(|err| err.to_string())?;
        let kpi_fields: Vec<String> =
            serde_json::from_str(kpi_fields_json).map_err(|err| err.to_string())?;
        let rows: Vec<Value> = serde_json::from_str(rows_json).map_err(|err| err.to_string())?;
        let payload = import_reference_rows(
            conn,
            endpoint_path,
            &dimension_fields,
            &kpi_fields,
            &rows,
            upload_source,
        )?;
        checkpoint(conn).map_err(|err| err.to_string())?;
        Ok(payload)
    })
}

pub fn save_endpoint_config_json(
    db_path: &str,
    endpoint_path: &str,
    http_method: &str,
    default_dimension_fields_json: &str,
    default_kpi_fields_json: &str,
    payload_json: &str,
) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        let default_dimension_fields: Vec<String> =
            serde_json::from_str(default_dimension_fields_json).map_err(|err| err.to_string())?;
        let default_kpi_fields: Vec<String> =
            serde_json::from_str(default_kpi_fields_json).map_err(|err| err.to_string())?;
        let payload: Value = serde_json::from_str(payload_json).map_err(|err| err.to_string())?;
        let payload = save_endpoint_config(
            conn,
            endpoint_path,
            http_method,
            &default_dimension_fields,
            &default_kpi_fields,
            &payload,
        )?;
        checkpoint(conn).map_err(|err| err.to_string())?;
        Ok(payload)
    })
}

pub fn save_references_json(
    db_path: &str,
    endpoint_path: &str,
    payload_json: &str,
    upload_source: &str,
) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        let payload: Value = serde_json::from_str(payload_json).map_err(|err| err.to_string())?;
        let result = save_references(conn, endpoint_path, &payload, upload_source)?;
        checkpoint(conn).map_err(|err| err.to_string())?;
        Ok(result)
    })
}

pub fn resolve_endpoint_config_json(
    db_path: &str,
    endpoint_path: &str,
    default_dimension_fields_json: &str,
    default_kpi_fields_json: &str,
    default_tolerance_pct: f64,
    watch_threshold: Option<f64>,
    extra_overrides_json: &str,
) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        let default_dimension_fields: Vec<String> =
            serde_json::from_str(default_dimension_fields_json).map_err(|err| err.to_string())?;
        let default_kpi_fields: Vec<String> =
            serde_json::from_str(default_kpi_fields_json).map_err(|err| err.to_string())?;
        let extra_overrides: Value =
            serde_json::from_str(extra_overrides_json).map_err(|err| err.to_string())?;
        resolve_endpoint_config(
            conn,
            endpoint_path,
            &default_dimension_fields,
            &default_kpi_fields,
            default_tolerance_pct,
            watch_threshold,
            &extra_overrides,
        )
    })
}

pub fn load_saved_endpoint_config_json(
    db_path: &str,
    endpoint_path: &str,
) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        storage::load_saved_endpoint_config(conn, endpoint_path)
    })
}

pub fn promote_anomaly_to_baseline(db_path: &str, anomaly_id: i64) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;

        let mut stmt = conn
            .prepare(
                "
            SELECT endpoint_path, grain_key, kpi_field, actual_value
            FROM jin_anomalies
            WHERE id = ?
        ",
            )
            .map_err(|err| err.to_string())?;

        let (endpoint_path, grain_key, kpi_field, actual_value) = stmt
            .query_row(params![anomaly_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, f64>(3)?,
                ))
            })
            .map_err(|err| err.to_string())?;

        // Update or Insert into jin_reference
        conn.execute(
            "
            INSERT OR REPLACE INTO jin_reference (id, endpoint_path, grain_key, kpi_field, expected_value, upload_source)
            VALUES (?, ?, ?, ?, ?, ?)
        ",
            params![
                storage::next_id(conn, "jin_reference").map_err(|err| err.to_string())?,
                endpoint_path,
                grain_key,
                kpi_field,
                actual_value,
                "operator-promotion"
            ],
        )
        .map_err(|err| err.to_string())?;

        // Also mark the anomaly as resolved
        conn.execute(
            "
            UPDATE jin_anomalies
            SET is_active = false, resolved_at = now()
            WHERE id = ?
        ",
            params![anomaly_id],
        )
        .map_err(|err| err.to_string())?;

        storage::checkpoint(conn).map_err(|err| err.to_string())?;

        Ok(json!({
            "status": "success",
            "message": format!("Promoted {kpi_field} actual value to uploaded reference for {grain_key}")
        })
        .to_string())
    })
}

pub fn promote_baseline_json(db_path: &str, endpoint_path: &str) -> Result<String, String> {
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;

        let mut stmt = conn
            .prepare(
                "
            SELECT grain_key, metric_name, AVG(value / samples) 
            FROM jin_rollups 
            WHERE endpoint_path = ? 
            GROUP BY grain_key, metric_name
        ",
            )
            .map_err(|err| err.to_string())?;

        let rows = stmt
            .query_map(params![endpoint_path], |row| {
                Ok((
                    row.get::<usize, String>(0)?,
                    row.get::<usize, String>(1)?,
                    row.get::<usize, f64>(2)?,
                ))
            })
            .map_err(|err| err.to_string())?;

        for row in rows {
            let (grain, metric, avg) = row.map_err(|err| err.to_string())?;
            conn.execute(
                "
                INSERT OR REPLACE INTO jin_reference (id, endpoint_path, grain_key, kpi_field, expected_value, upload_source)
                VALUES (?, ?, ?, ?, ?, ?)
            ",
                params![
                    storage::next_id(conn, "jin_reference").map_err(|err| err.to_string())?,
                    endpoint_path,
                    grain,
                    metric,
                    avg,
                    "autopilot"
                ],
            )
            .map_err(|err| err.to_string())?;
        }

        storage::checkpoint(conn).map_err(|err| err.to_string())?;
        Ok(
            json!({ "status": "success", "message": "References refreshed from recent history." })
                .to_string(),
        )
    })
}

pub fn validate_reference_rows_json(
    field_names_json: &str,
    rows_json: &str,
    expected_fields_json: Option<&str>,
) -> Result<String, String> {
    let field_names: Vec<String> =
        serde_json::from_str(field_names_json).map_err(|err| err.to_string())?;
    let rows: Vec<Value> = serde_json::from_str(rows_json).map_err(|err| err.to_string())?;
    let expected_fields: Option<Vec<String>> = expected_fields_json
        .map(|raw| serde_json::from_str(raw).map_err(|err| err.to_string()))
        .transpose()?;
    storage::validate_reference_upload_rows(&rows, &field_names, expected_fields.as_deref())
}

pub fn query_rollups_json(
    db_path: &str,
    measures_json: &str,
    limit: Option<i64>,
) -> Result<String, String> {
    let measures: Vec<String> =
        serde_json::from_str(measures_json).map_err(|err| err.to_string())?;
    if measures.is_empty() {
        return serde_json::to_string(&json!({"data": []})).map_err(|err| err.to_string());
    }
    with_connection(db_path, |conn| {
        init_schema(conn).map_err(|err| err.to_string())?;
        let row_limit = limit.unwrap_or(1000).max(1).min(10000);
        let placeholders = measures
            .iter()
            .enumerate()
            .map(|(i, _)| format!("${}", i + 1))
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "SELECT \
                CAST(time_bucket AS VARCHAR), \
                metric_name, \
                grain_key, \
                SUM(value) AS value, \
                SUM(samples) AS samples \
            FROM jin_rollups \
            WHERE metric_name IN ({placeholders}) \
            GROUP BY time_bucket, metric_name, grain_key \
            ORDER BY time_bucket DESC \
            LIMIT {row_limit}"
        );
        let mut stmt = conn.prepare(&sql).map_err(|err| err.to_string())?;
        let params: Vec<duckdb::types::Value> = measures
            .iter()
            .map(|m| duckdb::types::Value::Text(m.clone()))
            .collect();
        let rows_iter = stmt
            .query_map(duckdb::params_from_iter(params.iter()), |row| {
                Ok((
                    row.get::<usize, String>(0)?,
                    row.get::<usize, String>(1)?,
                    row.get::<usize, String>(2)?,
                    row.get::<usize, f64>(3)?,
                    row.get::<usize, i64>(4)?,
                ))
            })
            .map_err(|err| err.to_string())?;

        let mut data = Vec::new();
        for row in rows_iter {
            let (time_bucket, metric_name, grain_key, value, samples) =
                row.map_err(|err| err.to_string())?;
            data.push(json!({
                "time_bucket": time_bucket,
                "metric_name": metric_name,
                "grain_key": grain_key,
                "value": value,
                "samples": samples,
            }));
        }
        serde_json::to_string(&json!({ "data": data })).map_err(|err| err.to_string())
    })
}

/// V8: Pulse Compass (Root Cause Correlation).
/// Links anomalies in the same window that show significant synchronous movement.
pub fn find_correlations(anomalies: &mut Vec<AnomalyResult>) {
    let n = anomalies.len();
    if n < 2 {
        return;
    }

    let mut links = Vec::new();
    for i in 0..n {
        for j in (i + 1)..n {
            if anomalies[i].pct_change.abs() > 20.0 && anomalies[j].pct_change.abs() > 20.0 {
                links.push((i, anomalies[j].kpi_field.clone()));
                links.push((j, anomalies[i].kpi_field.clone()));
            }
        }
    }

    for (idx, name) in links {
        anomalies[idx].correlated_with.push(name);
    }
}

#[cfg(test)]
mod internal_tests {
    use super::{
        anomaly_confidence, anomaly_priority, anomaly_severity, choose_preferred_anomaly,
        distinct_history_points, effective_tolerance, materially_different, pct_delta,
        should_checkpoint_observation_with_interval,
    };
    use crate::core::types::Config;

    fn demo_config() -> Config {
        Config {
            dimension_fields: vec!["retailer".to_string()],
            kpi_fields: vec!["value".to_string()],
            tolerance_pct: 10.0,
            tolerance_relaxed: 25.0,
            tolerance_normal: 12.0,
            tolerance_strict: 4.0,
            active_tolerance: "normal".to_string(),
            confirmed: false,
            kpi_weights: std::collections::HashMap::new(),
            currency: "$".to_string(),
            time_field: None,
            rows_path: None,
            time_end_field: None,
            time_profile: "auto".to_string(),
            time_granularity: "minute".to_string(),
            time_extraction_rule: "single".to_string(),
            time_format: None,
            time_pin: false,
        }
    }

    #[test]
    fn pct_delta_handles_zero_and_non_zero_expected_values() {
        assert_eq!(pct_delta(0.0, 0.0), 0.0);
        assert_eq!(pct_delta(5.0, 0.0), 100.0);
        assert_eq!(pct_delta(-5.0, 0.0), -100.0);
        assert_eq!(pct_delta(12.0, 10.0), 20.0);
    }

    #[test]
    fn materiality_helpers_filter_small_noise() {
        assert!(!materially_different(100.2, 100.0, 10.0));
        assert!(materially_different(112.0, 100.0, 10.0));
        assert_eq!(distinct_history_points(&[1.0, 1.0, 1.0001, 2.0]), 2);
        assert_eq!(anomaly_severity(80.0), "critical");
        assert_eq!(anomaly_severity(20.0), "medium");
        assert_eq!(anomaly_severity(5.0), "low");
        assert!(
            anomaly_confidence("reference", 30.0, 10.0)
                > anomaly_confidence("threshold", 30.0, 10.0)
        );
        assert_eq!(anomaly_confidence("unknown", 30.0, 0.0), 0.65);
    }

    #[test]
    fn anomaly_priority_orders_methods() {
        assert!(anomaly_priority("reference") > anomaly_priority("statistical"));
        assert!(anomaly_priority("statistical") > anomaly_priority("threshold"));
        assert_eq!(anomaly_priority("unknown"), 0);
    }

    #[test]
    fn choose_preferred_anomaly_uses_priority_then_magnitude() {
        let selected = choose_preferred_anomaly(&[
            crate::core::types::AnomalyResult {
                kpi_field: "value".to_string(),
                actual: 120.0,
                expected: 100.0,
                pct_change: 20.0,
                method: "threshold".to_string(),
                severity: "medium".to_string(),
                priority: "P2".to_string(),
                correlated_with: vec![],
                confidence: 0.8,
                impact: 0.0,
            },
            crate::core::types::AnomalyResult {
                kpi_field: "value".to_string(),
                actual: 140.0,
                expected: 100.0,
                pct_change: 40.0,
                method: "threshold".to_string(),
                severity: "high".to_string(),
                priority: "P1".to_string(),
                correlated_with: vec![],
                confidence: 0.9,
                impact: 0.0,
            },
            crate::core::types::AnomalyResult {
                kpi_field: "value".to_string(),
                actual: 130.0,
                expected: 100.0,
                pct_change: 30.0,
                method: "reference".to_string(),
                severity: "high".to_string(),
                priority: "P1".to_string(),
                correlated_with: vec![],
                confidence: 0.95,
                impact: 0.0,
            },
        ])
        .expect("selected anomaly");

        assert_eq!(selected.method, "reference");

        let threshold_selected = choose_preferred_anomaly(&[
            crate::core::types::AnomalyResult {
                kpi_field: "value".to_string(),
                actual: 120.0,
                expected: 100.0,
                pct_change: 20.0,
                method: "threshold".to_string(),
                severity: "medium".to_string(),
                priority: "P2".to_string(),
                correlated_with: vec![],
                confidence: 0.8,
                impact: 0.0,
            },
            crate::core::types::AnomalyResult {
                kpi_field: "value".to_string(),
                actual: 150.0,
                expected: 100.0,
                pct_change: 50.0,
                method: "threshold".to_string(),
                severity: "high".to_string(),
                priority: "P1".to_string(),
                correlated_with: vec![],
                confidence: 0.85,
                impact: 0.0,
            },
        ])
        .expect("threshold anomaly");

        assert_eq!(threshold_selected.pct_change, 50.0);
        assert!(choose_preferred_anomaly(&[]).is_none());
    }

    #[test]
    fn effective_tolerance_respects_active_mode_and_fallback() {
        let mut config = demo_config();
        assert_eq!(effective_tolerance(&config), 12.0);

        config.active_tolerance = "relaxed".to_string();
        assert_eq!(effective_tolerance(&config), 25.0);

        config.active_tolerance = "strict".to_string();
        assert_eq!(effective_tolerance(&config), 4.0);

        config.active_tolerance = "custom".to_string();
        assert_eq!(effective_tolerance(&config), 10.0);
    }

    #[test]
    fn observation_checkpoint_uses_fixed_cadence() {
        assert!(!should_checkpoint_observation_with_interval(1, 250));
        assert!(!should_checkpoint_observation_with_interval(249, 250));
        assert!(should_checkpoint_observation_with_interval(250, 250));
        assert!(should_checkpoint_observation_with_interval(500, 250));
        assert!(!should_checkpoint_observation_with_interval(250, 0));
    }
}
