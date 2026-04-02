from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import quote

import jin.dashboard as dashboard_module
import jin.router as router_module
from jin.core.license import LicenseClient


def _configure_v2_sales_setup(client, encoded_sales_path: str) -> None:
    configured = client.post(
        f"/jin/api/v2/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["data.RSV"],
            "time_field": "period",
            "time_profile": "auto",
            "time_extraction_rule": "single",
            "confirmed": True,
        },
    )
    assert configured.status_code == 200


def test_dashboard_asset_version_falls_back_to_dev(monkeypatch) -> None:
    missing_dir = Path("/tmp/jin-missing-static-assets")
    monkeypatch.setattr(dashboard_module, "_STATIC_DIR", missing_dir)
    assert dashboard_module._asset_version("dashboard.css") == "dev"


def test_license_normalization_scope_and_binding_branches(tmp_path: Path) -> None:
    client = LicenseClient(
        storage_path=str(tmp_path / "license.json"),
        usage_path=str(tmp_path / "usage.json"),
        org_registry_path=str(tmp_path / "organizations.json"),
    )

    starter = client._normalize_policy(
        {
            "tier": "starter",
            "max_projects": "7",
            "features": "not-a-list",
            "monthly_runs_limit": 123,
        }
    )
    assert starter["tier"] == "free"
    assert starter["max_projects"] == 1
    assert starter["features"] == []
    assert "monthly_runs_limit" not in starter

    enterprise = client._normalize_policy({"tier": "enterprise", "features": ["ai_chat"]})
    assert enterprise["tier"] == "business"
    assert enterprise["max_projects"] is None

    unknown = client._normalize_policy({"tier": "weird", "max_projects": "bad"})
    assert unknown["tier"] == "free"
    assert unknown["max_projects"] == 1

    assert client._bind_organization(None, None) == {"ok": True}

    registry_path = Path(client.org_registry_path)
    registry_path.write_text("[]")
    assert client._bind_organization("org-a", "acct-a") == {"ok": True}

    registry_path.write_text("{bad-json")
    assert client._bind_organization("org-b", "acct-b") == {"ok": True}

    registry_path.write_text(json.dumps({"org-c": {"account_id": "acct-c"}}))
    assert client._bind_organization("org-c", "acct-c") == {"ok": True}

    client._organization_id = None
    client._account_id = None
    assert client.get_account_scope("site-x") == "site-x"
    assert client.get_account_scope(None) == "local"


def test_router_project_policy_and_lifecycle_error_branches(client, monkeypatch) -> None:
    middleware = client.app.middleware_stack.app
    project_id = client.get("/jin/api/v2/projects/current").json()["project"]["id"]

    def archive_missing(_project_id: str):
        raise ValueError("project not found")

    monkeypatch.setattr(middleware, "archive_project_in_catalog", archive_missing)
    archive_not_found = client.post(f"/jin/api/v2/projects/{project_id}/archive")
    assert archive_not_found.status_code == 404

    def archive_bad_request(_project_id: str):
        raise ValueError("cannot archive project")

    monkeypatch.setattr(middleware, "archive_project_in_catalog", archive_bad_request)
    archive_bad = client.post(f"/jin/api/v2/projects/{project_id}/archive")
    assert archive_bad.status_code == 400

    def restore_missing(_project_id: str):
        raise ValueError("project not found")

    monkeypatch.setattr(middleware, "restore_project_in_catalog", restore_missing)
    restore_not_found = client.post(f"/jin/api/v2/projects/{project_id}/restore")
    assert restore_not_found.status_code == 404

    def restore_bad_request(_project_id: str):
        raise ValueError("cannot restore project")

    monkeypatch.setattr(middleware, "restore_project_in_catalog", restore_bad_request)
    restore_bad = client.post(f"/jin/api/v2/projects/{project_id}/restore")
    assert restore_bad.status_code == 400

    def set_policy_missing(_project_id: str, _payload: dict):
        raise ValueError("project not found")

    monkeypatch.setattr(middleware, "set_project_monitor_policy", set_policy_missing)
    set_policy_not_found = client.post(f"/jin/api/v2/projects/{project_id}/check-plan", json={})
    assert set_policy_not_found.status_code == 404

    def set_policy_bad(_project_id: str, _payload: dict):
        raise ValueError("invalid monitor policy")

    monkeypatch.setattr(middleware, "set_project_monitor_policy", set_policy_bad)
    set_policy_bad_request = client.post(f"/jin/api/v2/projects/{project_id}/check-plan", json={})
    assert set_policy_bad_request.status_code == 400

    apply_calls: list[dict[str, object]] = []

    def apply_policy(project_id_arg: str, endpoint_paths=None, overwrite_existing_schedule=True):
        apply_calls.append(
            {
                "project_id": project_id_arg,
                "endpoint_paths": endpoint_paths,
                "overwrite_existing_schedule": overwrite_existing_schedule,
            }
        )
        return {"requested": 0, "applied": 0, "results": []}

    monkeypatch.setattr(middleware, "apply_project_monitor_policy", apply_policy)
    apply_ok = client.post(
        f"/jin/api/v2/projects/{project_id}/check-plan/apply",
        content="{not-json",
        headers={"content-type": "application/json"},
    )
    assert apply_ok.status_code == 200
    assert apply_calls[-1]["endpoint_paths"] is None
    assert apply_calls[-1]["overwrite_existing_schedule"] is True

    bootstrap_ok = client.post(
        f"/jin/api/v2/projects/{project_id}/check-plan/bootstrap",
        content="{not-json",
        headers={"content-type": "application/json"},
    )
    assert bootstrap_ok.status_code == 200
    assert apply_calls[-1]["endpoint_paths"] is None
    assert apply_calls[-1]["overwrite_existing_schedule"] is False

    def apply_missing(*_args, **_kwargs):
        raise ValueError("project not found")

    monkeypatch.setattr(middleware, "apply_project_monitor_policy", apply_missing)
    apply_not_found = client.post(f"/jin/api/v2/projects/{project_id}/check-plan/apply", json={})
    assert apply_not_found.status_code == 404

    def apply_bad_request(*_args, **_kwargs):
        raise ValueError("invalid endpoint payload")

    monkeypatch.setattr(middleware, "apply_project_monitor_policy", apply_bad_request)
    apply_bad = client.post(f"/jin/api/v2/projects/{project_id}/check-plan/apply", json={})
    assert apply_bad.status_code == 400
    bootstrap_bad = client.post(f"/jin/api/v2/projects/{project_id}/check-plan/bootstrap", json={})
    assert bootstrap_bad.status_code == 400


def test_router_report_and_endpoint_fallback_branches(client, monkeypatch) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    encoded = quote(endpoint_path, safe="")
    client.get("/api/sales/amazon/YTD?value=100")
    middleware = client.app.middleware_stack.app
    original_get_connection = middleware._get_connection
    original_duckdb = router_module.duckdb

    def issues_raise(*_args, **_kwargs):
        raise RuntimeError("native issues failed")

    monkeypatch.setattr(router_module, "issues_list", issues_raise)
    monkeypatch.setattr(router_module, "duckdb", None)

    summary = client.get("/jin/api/v2/reports/summary")
    assert summary.status_code == 200
    assert summary.json()["active_anomalies"] == []

    monkeypatch.setattr(
        router_module,
        "get_endpoint_detail",
        lambda *_args, **_kwargs: json.dumps(
            {
                "endpoint": {"http_method": "GET", "dimension_fields": ["retailer"], "kpi_fields": ["data.RSV"]},
                "history": [],
                "anomalies": [{"id": 7, "actual_value": 120, "expected_value": 100, "pct_change": 20}],
                "config": {"dimension_fields": ["retailer"], "kpi_fields": ["data.RSV"]},
                "schema_contract": {"fields": [{"name": "retailer"}, {"name": "data.RSV"}]},
            }
        ),
    )
    monkeypatch.setattr(router_module, "issues_list", issues_raise)
    monkeypatch.setattr(middleware, "_get_connection", original_get_connection)
    monkeypatch.setattr(router_module, "duckdb", original_duckdb)

    detail = client.get(f"/jin/api/v2/endpoint/{encoded}")
    assert detail.status_code == 200
    assert isinstance(detail.json()["anomaly_history"], list)


def test_router_upload_parse_and_validation_error_branches(client, monkeypatch) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    encoded = quote(endpoint_path, safe="")
    _configure_v2_sales_setup(client, encoded)

    bad_xlsx = client.post(
        f"/jin/api/v2/upload/{encoded}",
        files={"file": ("broken.xlsx", b"not-a-valid-xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert bad_xlsx.status_code == 400
    assert "Could not read uploaded document" in bad_xlsx.json()["error"]

    monkeypatch.setattr(router_module, "validate_reference_rows", None)

    def validation_boom(*_args, **_kwargs):
        raise ValueError("validation exploded")

    monkeypatch.setattr(router_module, "validate_upload_rows", validation_boom)
    csv_payload = b"endpoint,dimension_fields,kpi_fields,grain_retailer,expected_data.RSV,tolerance_pct\n" \
        b"\"/api/sales/{retailer}/{period}\",retailer,data.RSV,amazon,100,10\n"
    bad_validation = client.post(
        f"/jin/api/v2/upload/{encoded}",
        files={"file": ("bad.csv", csv_payload, "text/csv")},
    )
    assert bad_validation.status_code == 400
    assert "Row validation failed" in bad_validation.json()["error"]
