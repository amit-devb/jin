from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import quote

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from jin.middleware import JinMiddleware
from jin.scheduler import JinScheduler
from jin.uploader import validate_upload_rows
import jin.middleware as middleware_module
import jin.router as router_module


def test_middleware_env_and_storage_error_branches(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JIN_RUNTIME_HISTORY_LIMIT", "not-a-number")
    monkeypatch.setenv("JIN_RUNTIME_ANOMALY_LIMIT", "bad")
    monkeypatch.setenv("JIN_INGEST_QUEUE_SIZE", "bad")
    monkeypatch.setenv("JIN_INGEST_WORKERS", "bad")
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase3-mw.duckdb"))

    class CaptureConn:
        def __init__(self) -> None:
            self.called = 0

        def execute(self, *_args, **_kwargs):
            self.called += 1
            return self

    capture = CaptureConn()
    middleware._ensure_watch_config_schema(capture)
    assert capture.called == 1
    middleware._ensure_check_runs_schema(capture)
    assert capture.called == 2

    merged = middleware.merge_upload_analysis_history(
        [{"analyzed_at": "2026-03-21 10:00:00", "status": "success"}],
        ["not-a-dict"],  # type: ignore[list-item]
        [{"analyzed_at": "2026-03-21 10:00:00", "status": "success"}],
    )
    assert len(merged) == 1

    class DummyLock:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

    class BrokenHistoryConn:
        def execute(self, *_args, **_kwargs):
            raise RuntimeError("history read failed")

    class RowsHistoryConn:
        def execute(self, *_args, **_kwargs):
            class Result:
                @staticmethod
                def fetchall():
                    return [
                        (None,),
                        ("{bad-json",),
                        ({"status": "ok"},),
                    ]

            return Result()

    middleware._get_connection = lambda: (_ for _ in ()).throw(RuntimeError("no-connection"))  # type: ignore[method-assign]
    assert middleware.load_upload_analysis_history("/api/sales/{retailer}/{period}") == []
    middleware._get_connection = lambda: (None, DummyLock())  # type: ignore[method-assign]
    assert middleware.load_upload_analysis_history("/api/sales/{retailer}/{period}") == []
    middleware._get_connection = lambda: (BrokenHistoryConn(), DummyLock())  # type: ignore[method-assign]
    assert middleware.load_upload_analysis_history("/api/sales/{retailer}/{period}") == []
    middleware._get_connection = lambda: (RowsHistoryConn(), DummyLock())  # type: ignore[method-assign]
    loaded = middleware.load_upload_analysis_history("/api/sales/{retailer}/{period}")
    assert loaded == [{"status": "ok"}]

    middleware._get_connection = lambda: (_ for _ in ()).throw(RuntimeError("no-connection"))  # type: ignore[method-assign]
    middleware._persist_upload_analysis("/api/sales/{retailer}/{period}", {"status": "success"})
    middleware._get_connection = lambda: (None, DummyLock())  # type: ignore[method-assign]
    middleware._persist_upload_analysis("/api/sales/{retailer}/{period}", {"status": "success"})

    class BrokenPersistConn:
        def execute(self, *_args, **_kwargs):
            raise RuntimeError("write failed")

    middleware._get_connection = lambda: (BrokenPersistConn(), DummyLock())  # type: ignore[method-assign]
    middleware._persist_upload_analysis("/api/sales/{retailer}/{period}", {"status": "success"})
    assert any(item["source"] == "upload.analysis.persist" for item in middleware.recent_errors)

    middleware._get_connection = lambda: (_ for _ in ()).throw(RuntimeError("no-connection"))  # type: ignore[method-assign]
    started_no_conn = middleware._record_check_run_start(
        "/api/sales/{retailer}/{period}",
        job_id="jin:/api/sales/{retailer}/{period}",
        trigger="manual",
        source="manual",
    )
    assert started_no_conn["status"] == "running"
    middleware._record_check_run_finish(
        started_no_conn["run_id"],
        status="success",
        started_at=started_no_conn["started_at"],
        grains_processed=1,
        anomalies_detected=0,
    )
    assert middleware.list_check_runs("/api/sales/{retailer}/{period}") == []

    class BrokenRunLedgerConn:
        def execute(self, *_args, **_kwargs):
            raise RuntimeError("run ledger write failed")

    middleware._get_connection = lambda: (BrokenRunLedgerConn(), DummyLock())  # type: ignore[method-assign]
    started_broken = middleware._record_check_run_start(
        "/api/sales/{retailer}/{period}",
        job_id="jin:/api/sales/{retailer}/{period}",
        trigger="manual",
        source="manual",
    )
    middleware._record_check_run_finish(
        started_broken["run_id"],
        status="error",
        started_at="not-a-date",
        grains_processed=0,
        anomalies_detected=0,
        error="boom",
    )
    assert any(item["source"] == "watch.run_ledger.start" for item in middleware.recent_errors)
    assert any(item["source"] == "watch.run_ledger.finish" for item in middleware.recent_errors)

    class RunRowsConn:
        def execute(self, sql: str, *_args, **_kwargs):
            if "SELECT" not in sql:
                return self

            class Result:
                @staticmethod
                def fetchall():
                    return [
                        (
                            "check-1",
                            "/api/sales/{retailer}/{period}",
                            "jin:/api/sales/{retailer}/{period}",
                            "manual",
                            "manual",
                            "success",
                            "2026-03-21 10:00:00",
                            "2026-03-21 10:00:01",
                            1000,
                            1,
                            0,
                            None,
                        )
                    ]

            return Result()

    middleware._get_connection = lambda: (RunRowsConn(), DummyLock())  # type: ignore[method-assign]
    listed = middleware.list_check_runs("/api/sales/{retailer}/{period}")
    assert listed[0]["run_id"] == "check-1"
    assert listed[0]["trigger"] == "manual"

    middleware.watch_overrides["/api/sales/{retailer}/{period}"] = "invalid"  # type: ignore[assignment]
    assert middleware._load_watch_override("/api/sales/{retailer}/{period}") == {}

    normalized = middleware._normalized_watch_config(
        {"default_params": "invalid", "threshold": "oops", "baseline_mode": "unsupported"}
    )
    assert normalized["default_params"] == {}
    assert normalized["baseline_mode"] == "fixed"
    assert "threshold" not in normalized

    import uuid

    def raise_getnode() -> int:
        raise RuntimeError("no node")

    monkeypatch.setattr(uuid, "getnode", raise_getnode)
    assert middleware._generate_site_id() == "unknown-site"

    monkeypatch.setattr(middleware_module, "get_status", None)
    assert middleware.calculate_trust_score() == 100.0

    def broken_status(_db_path: str) -> str:
        raise RuntimeError("native status boom")

    monkeypatch.setattr(middleware_module, "get_status", broken_status)
    assert middleware.calculate_trust_score() == 100.0

    custom_license_path = tmp_path / "custom-license-projects.json"
    monkeypatch.setenv("JIN_LICENSE_PROJECTS_PATH", str(custom_license_path))
    assert middleware._license_projects_registry_path() == custom_license_path.resolve()

    broken_registry = tmp_path / "broken-projects.json"
    broken_registry.write_text("{bad-json")
    assert middleware._load_license_projects_registry(broken_registry) == []
    broken_registry.write_text(json.dumps({"projects": []}))
    assert middleware._load_license_projects_registry(broken_registry) == []

    class BrokenRegistryPath:
        class Parent:
            @staticmethod
            def mkdir(*_args, **_kwargs):
                raise OSError("read-only")

        parent = Parent()

        @staticmethod
        def write_text(*_args, **_kwargs):
            raise OSError("read-only")

    middleware._save_license_projects_registry(BrokenRegistryPath(), ["project-a"])

    custom_catalog_path = tmp_path / "projects-catalog.json"
    custom_active_path = tmp_path / "active-project.json"
    monkeypatch.setenv("JIN_PROJECT_CATALOG_PATH", str(custom_catalog_path))
    monkeypatch.setenv("JIN_ACTIVE_PROJECT_PATH", str(custom_active_path))
    assert middleware._projects_catalog_path() == custom_catalog_path.resolve()
    assert middleware._active_project_path() == custom_active_path.resolve()

    monkeypatch.setattr(middleware, "_active_project_path", lambda: custom_active_path)
    if custom_active_path.exists():
        custom_active_path.unlink()
    assert middleware._load_active_project_id() is None
    custom_active_path.write_text("{bad-json")
    assert middleware._load_active_project_id() is None
    custom_active_path.write_text(json.dumps({"project_id": ""}))
    assert middleware._load_active_project_id() is None
    custom_active_path.write_text(json.dumps({"project_id": "project-1"}))
    assert middleware._load_active_project_id() == "project-1"
    middleware._save_active_project_id(None)
    assert custom_active_path.exists() is False

    monkeypatch.setattr(middleware, "_projects_catalog_path", lambda: custom_catalog_path)
    if custom_catalog_path.exists():
        custom_catalog_path.unlink()
    assert middleware._load_projects_catalog() == []
    custom_catalog_path.write_text("{bad-json")
    assert middleware._load_projects_catalog() == []
    custom_catalog_path.write_text(json.dumps({"projects": []}))
    assert middleware._load_projects_catalog() == []


def test_middleware_monitor_policy_validation_branches(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase3-policy.duckdb"))

    with pytest.raises(ValueError, match="Unsupported schedule format"):
        middleware._normalized_monitor_policy({"cadence_template": "custom", "schedule": "monthly 01:00"})

    with pytest.raises(ValueError, match="threshold must be a number"):
        middleware._normalized_monitor_policy({"cadence_template": "custom", "schedule": "every 2h", "threshold": "x"})

    with pytest.raises(ValueError, match="Unsupported bundle schedule format"):
        middleware._normalized_monitor_policy(
            {
                "cadence_template": "custom",
                "schedule": "every 2h",
                "bundle_enabled": True,
                "bundle_schedule": "monthly 09:00",
            }
        )

    normalized = middleware._normalized_monitor_policy(
        {
            "cadence_template": "not-real",
            "baseline_mode": "unsupported",
            "bundle_endpoint_paths": ["", "/api/sales/{retailer}/{period}", 123],
            "bundle_report_format": "html",
        },
        fallback={"schedule": "every 4h"},
    )
    assert normalized["cadence_template"] == "balanced"
    assert normalized["baseline_mode"] == "fixed"
    assert normalized["bundle_endpoint_paths"] == ["/api/sales/{retailer}/{period}"]
    assert normalized["bundle_report_format"] == "markdown"
    assert normalized["schedule"] == "every 2h"

    with_bundle_default = middleware._normalized_monitor_policy(
        {"cadence_template": "custom", "schedule": "every 2h", "bundle_enabled": True, "bundle_schedule": " "},
        fallback={"bundle_schedule": "daily 08:30"},
    )
    assert with_bundle_default["bundle_schedule"] == "daily 08:30"

    with_fallback_schedule = middleware._normalized_monitor_policy(
        {"cadence_template": "custom", "schedule": "   "},
        fallback={"schedule": "every 4h"},
    )
    assert with_fallback_schedule["schedule"] == "every 4h"


def test_router_auth_guarded_routes_and_register_errors(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JIN_AUTH_ENABLED", "true")
    monkeypatch.setenv("JIN_USERNAME", "operator")
    monkeypatch.setenv("JIN_PASSWORD", "secret-pass")
    monkeypatch.setenv("JIN_SESSION_SECRET", "phase3-session-secret")

    application = FastAPI()

    class DemoResponse(BaseModel):
        value: float

    @application.get("/api/demo", response_model=DemoResponse)
    async def demo() -> DemoResponse:
        return DemoResponse(value=42.0)

    application.add_middleware(JinMiddleware, db_path=str(tmp_path / "phase3-auth.duckdb"))

    with TestClient(application) as auth_client:
        po_guarded = auth_client.get("/jin/po", follow_redirects=False)
        assert po_guarded.status_code == 303
        assert po_guarded.headers["location"].startswith("/jin/login")

        assets_guarded = auth_client.get("/jin/assets/dashboard.js", follow_redirects=False)
        assert assets_guarded.status_code == 303
        assert assets_guarded.headers["location"].startswith("/jin/login")

        unauthorized_register = auth_client.post("/jin/api/v2/projects/register", json={"project_name": "x"})
        assert unauthorized_register.status_code == 401

        logged_in = auth_client.post(
            "/jin/login",
            data={"username": "operator", "password": "secret-pass", "next": "/jin"},
            follow_redirects=False,
        )
        assert logged_in.status_code == 303

        po_logged_in = auth_client.get("/jin/po", follow_redirects=False)
        assert po_logged_in.status_code == 303
        assert po_logged_in.headers["location"] == "/jin?y_view=playbook"

        missing_asset = auth_client.get("/jin/assets/not-found.css")
        assert missing_asset.status_code == 404

        invalid_register = auth_client.post(
            "/jin/api/v2/projects/register",
            json={"project_name": "test", "username": "ab", "password": "123"},
        )
        assert invalid_register.status_code == 400

        status_missing_project = auth_client.get("/jin/api/v2/status", params={"project_id": "missing-project"})
        assert status_missing_project.status_code == 404


def test_router_bundle_markdown_watch_config_and_manual_check_success(
    client,
    encoded_sales_path: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client.get("/api/sales/amazon/YTD?value=100")

    watch_payload = client.get(f"/jin/api/watch-config/{encoded_sales_path}")
    assert watch_payload.status_code == 200
    assert "supported_schedules" in watch_payload.json()

    middleware = client.app.middleware_stack.app

    def invalid_watch(_endpoint_path: str, _payload: dict[str, object]):
        raise ValueError("invalid schedule")

    monkeypatch.setattr(middleware, "upsert_watch_config", invalid_watch)
    bad_watch = client.post(f"/jin/api/watch-config/{encoded_sales_path}", json={"schedule": "monthly"})
    assert bad_watch.status_code == 400

    project_id = client.get("/jin/api/v2/projects/current").json()["project"]["id"]
    run_row = {
        "run_id": "run-phase3",
        "project_name": "phase3",
        "started_at": "2026-03-21 10:00:00",
        "finished_at": "2026-03-21 10:01:00",
        "status": "degraded",
        "requested": 2,
        "executed": 1,
        "success": 1,
        "errors": 1,
        "not_scheduled": 0,
        "results": [{"endpoint_path": "/api/sales/{retailer}/{period}", "status": "error", "job_id": "jin:/api/sales/{retailer}/{period}", "error": "boom"}],
    }
    monkeypatch.setattr(middleware, "list_bundle_runs", lambda _project_id, limit=200: [run_row])
    markdown_report = client.get(f"/jin/api/v2/projects/{project_id}/checks/run-phase3/report", params={"format": "markdown"})
    assert markdown_report.status_code == 200
    assert "Jin Bundle Run Report" in markdown_report.text
    assert "Endpoint Results" in markdown_report.text

    bundle_missing = client.get(f"/jin/api/v2/projects/{project_id}/checks/does-not-exist")
    assert bundle_missing.status_code == 404
    bundle_report_missing = client.get(f"/jin/api/v2/projects/{project_id}/checks/does-not-exist/report")
    assert bundle_report_missing.status_code == 404

    async def run_now_true(_job_id: str) -> bool:
        return True

    monkeypatch.setattr(middleware.scheduler, "run_now", run_now_true)
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
    started = client.post(f"/jin/api/v2/check/{encoded_sales_path}")
    assert started.status_code == 200
    assert started.json()["method"] == "scheduler"

    client.get("/api/sales/amazon/YTD?value=150")
    active_anomalies = client.get("/jin/api/v2/anomalies").json()["anomalies"]
    if active_anomalies:
        bulk_snooze = client.post(
            "/jin/api/v2/anomalies/bulk",
            json={
                "anomaly_ids": [active_anomalies[0]["id"]],
                "action": "snoozed",
                "snooze_minutes": 5,
            },
        )
        assert bulk_snooze.status_code == 200


def test_router_endpoint_detail_native_config_and_template_native(
    client,
    encoded_sales_path: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    client.get("/api/sales/amazon/YTD?value=100")

    monkeypatch.setattr(router_module, "get_endpoint_detail", None)
    monkeypatch.setattr(
        router_module,
        "config_show",
        lambda _db_path, _endpoint_path: json.dumps(
            {
                "http_method": "GET",
                "schema_contract": {
                    "fields": [{"name": "retailer"}, {"name": "period"}, {"name": "data.RSV"}],
                    "dimension_fields": ["retailer", "period"],
                    "kpi_fields": ["data.RSV"],
                },
                "config": {"dimension_fields": ["retailer", "period"], "kpi_fields": ["data.RSV"]},
            }
        ),
    )
    monkeypatch.setattr(
        router_module,
        "references_export",
        lambda _db_path, _endpoint_path: json.dumps(
            {
                "references": [
                    {
                        "grain_key": endpoint_path,
                        "kpi_field": "data.RSV",
                        "expected_value": 100.0,
                        "tolerance_pct": 10.0,
                        "upload_source": "csv",
                    }
                ]
            }
        ),
    )

    detail = client.get(f"/jin/api/v2/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["endpoint_path"] == endpoint_path
    assert detail_payload["dimension_fields"] == ["retailer", "period"]
    assert detail_payload["kpi_fields"] == ["data.RSV"]

    monkeypatch.setattr(
        router_module,
        "template_spec",
        lambda _db_path, _endpoint_path: json.dumps({"dimension_fields": ["retailer", "period"], "kpi_fields": ["data.RSV"]}),
    )
    template_csv = client.get(f"/jin/template/{encoded_sales_path}.csv")
    assert template_csv.status_code == 200
    assert "data.RSV" in template_csv.text

    template_xlsx = client.get(f"/jin/template/{encoded_sales_path}.xlsx")
    assert template_xlsx.status_code == 200
    assert template_xlsx.content


def test_middleware_dispatch_queue_fallback_without_license_gating(client, monkeypatch: pytest.MonkeyPatch) -> None:
    middleware = client.app.middleware_stack.app
    processed: list[str] = []

    async def fake_process(record, endpoint_path, method, request_json, data, config_json):  # noqa: ANN001
        processed.append(endpoint_path)

    middleware.async_ingest_enabled = True
    monkeypatch.setattr(middleware, "_enqueue_ingestion_task", lambda _payload: False)
    monkeypatch.setattr(middleware, "_process_observation_payload_async", fake_process)
    monkeypatch.setattr(middleware.license_client, "check_usage", lambda: True)

    first = client.get("/api/sales/amazon/YTD?value=111")
    assert first.status_code == 200
    assert "/api/sales/{retailer}/{period}" in processed

    processed_count = len(processed)
    monkeypatch.setattr(middleware.license_client, "check_usage", lambda: False)
    second = client.get("/api/sales/amazon/YTD?value=112")
    assert second.status_code == 200
    assert len(processed) == processed_count + 1


def test_scheduler_and_uploader_remaining_branches() -> None:
    scheduler = JinScheduler()

    class RemoveScheduler:
        @staticmethod
        def remove_job(_job_id: str) -> None:
            raise RuntimeError("cannot remove")

    scheduler.scheduler = RemoveScheduler()
    scheduler.jobs.add("job-remove")
    scheduler.skipped_jobs["job-skipped"] = {"job_id": "job-skipped"}
    assert scheduler.remove("job-remove") is True
    assert scheduler.remove("job-skipped") is True
    assert scheduler.remove("missing") is False

    assert scheduler._interval_hours("daily 09:00") is None
    assert scheduler.is_supported_schedule(None) is False
    assert scheduler._parse_schedule("every 0h") is None
    assert scheduler._parse_schedule("weekly moo 09:00") is None

    dims, kpis, normalized, _warnings = validate_upload_rows(
        [{"Retailer Name": "amazon", "Sales Amount": "120", "tolerance_pct": "9"}],
        {"retailer", "amount"},
        endpoint="/api/sales/{retailer}/{period}",
        dimension_fields=["retailer"],
        kpi_fields=["amount"],
    )
    assert dims == ["retailer"]
    assert kpis == ["amount"]
    assert normalized[0]["expected"]["amount"] == 120.0

    internal_rows = [
        {
            "endpoint": "/api/sales/{retailer}/{period}",
            "dimension_fields": "retailer,api_version",
            "kpi_fields": "amount",
            "grain_retailer": "",
            "grain_api_version": "",
            "expected_amount": "",
            "tolerance_pct": "10",
        }
    ]
    dims2, kpis2, normalized2, _warnings2 = validate_upload_rows(
        internal_rows,
        {"retailer", "api_version", "amount"},
        technical_defaults={"api_version": ""},
    )
    assert dims2 == ["retailer", "api_version"]
    assert kpis2 == ["amount"]
    assert normalized2[0]["expected"] == {}
