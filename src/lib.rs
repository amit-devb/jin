mod core;

use crate::core::commands;
use crate::core::engine;
use pyo3::exceptions::PyRuntimeError;
use pyo3::prelude::*;

fn py_err<E: std::fmt::Display>(err: E) -> PyErr {
    PyRuntimeError::new_err(err.to_string())
}

#[pyfunction]
fn init_db(db_path: &str) -> PyResult<()> {
    engine::init_db(db_path).map_err(py_err)
}

#[pyfunction]
fn process_observation(
    endpoint: &str,
    method: &str,
    request_json: &str,
    response_json: &str,
    config_json: &str,
    db_path: &str,
) -> PyResult<String> {
    engine::process_observation(
        endpoint,
        method,
        request_json,
        response_json,
        config_json,
        db_path,
    )
    .map_err(py_err)
}

#[pyfunction]
fn process_observations(
    endpoint: &str,
    method: &str,
    request_json: &str,
    response_json: &str,
    config_json: &str,
    db_path: &str,
) -> PyResult<String> {
    engine::process_observations(
        endpoint,
        method,
        request_json,
        response_json,
        config_json,
        db_path,
    )
    .map_err(py_err)
}

#[pyfunction]
fn get_status(db_path: &str) -> PyResult<String> {
    engine::get_status(db_path).map_err(py_err)
}

#[pyfunction]
fn merge_status_with_registry(
    status_payload_json: &str,
    registry_json: &str,
    default_tolerance_pct: f64,
) -> PyResult<String> {
    engine::merge_status_with_registry_json(
        status_payload_json,
        registry_json,
        default_tolerance_pct,
    )
    .map_err(py_err)
}

#[pyfunction(signature = (db_path, endpoint_path, history_limit=None, reference_limit=None))]
fn get_endpoint_detail(
    db_path: &str,
    endpoint_path: &str,
    history_limit: Option<usize>,
    reference_limit: Option<usize>,
) -> PyResult<String> {
    if history_limit.is_none() && reference_limit.is_none() {
        return engine::get_endpoint_detail(db_path, endpoint_path).map_err(py_err);
    }
    engine::get_endpoint_detail_with_limits(db_path, endpoint_path, history_limit, reference_limit)
        .map_err(py_err)
}

#[pyfunction]
fn get_active_anomalies(db_path: &str) -> PyResult<String> {
    engine::get_active_anomalies(db_path).map_err(py_err)
}

#[pyfunction]
fn resolve_anomaly(db_path: &str, anomaly_id: i64) -> PyResult<String> {
    engine::resolve_anomaly_by_id(db_path, anomaly_id).map_err(py_err)
}

#[pyfunction]
fn import_reference_rows(
    db_path: &str,
    endpoint_path: &str,
    dimension_fields_json: &str,
    kpi_fields_json: &str,
    rows_json: &str,
    upload_source: &str,
) -> PyResult<String> {
    engine::import_reference_rows_json(
        db_path,
        endpoint_path,
        dimension_fields_json,
        kpi_fields_json,
        rows_json,
        upload_source,
    )
    .map_err(py_err)
}

#[pyfunction]
fn save_endpoint_config(
    db_path: &str,
    endpoint_path: &str,
    http_method: &str,
    default_dimension_fields_json: &str,
    default_kpi_fields_json: &str,
    payload_json: &str,
) -> PyResult<String> {
    engine::save_endpoint_config_json(
        db_path,
        endpoint_path,
        http_method,
        default_dimension_fields_json,
        default_kpi_fields_json,
        payload_json,
    )
    .map_err(py_err)
}

#[pyfunction]
fn save_references(
    db_path: &str,
    endpoint_path: &str,
    payload_json: &str,
    upload_source: &str,
) -> PyResult<String> {
    engine::save_references_json(db_path, endpoint_path, payload_json, upload_source)
        .map_err(py_err)
}

#[pyfunction(signature = (
    db_path,
    endpoint_path,
    default_dimension_fields_json,
    default_kpi_fields_json,
    default_tolerance_pct,
    watch_threshold=None,
    extra_overrides_json="{}"
))]
fn resolve_endpoint_config(
    db_path: &str,
    endpoint_path: &str,
    default_dimension_fields_json: &str,
    default_kpi_fields_json: &str,
    default_tolerance_pct: f64,
    watch_threshold: Option<f64>,
    extra_overrides_json: &str,
) -> PyResult<String> {
    engine::resolve_endpoint_config_json(
        db_path,
        endpoint_path,
        default_dimension_fields_json,
        default_kpi_fields_json,
        default_tolerance_pct,
        watch_threshold,
        extra_overrides_json,
    )
    .map_err(py_err)
}

#[pyfunction]
fn load_saved_endpoint_config(db_path: &str, endpoint_path: &str) -> PyResult<String> {
    engine::load_saved_endpoint_config_json(db_path, endpoint_path).map_err(py_err)
}

#[pyfunction]
fn promote_baseline(db_path: &str, endpoint_path: &str) -> PyResult<String> {
    engine::promote_baseline_json(db_path, endpoint_path).map_err(py_err)
}

#[pyfunction]
fn promote_anomaly_to_baseline(db_path: &str, anomaly_id: i64) -> PyResult<String> {
    engine::promote_anomaly_to_baseline(db_path, anomaly_id).map_err(py_err)
}

#[pyfunction(signature = (field_names_json, rows_json, expected_fields_json=None))]
fn validate_reference_rows(
    field_names_json: &str,
    rows_json: &str,
    expected_fields_json: Option<&str>,
) -> PyResult<String> {
    engine::validate_reference_rows_json(field_names_json, rows_json, expected_fields_json)
        .map_err(py_err)
}

#[pyfunction(signature = (db_path, measures_json, limit=None))]
fn query_rollups(db_path: &str, measures_json: &str, limit: Option<i64>) -> PyResult<String> {
    engine::query_rollups_json(db_path, measures_json, limit).map_err(py_err)
}

#[pyfunction]
fn auth_status(env_json: &str) -> PyResult<String> {
    commands::auth_status_json(env_json).map_err(py_err)
}

#[pyfunction]
fn env_check(
    env_json: &str,
    env_file: &str,
    db_path: &str,
    project_name: &str,
) -> PyResult<String> {
    commands::env_check_json(env_json, env_file, db_path, project_name).map_err(py_err)
}

#[pyfunction]
fn local_urls(host: &str, port: i64, scheme: &str) -> PyResult<String> {
    commands::urls_json(host, port, scheme).map_err(py_err)
}

#[pyfunction]
fn project_status(
    db_path: &str,
    env_json: &str,
    env_file: &str,
    project_name: &str,
    watch_count: i64,
) -> PyResult<String> {
    commands::project_status_json(db_path, env_json, env_file, project_name, watch_count)
        .map_err(py_err)
}

#[pyfunction]
fn report_summary(db_path: &str, project_name: &str) -> PyResult<String> {
    commands::report_summary_json(db_path, project_name).map_err(py_err)
}

#[pyfunction]
fn doctor_core(
    db_path: &str,
    env_json: &str,
    env_file: &str,
    project_name: &str,
) -> PyResult<String> {
    commands::doctor_core_json(db_path, env_json, env_file, project_name).map_err(py_err)
}

#[pyfunction]
fn verify_core(db_path: &str, project_name: &str) -> PyResult<String> {
    commands::verify_core_json(db_path, project_name).map_err(py_err)
}

#[pyfunction]
fn sync_registry(db_path: &str, records_json: &str) -> PyResult<String> {
    commands::sync_registry_json(db_path, records_json).map_err(py_err)
}

#[pyfunction]
fn references_export(db_path: &str, endpoint_path: &str) -> PyResult<String> {
    commands::references_export_json(db_path, endpoint_path).map_err(py_err)
}

#[pyfunction]
fn endpoint_operational_metadata(db_path: &str, endpoint_path: &str) -> PyResult<String> {
    commands::endpoint_operational_metadata_json(db_path, endpoint_path).map_err(py_err)
}

#[pyfunction]
fn endpoints_list(db_path: &str) -> PyResult<String> {
    commands::endpoints_list_json(db_path).map_err(py_err)
}

#[pyfunction]
fn config_show(db_path: &str, endpoint_path: &str) -> PyResult<String> {
    commands::config_show_json(db_path, endpoint_path).map_err(py_err)
}

#[pyfunction]
fn template_spec(db_path: &str, endpoint_path: &str) -> PyResult<String> {
    commands::template_spec_json(db_path, endpoint_path).map_err(py_err)
}

#[pyfunction(signature = (db_path, endpoint=None, status=None))]
fn issues_list(db_path: &str, endpoint: Option<&str>, status: Option<&str>) -> PyResult<String> {
    commands::issues_list_json(db_path, endpoint, status).map_err(py_err)
}

#[pyfunction(signature = (db_path, issue_id, action, note=None, owner=None, resolution_reason=None, until=None))]
fn issues_update(
    db_path: &str,
    issue_id: i64,
    action: &str,
    note: Option<&str>,
    owner: Option<&str>,
    resolution_reason: Option<&str>,
    until: Option<&str>,
) -> PyResult<String> {
    commands::issues_update_json(
        db_path,
        issue_id,
        action,
        note,
        owner,
        resolution_reason,
        until,
    )
    .map_err(py_err)
}

#[pymodule]
fn jin_core(_py: Python<'_>, module: &Bound<'_, PyModule>) -> PyResult<()> {
    module.add_function(wrap_pyfunction!(init_db, module)?)?;
    module.add_function(wrap_pyfunction!(process_observation, module)?)?;
    module.add_function(wrap_pyfunction!(process_observations, module)?)?;
    module.add_function(wrap_pyfunction!(get_status, module)?)?;
    module.add_function(wrap_pyfunction!(merge_status_with_registry, module)?)?;
    module.add_function(wrap_pyfunction!(get_endpoint_detail, module)?)?;
    module.add_function(wrap_pyfunction!(get_active_anomalies, module)?)?;
    module.add_function(wrap_pyfunction!(resolve_anomaly, module)?)?;
    module.add_function(wrap_pyfunction!(import_reference_rows, module)?)?;
    module.add_function(wrap_pyfunction!(save_endpoint_config, module)?)?;
    module.add_function(wrap_pyfunction!(save_references, module)?)?;
    module.add_function(wrap_pyfunction!(resolve_endpoint_config, module)?)?;
    module.add_function(wrap_pyfunction!(load_saved_endpoint_config, module)?)?;
    module.add_function(wrap_pyfunction!(promote_baseline, module)?)?;
    module.add_function(wrap_pyfunction!(promote_anomaly_to_baseline, module)?)?;
    module.add_function(wrap_pyfunction!(validate_reference_rows, module)?)?;
    module.add_function(wrap_pyfunction!(auth_status, module)?)?;
    module.add_function(wrap_pyfunction!(env_check, module)?)?;
    module.add_function(wrap_pyfunction!(local_urls, module)?)?;
    module.add_function(wrap_pyfunction!(project_status, module)?)?;
    module.add_function(wrap_pyfunction!(report_summary, module)?)?;
    module.add_function(wrap_pyfunction!(doctor_core, module)?)?;
    module.add_function(wrap_pyfunction!(verify_core, module)?)?;
    module.add_function(wrap_pyfunction!(sync_registry, module)?)?;
    module.add_function(wrap_pyfunction!(references_export, module)?)?;
    module.add_function(wrap_pyfunction!(endpoint_operational_metadata, module)?)?;
    module.add_function(wrap_pyfunction!(endpoints_list, module)?)?;
    module.add_function(wrap_pyfunction!(config_show, module)?)?;
    module.add_function(wrap_pyfunction!(template_spec, module)?)?;
    module.add_function(wrap_pyfunction!(issues_list, module)?)?;
    module.add_function(wrap_pyfunction!(issues_update, module)?)?;
    module.add_function(wrap_pyfunction!(query_rollups, module)?)?;
    Ok(())
}

#[cfg(test)]
mod tests;
