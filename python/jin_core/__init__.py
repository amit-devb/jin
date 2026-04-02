try:
    from . import jin_core as _native
except ImportError:
    try:
        import jin_core as _native
    except ImportError:
        _native = None

def _get_func(name):
    if _native is None:
        return None
    return getattr(_native, name, None)

init_db = _get_func("init_db")
process_observation = _get_func("process_observation")
process_observations = _get_func("process_observations")
get_status = _get_func("get_status")
merge_status_with_registry = _get_func("merge_status_with_registry")
get_endpoint_detail = _get_func("get_endpoint_detail")
get_active_anomalies = _get_func("get_active_anomalies")
resolve_anomaly = _get_func("resolve_anomaly")
import_reference_rows = _get_func("import_reference_rows")
save_endpoint_config = _get_func("save_endpoint_config")
save_references = _get_func("save_references")
resolve_endpoint_config = _get_func("resolve_endpoint_config")
load_saved_endpoint_config = _get_func("load_saved_endpoint_config")
promote_baseline = _get_func("promote_baseline")
validate_reference_rows = _get_func("validate_reference_rows")
auth_status = _get_func("auth_status")
env_check = _get_func("env_check")
local_urls = _get_func("local_urls")
project_status = _get_func("project_status")
report_summary = _get_func("report_summary")
doctor_core = _get_func("doctor_core")
verify_core = _get_func("verify_core")
references_export = _get_func("references_export")
endpoint_operational_metadata = _get_func("endpoint_operational_metadata")
endpoints_list = _get_func("endpoints_list")
config_show = _get_func("config_show")
template_spec = _get_func("template_spec")
issues_list = _get_func("issues_list")
issues_update = _get_func("issues_update")
sync_registry = _get_func("sync_registry")
query_rollups = _get_func("query_rollups")
