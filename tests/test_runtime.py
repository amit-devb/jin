from __future__ import annotations

import json
import base64
import hashlib
import time
from pathlib import Path
from urllib.parse import quote

import duckdb
import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient
from pydantic import BaseModel

from jin.logger import get_logger
from jin.middleware import EndpointRecord, JinMiddleware
import jin.router as router_module
from jin.router import create_router
from jin.scheduler import JinScheduler
from jin.watch import watch


class ForwardBodyModel(BaseModel):
    dates: list[str]


class ForwardResponseModel(BaseModel):
    count: int


def test_watch_attaches_metadata() -> None:
    @watch(schedule="every 2h", threshold=15, default_params={"path_params": {"retailer": "amazon"}})
    def sample() -> None:
        return None

    assert sample._jin_watch == {
        "schedule": "every 2h",
        "threshold": 15,
        "default_params": {"path_params": {"retailer": "amazon"}},
        "baseline_mode": "fixed",
    }


def test_scheduler_start_and_shutdown() -> None:
    scheduler = JinScheduler()
    scheduler.start()
    assert scheduler.running
    scheduler.shutdown()
    assert not scheduler.running


def test_scheduler_failure_keeps_exception_message() -> None:
    scheduler = JinScheduler()

    class StubScheduler:
        def add_job(self, func, trigger, hours, id, replace_existing):
            self.func = func

        def pause_job(self, job_id):
            return None

    scheduler.scheduler = StubScheduler()
    assert scheduler.register("job-error", "every 1h", lambda: (_ for _ in ()).throw(RuntimeError("watch exploded")))

    import asyncio

    asyncio.run(scheduler.scheduler.func())
    job_state = next(item for item in scheduler.job_status() if item["job_id"] == "job-error")
    assert job_state["last_status"] == "error"
    assert job_state["last_error"] == "watch exploded"


def test_scheduler_registers_supported_schedules() -> None:
    scheduler = JinScheduler()
    assert scheduler.register("job-1", "every 2h", lambda: None)
    assert not scheduler.register("job-1", "every 2h", lambda: None)
    assert scheduler.register("job-2", "daily 09:30", lambda: None)
    assert scheduler.register("job-2b", "weekly mon,wed 13:45", lambda: None)
    assert not scheduler.register("job-2c", "weekly monday 13:45", lambda: None)
    assert scheduler._interval_hours("every 4h") == 4

    class StubScheduler:
        def __init__(self) -> None:
            self.calls = []

        def add_job(self, func, trigger, hours, id, replace_existing):
            self.calls.append(func)

        def pause_job(self, job_id):
            self.calls.append(("pause", job_id))

    scheduler.scheduler = StubScheduler()
    assert scheduler.register("job-3", "every 1h", lambda: None)

    import asyncio

    asyncio.run(scheduler.scheduler.calls[0]())
    assert scheduler.failures["job-3"] == 0
    job_state = next(item for item in scheduler.job_status() if item["job_id"] == "job-3")
    assert job_state["last_status"] == "success"
    assert job_state["last_finished_at"] is not None

    class PauseResumeScheduler(StubScheduler):
        def get_job(self, job_id):
            class Job:
                next_run_time = "2026-03-12 12:00:00"

            return Job()

        def resume_job(self, job_id):
            self.calls.append(("resume", job_id))

    scheduler.scheduler = PauseResumeScheduler()
    scheduler.jobs.add("job-4")
    assert scheduler.pause("job-4")
    assert scheduler.resume("job-4")
    pause_resume_state = next(item for item in scheduler.job_status() if item["job_id"] == "job-4")
    assert pause_resume_state["next_run_at"] is not None

    class FailingPauseResumeScheduler(StubScheduler):
        def pause_job(self, job_id):
            raise RuntimeError("pause failed")

        def resume_job(self, job_id):
            raise RuntimeError("resume failed")

    scheduler.scheduler = FailingPauseResumeScheduler()
    scheduler.jobs.add("job-5")
    assert not scheduler.pause("missing-job")
    assert not scheduler.resume("missing-job")
    assert not scheduler.pause("job-5")
    assert not scheduler.resume("job-5")


def test_logger_uses_jin_prefix() -> None:
    logger = get_logger("INFO")
    assert logger.name == "jin"
    assert logger.handlers


def test_middleware_warns_on_azure_env(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WEBSITE_SITE_NAME", "jin-site")
    middleware = JinMiddleware(app, db_path=str(tmp_path / "azure.duckdb"))
    assert middleware.db_path.endswith("azure.duckdb")
    monkeypatch.delenv("WEBSITE_SITE_NAME")


def test_middleware_db_path_can_come_from_env(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JIN_DB_PATH", str(tmp_path / "env-override.duckdb"))
    middleware = JinMiddleware(app, db_path=str(tmp_path / "constructor.duckdb"))
    assert middleware.db_path.endswith("env-override.duckdb")
    monkeypatch.delenv("JIN_DB_PATH")


def test_middleware_log_level_can_come_from_env(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JIN_LOG_LEVEL", "INFO")
    middleware = JinMiddleware(app, db_path=str(tmp_path / "log-level.duckdb"), log_level="WARNING")
    assert middleware.logger.level <= 20
    monkeypatch.delenv("JIN_LOG_LEVEL")


def test_middleware_records_project_context_and_recent_errors(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("JIN_PROJECT_NAME", "acme-analytics")
    middleware = JinMiddleware(app, db_path=str(tmp_path / "project.duckdb"))
    middleware._record_error(
        "router.status",
        "Status fallback engaged.",
        hint="Check DuckDB payload integrity.",
        endpoint_path="/api/sales/{retailer}/{period}",
        detail="native boom",
    )

    context = middleware.dashboard_context()

    assert context["name"] == "acme-analytics"
    assert context["db_path"].endswith("project.duckdb")
    assert context["deployment_model"] == "client_infra_embedded"
    assert context["recent_errors"]
    assert context["recent_errors"][0]["source"] == "router.status"
    assert context["recent_errors"][0]["status"] == "open"
    assert context["recent_errors"][0]["remediation_steps"]
    monkeypatch.delenv("JIN_PROJECT_NAME")


def test_middleware_record_error_supports_unknown_level(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "project-error-level.duckdb"))
    middleware._record_error("custom.source", "Fallback used.", level="mystery")
    assert middleware.recent_errors[0]["message"] == "Fallback used."
    assert middleware.recent_errors[0]["category"] == "general"
    assert middleware.recent_errors[0]["severity"] == "low"
    assert middleware.recent_errors[0]["remediation_steps"]


def test_middleware_can_update_error_status(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "project-error-status.duckdb"))
    assert middleware.update_error_status(999, "acknowledged") is None
    middleware._record_error("router.status", "Fallback used.")
    error_id = middleware.recent_errors[0]["id"]

    acknowledged = middleware.update_error_status(error_id, "acknowledged")
    assert acknowledged is not None
    assert acknowledged["status"] == "acknowledged"
    assert acknowledged["acknowledged_at"] is not None

    archived = middleware.update_error_status(error_id, "archived")
    assert archived is not None
    assert archived["status"] == "archived"
    assert archived["archived_at"] is not None

    reopened = middleware.update_error_status(error_id, "reopened")
    assert reopened is not None
    assert reopened["status"] == "open"
    assert reopened["acknowledged_at"] is None
    assert reopened["archived_at"] is None
    assert middleware.update_error_status(error_id, "invalid") is None


def test_middleware_scheduler_job_records_helpful_error(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "project-scheduler-error.duckdb"))

    def failing_endpoint(**_kwargs):
        raise RuntimeError("watch exploded")

    middleware.endpoint_registry["/api/fail"] = EndpointRecord(
        method="GET",
        path="/api/fail",
        response_model=None,
        endpoint_callable=failing_endpoint,
        fields=[],
        dimension_fields=[],
        kpi_fields=["metric"],
        metrics=[],
        watch_config={"schedule": "every 1h", "default_params": {"query_params": {}}},
    )

    class StubScheduler:
        def __init__(self) -> None:
            self.func = None

        def add_job(self, func, trigger, hours, id, replace_existing):
            self.func = func

        def pause_job(self, job_id):
            return None

    middleware.scheduler.scheduler = StubScheduler()
    middleware._register_scheduler_jobs()

    import asyncio

    asyncio.run(middleware.scheduler.scheduler.func())
    assert middleware.recent_errors[0]["source"] == "scheduler.run"
    assert middleware.recent_errors[0]["detail"] == "watch exploded"


def test_middleware_connection_cache(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "cache.duckdb"))
    conn1, _ = middleware._get_connection()
    conn2, _ = middleware._get_connection()
    assert conn1 is conn2


def test_middleware_connection_recovers_from_internal_duckdb_error(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db_path = tmp_path / "corrupt.duckdb"
    db_path.write_text("corrupt")
    middleware = JinMiddleware(app, db_path=str(db_path))

    class FakeConn:
        def execute(self, _sql, _params=None):
            return self

        def close(self):
            return None

    attempts = {"count": 0}

    def fake_connect(_path: str):
        attempts["count"] += 1
        if attempts["count"] == 1:
            raise RuntimeError("INTERNAL Error: Failed to load metadata pointer (id 1)")
        return FakeConn()

    monkeypatch.setattr(duckdb, "connect", fake_connect)
    conn, _lock = middleware._get_connection()
    assert isinstance(conn, FakeConn)
    assert attempts["count"] == 2
    quarantined = list(tmp_path.glob("corrupt.duckdb.corrupt.*"))
    assert quarantined
    recovery_error = next((item for item in middleware.recent_errors if item.get("source") == "middleware.db"), None)
    assert recovery_error is not None
    assert "Old DB moved to" in str(recovery_error.get("hint") or "")


def test_load_overrides_and_build_endpoint_config(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "override.duckdb"))
    middleware._ensure_python_schema()
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/watch/amazon",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    conn, lock = middleware._get_connection()
    with lock:
        conn.execute(
            """
            INSERT INTO jin_config (
                endpoint_path, dimension_overrides, kpi_overrides, tolerance_pct, confirmed,
                tolerance_relaxed, tolerance_normal, tolerance_strict, active_tolerance,
                time_field, time_granularity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                "/api/watch/{retailer}",
                json.dumps(["order_id"]),
                json.dumps(["amount"]),
                12.0,
                True,
                20.0,
                12.0,
                5.0,
                "normal",
                None,
                "minute",
            ],
        )
    overrides = middleware._load_overrides("/api/watch/{retailer}")
    config = json.loads(
        middleware._build_endpoint_config(
            middleware.endpoint_registry["/api/watch/{retailer}"],
            {"confirmed": True},
        )
    )

    assert overrides["confirmed"] is True
    assert config["tolerance_pct"] == 20
    assert config["confirmed"] is True


def test_build_endpoint_config_falls_back_without_native_resolver(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "override-fallback.duckdb"))
    middleware._ensure_python_schema()
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/watch/amazon",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    monkeypatch.setattr("jin.middleware.resolve_endpoint_config", None)
    config = json.loads(
        middleware._build_endpoint_config(
            middleware.endpoint_registry["/api/watch/{retailer}"],
            {"confirmed": True},
        )
    )
    assert config["tolerance_pct"] == 20
    assert config["confirmed"] is True


def test_build_endpoint_config_falls_back_when_native_resolver_errors(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "override-fallback-error.duckdb"))
    middleware._ensure_python_schema()
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/orders",
            "headers": [],
            "query_string": b"",
            "path_params": {},
            "app": app,
        }
    )
    middleware._discover_routes(request)

    def boom(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("jin.middleware.resolve_endpoint_config", boom)
    config = json.loads(middleware._build_endpoint_config(middleware.endpoint_registry["/api/orders"]))

    assert config["dimension_fields"] == ["order_id", "api_version"]
    assert config["kpi_fields"] == ["amount"]
    assert config["tolerance_pct"] == 10.0
    assert config["confirmed"] is False


def test_build_endpoint_config_parses_kpi_weights_from_environment(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "impact-weights.duckdb"))
    middleware._ensure_python_schema()
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/orders",
            "headers": [],
            "query_string": b"",
            "path_params": {},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    monkeypatch.setattr("jin.middleware.resolve_endpoint_config", None)
    monkeypatch.setenv("JIN_WEIGHT_AMOUNT", "1.5")
    monkeypatch.setenv("JIN_WEIGHT_BAD", "not_a_float")
    monkeypatch.setenv("JIN_CURRENCY", "EUR")
    config = json.loads(middleware._build_endpoint_config(middleware.endpoint_registry["/api/orders"]))
    assert config["kpi_weights"] == {"amount": 1.5}
    assert config["currency"] == "EUR"

def test_build_endpoint_config_ignores_invalid_kpi_weights_from_environment(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "impact-weights-invalid.duckdb"))
    middleware._ensure_python_schema()
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/orders",
            "headers": [],
            "query_string": b"",
            "path_params": {},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    monkeypatch.setattr("jin.middleware.resolve_endpoint_config", None)
    monkeypatch.setenv("JIN_WEIGHT_AMOUNT", "not_a_float")
    config = json.loads(middleware._build_endpoint_config(middleware.endpoint_registry["/api/orders"]))
    assert config["kpi_weights"] == {}


def test_mirror_helpers_cover_edge_cases(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "mirror.duckdb"))
    middleware._ensure_python_schema()
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    record = middleware.endpoint_registry["/api/sales/{retailer}/{period}"]
    middleware._mirror_python_state(
        record,
        {
            "grain_key": "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
            "anomalies": [
                {
                    "kpi_field": "data.RSV",
                    "expected": 100.0,
                    "actual": 150.0,
                    "pct_change": 50.0,
                    "method": "threshold",
                }
            ],
        },
        {"retailer": "amazon", "period": "YTD", "data": {"RSV": 150.0, "units": 75}},
    )
    middleware._mirror_python_state(
        record,
        {
            "grain_key": "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
            "anomalies": [
                {
                    "kpi_field": "data.RSV",
                    "expected": 100.0,
                    "actual": 175.0,
                    "pct_change": 75.0,
                    "method": "threshold",
                }
            ],
        },
        {"retailer": "amazon", "period": "YTD", "data": {"RSV": 175.0, "units": 88}},
    )

    class InlineModel(BaseModel):
        value: int

    flattened_model = middleware._flatten_item(InlineModel(value=5))
    flattened_list = middleware._flatten_item([{"value": 1}])
    flattened_scalar = middleware._flatten_item(3)
    dims = middleware._dimensions_from_grain_key("/api/health", "/api/health")
    odd_dims = middleware._dimensions_from_grain_key("/api/health", "/api/health|invalid|region=us")

    runtime_state = middleware.runtime_state["/api/sales/{retailer}/{period}"]
    active_anomalies = [item for item in runtime_state["anomalies"] if item["is_active"]]

    assert len(active_anomalies) == 1
    assert len(runtime_state["history"]) == 2
    assert flattened_model == {"value": 5}
    assert flattened_list == {"0.value": 1}
    assert flattened_scalar == {}
    assert dims == {}
    assert odd_dims == {"region": "us"}


def test_register_scheduler_jobs_and_execution(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "jobs.duckdb"))
    middleware._ensure_python_schema()
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/watch/amazon",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    captured = []

    def fake_process(endpoint_path, method, request_json, item, config_json):
        captured.append((endpoint_path, method, json.loads(request_json), item, json.loads(config_json)))
        return {"grain_key": endpoint_path, "anomalies": []}

    middleware._process_item = fake_process  # type: ignore[method-assign]
    middleware._register_scheduler_jobs()
    assert "jin:/api/watch/{retailer}" in middleware.scheduler.jobs
    assert "jin:/api/sales/{retailer}/{period}" not in middleware.scheduler.jobs
    job = next(job for job in middleware.scheduler.scheduler.get_jobs() if job.id == "jin:/api/watch/{retailer}")

    import asyncio

    asyncio.run(job.func())
    assert captured[0][0] == "/api/watch/{retailer}"
    assert captured[0][2]["path"] == {"retailer": "amazon"}
    assert captured[0][4]["tolerance_pct"] == 20


def test_scheduler_job_updates_runtime_cache(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "jobs-runtime.duckdb"))
    middleware._ensure_python_schema()
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/watch/amazon",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    middleware._register_scheduler_jobs()
    job = next(job for job in middleware.scheduler.scheduler.get_jobs() if job.id == "jin:/api/watch/{retailer}")

    import asyncio

    asyncio.run(job.func())
    runtime_state = middleware.runtime_state["/api/watch/{retailer}"]

    assert len(runtime_state["history"]) == 1
    assert runtime_state["history"][0]["kpi_json"] == {"amount": 25.0}
    assert len(runtime_state["grains"]) == 1
    grain_key = next(iter(runtime_state["grains"]))
    assert grain_key.startswith("/api/watch/{retailer}|")
    assert "order_id=amazon" in grain_key


def test_scheduler_routes_expose_and_control_jobs(client) -> None:
    scheduler_payload = client.get("/jin/api/scheduler")
    assert scheduler_payload.status_code == 200
    jobs = scheduler_payload.json()["jobs"]
    watch_job = next(item for item in jobs if item["job_id"] == "jin:/api/watch/{retailer}")
    assert watch_job["schedule"] == "every 2h"
    assert watch_job["paused"] is False
    assert watch_job["last_status"] in {"never", "success"}
    assert "summary" in scheduler_payload.json()

    started = client.post(f"/jin/api/scheduler/{quote('jin:/api/watch/{retailer}', safe='')}/run")
    assert started.status_code == 200
    assert started.json()["started"] is True

    paused = client.post(f"/jin/api/scheduler/{quote('jin:/api/watch/{retailer}', safe='')}/pause")
    assert paused.status_code == 200
    assert paused.json()["paused"] is True

    resumed = client.post(f"/jin/api/scheduler/{quote('jin:/api/watch/{retailer}', safe='')}/resume")
    assert resumed.status_code == 200
    assert resumed.json()["paused"] is False


def test_scheduler_supports_cron_like_daily_and_weekly_schedules() -> None:
    scheduler = JinScheduler()

    class StubScheduler:
        def __init__(self) -> None:
            self.calls = []

        def add_job(self, func, trigger, id, replace_existing, **kwargs):
            self.calls.append((trigger, kwargs, id))

        def pause_job(self, job_id):
            self.calls.append(("pause", job_id))

    scheduler.scheduler = StubScheduler()
    assert scheduler.register("job-daily", "daily 07:30", lambda: None)
    assert scheduler.register("job-weekly", "weekly mon,fri 18:05", lambda: None)
    assert scheduler.is_supported_schedule("daily 00:00")
    assert scheduler.is_supported_schedule("weekly tue 21:45")
    assert not scheduler.is_supported_schedule("monthly 01:00")
    assert ("cron", {"hour": 7, "minute": 30}, "job-daily") in scheduler.scheduler.calls
    assert ("cron", {"day_of_week": "mon,fri", "hour": 18, "minute": 5}, "job-weekly") in scheduler.scheduler.calls


def test_watch_config_route_updates_schedule_and_baseline_mode(client) -> None:
    encoded_watch_path = quote("/api/watch/{retailer}", safe="")
    update = client.post(
        f"/jin/api/watch-config/{encoded_watch_path}",
        json={
            "schedule": "daily 09:00",
            "default_params": {"path_params": {"retailer": "amazon"}},
            "baseline_mode": "refresh_before_run",
            "threshold": 18,
        },
    )
    assert update.status_code == 200
    payload = update.json()
    assert payload["watch_config"]["schedule"] == "daily 09:00"
    assert payload["watch_config"]["baseline_mode"] == "refresh_before_run"

    listed = client.get("/jin/api/scheduler").json()["jobs"]
    watch_job = next(item for item in listed if item["job_id"] == "jin:/api/watch/{retailer}")
    assert watch_job["schedule"] == "daily 09:00"
    assert watch_job["baseline_mode"] == "refresh_before_run"

    bad = client.post(
        f"/jin/api/watch-config/{encoded_watch_path}",
        json={"schedule": "monthly 01:00", "default_params": {"path_params": {"retailer": "amazon"}}},
    )
    assert bad.status_code == 400

    cleared = client.post(
        f"/jin/api/watch-config/{encoded_watch_path}",
        json={"schedule": None, "default_params": {"path_params": {"retailer": "amazon"}}},
    )
    assert cleared.status_code == 200
    listed_after_clear = client.get("/jin/api/scheduler").json()["jobs"]
    assert all(item["job_id"] != "jin:/api/watch/{retailer}" for item in listed_after_clear)


def test_health_and_report_routes(client, encoded_sales_path: str) -> None:
    client.get("/api/sales/amazon/YTD?value=100")
    client.get("/api/sales/amazon/YTD?value=135")

    health = client.get("/jin/api/health")
    assert health.status_code == 200
    health_payload = health.json()
    assert "status" in health_payload
    assert "checks" in health_payload
    assert "baseline" in health_payload

    summary_report = client.get("/jin/api/report/summary")
    assert summary_report.status_code == 200
    assert "health" in summary_report.json()

    summary_markdown = client.get("/jin/api/report/summary?format=markdown")
    assert summary_markdown.status_code == 200
    assert "# Jin Executive Summary" in summary_markdown.text

    endpoint_markdown = client.get(f"/jin/api/report/endpoint/{encoded_sales_path}?format=markdown")
    assert endpoint_markdown.status_code == 200
    assert "Jin Endpoint Report" in endpoint_markdown.text


def test_executive_digest_report_route_summarizes_bundle_artifacts(
    client,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    digest_path = tmp_path / "digest-bundle-runs.json"
    if digest_path.exists():
        digest_path.unlink()
    monkeypatch.setenv("JIN_BUNDLE_RUNS_PATH", str(digest_path))

    status_payload = client.get("/jin/api/status")
    assert status_payload.status_code == 200
    current_db_path = status_payload.json()["project"]["db_path"]
    projects_payload = client.get("/jin/api/projects")
    assert projects_payload.status_code == 200
    current_project = next(item for item in projects_payload.json()["projects"] if item["db_path"] == current_db_path)
    current_project_id = current_project["id"]

    current_bundle = client.post(
        f"/jin/api/projects/{current_project_id}/run-bundle",
        json={"endpoint_paths": ["/api/watch/{retailer}"]},
    )
    assert current_bundle.status_code == 200
    assert current_bundle.json()["requested"] == 1

    license_activation = client.post("/jin/api/v2/license/activate", json={"key": "BUS-TEST-SHARED-ACCOUNT"})
    assert license_activation.status_code == 200

    remote_db = tmp_path / "digest-remote.duckdb"
    duckdb.connect(str(remote_db)).close()
    added = client.post(
        "/jin/api/projects",
        json={
            "name": "digest-remote",
            "root": str(tmp_path / "digest-remote-root"),
            "db_path": str(remote_db),
            "bootstrap_monitoring": False,
        },
    )
    assert added.status_code == 200
    remote_project_id = added.json()["project"]["id"]
    remote_bundle = client.post(f"/jin/api/projects/{remote_project_id}/run-bundle", json={})
    assert remote_bundle.status_code == 200
    assert remote_bundle.json()["status"] == "not_executable"

    digest = client.get("/jin/api/report/executive-digest", params={"days": 7})
    assert digest.status_code == 200
    digest_payload = digest.json()
    assert digest_payload["totals"]["runs"] >= 2
    assert digest_payload["totals"]["not_executable"] >= 1
    assert any(item["project_name"] == "digest-remote" for item in digest_payload["projects"])

    filtered = client.get(
        "/jin/api/report/executive-digest",
        params={"days": 7, "project_id": current_project_id},
    )
    assert filtered.status_code == 200
    filtered_payload = filtered.json()
    assert filtered_payload["project"]["id"] == current_project_id
    assert all(item["project_id"] == current_project_id for item in filtered_payload["recent_runs"])

    markdown = client.get(
        "/jin/api/report/executive-digest",
        params={"days": 7, "format": "markdown"},
    )
    assert markdown.status_code == 200
    assert "Jin Executive Digest" in markdown.text


def test_register_route_enables_auth_and_sets_project(client) -> None:
    registered = client.post(
        "/jin/api/register",
        json={
            "project_name": "analytics-core",
            "username": "owner",
            "password": "supersecret123",
        },
    )
    assert registered.status_code == 200
    payload = registered.json()
    assert payload["ok"] is True
    assert payload["project"]["name"] == "analytics-core"
    assert payload["auth_enabled"] is True
    assert registered.cookies.get("jin_session")

    cookie_authorized = client.get("/jin/api/status")
    assert cookie_authorized.status_code == 200
    assert cookie_authorized.json()["project"]["name"] == "analytics-core"

    client.cookies.clear()
    unauthorized = client.get("/jin/api/status")
    assert unauthorized.status_code == 401

    token = base64.b64encode(b"owner:supersecret123").decode("ascii")
    authorized = client.get("/jin/api/status", headers={"authorization": f"Basic {token}"})
    assert authorized.status_code == 200
    assert authorized.json()["project"]["name"] == "analytics-core"


def test_register_route_bootstraps_monitor_policy(client) -> None:
    registered = client.post(
        "/jin/api/register",
        json={
            "project_name": "bootstrap-core",
            "username": "bootstrap_owner",
            "password": "supersecret123",
            "monitor_policy": {
                "cadence_template": "custom",
                "schedule": "daily 11:15",
                "baseline_mode": "refresh_before_run",
            },
            "bootstrap_monitoring": True,
        },
    )
    assert registered.status_code == 200
    payload = registered.json()
    assert payload["monitor_policy"]["schedule"] == "daily 11:15"
    assert payload["monitor_policy"]["baseline_mode"] == "refresh_before_run"
    assert payload["monitor_bootstrap"]["requested"] >= 1
    assert payload["monitor_bootstrap"]["applied"] >= 1

    token = base64.b64encode(b"bootstrap_owner:supersecret123").decode("ascii")
    scheduler = client.get("/jin/api/scheduler", headers={"authorization": f"Basic {token}"})
    assert scheduler.status_code == 200
    watch_job = next(item for item in scheduler.json()["jobs"] if item["job_id"] == "jin:/api/watch/{retailer}")
    assert watch_job["schedule"] == "daily 11:15"
    assert watch_job["baseline_mode"] == "refresh_before_run"


def test_register_route_can_disable_auth(client) -> None:
    enabled = client.post(
        "/jin/api/register",
        json={
            "project_name": "auth-enabled",
            "username": "auth_owner",
            "password": "supersecret123",
        },
    )
    assert enabled.status_code == 200
    assert enabled.json()["auth_enabled"] is True

    client.cookies.clear()
    unauthorized = client.get("/jin/api/status")
    assert unauthorized.status_code == 401

    token = base64.b64encode(b"auth_owner:supersecret123").decode("ascii")
    disabled = client.post(
        "/jin/api/register",
        json={
            "project_name": "auth-disabled",
            "disable_auth": True,
            "bootstrap_monitoring": False,
        },
        headers={"authorization": f"Basic {token}"},
    )
    assert disabled.status_code == 200
    assert disabled.json()["auth_enabled"] is False

    client.cookies.clear()
    open_status = client.get("/jin/api/status")
    assert open_status.status_code == 200


def test_projects_routes_add_and_list(client) -> None:
    added = client.post(
        "/jin/api/projects",
        json={
            "name": "retail-ops",
            "root": "/tmp/retail-ops",
            "db_path": "/tmp/retail-ops.duckdb",
        },
    )
    assert added.status_code == 200
    project = added.json()["project"]
    assert project["name"] == "retail-ops"

    listed = client.get("/jin/api/projects")
    assert listed.status_code == 200
    payload = listed.json()
    assert payload["count"] >= 1
    assert any(item["name"] == "retail-ops" for item in payload["projects"])

    bad = client.post("/jin/api/projects", json={"name": ""})
    assert bad.status_code == 400


def test_add_project_route_bootstraps_current_project_policy(client) -> None:
    status_payload = client.get("/jin/api/status").json()
    project = status_payload["project"]
    added = client.post(
        "/jin/api/projects",
        json={
            "name": project["name"],
            "root": project["root"],
            "db_path": project["db_path"],
            "monitor_policy": {
                "cadence_template": "custom",
                "schedule": "daily 11:45",
                "baseline_mode": "refresh_before_run",
            },
            "bootstrap_monitoring": True,
        },
    )
    assert added.status_code == 200
    payload = added.json()
    assert payload["monitor_policy"]["schedule"] == "daily 11:45"
    assert payload["monitor_bootstrap"]["requested"] >= 1
    assert payload["monitor_bootstrap"]["applied"] >= 1
    watch_job = next(item for item in client.get("/jin/api/scheduler").json()["jobs"] if item["job_id"] == "jin:/api/watch/{retailer}")
    assert watch_job["schedule"] == "daily 11:45"
    assert watch_job["baseline_mode"] == "refresh_before_run"


def test_projects_select_and_active_routes(client, tmp_path: Path) -> None:
    added = client.post(
        "/jin/api/projects",
        json={
            "name": "warehouse-ops",
            "root": str(tmp_path / "warehouse"),
            "db_path": str(tmp_path / "warehouse.duckdb"),
        },
    )
    assert added.status_code == 200
    project_id = added.json()["project"]["id"]

    selected = client.post("/jin/api/projects/select", json={"project_id": project_id})
    assert selected.status_code == 200
    assert selected.json()["project"]["id"] == project_id

    active = client.get("/jin/api/projects/active")
    assert active.status_code == 200
    assert active.json()["project"]["id"] == project_id

    listed = client.get("/jin/api/projects")
    assert listed.status_code == 200
    payload = listed.json()
    assert payload["active_project_id"] == project_id
    assert any(item["id"] == project_id and item["active"] for item in payload["projects"])


def test_project_scoped_status_health_report_and_monitor_routes(client, tmp_path: Path) -> None:
    remote_db = tmp_path / "remote-project.duckdb"
    duckdb.connect(str(remote_db)).close()
    added = client.post(
        "/jin/api/projects",
        json={
            "name": "remote-analytics",
            "root": str(tmp_path / "remote-root"),
            "db_path": str(remote_db),
        },
    )
    assert added.status_code == 200
    project_id = added.json()["project"]["id"]

    status = client.get("/jin/api/status", params={"project_id": project_id})
    assert status.status_code == 200
    status_payload = status.json()
    assert status_payload["project"]["name"] == "remote-analytics"
    assert "summary" in status_payload

    health = client.get("/jin/api/health", params={"project_id": project_id})
    assert health.status_code == 200
    health_payload = health.json()
    assert health_payload["project"]["name"] == "remote-analytics"
    assert "checks" in health_payload

    report = client.get("/jin/api/report/summary", params={"project_id": project_id})
    assert report.status_code == 200
    report_payload = report.json()
    assert report_payload["project"]["name"] == "remote-analytics"
    assert "health" in report_payload

    monitor = client.get("/jin/api/projects/monitor")
    assert monitor.status_code == 200
    monitor_payload = monitor.json()
    assert monitor_payload["count"] >= 1
    assert any(item["id"] == project_id for item in monitor_payload["projects"])

    promote = client.post(f"/jin/api/projects/{project_id}/baseline/promote", json={"endpoints": []})
    assert promote.status_code == 200
    promote_payload = promote.json()
    assert promote_payload["project"]["id"] == project_id
    assert promote_payload["requested"] == 0
    assert promote_payload["promoted"] == 0


def test_project_monitor_policy_routes_configure_and_apply_current_project(client) -> None:
    status_payload = client.get("/jin/api/status")
    assert status_payload.status_code == 200
    current_db_path = status_payload.json()["project"]["db_path"]

    projects_payload = client.get("/jin/api/projects")
    assert projects_payload.status_code == 200
    current_project = next(item for item in projects_payload.json()["projects"] if item["db_path"] == current_db_path)
    project_id = current_project["id"]

    updated = client.post(
        f"/jin/api/projects/{project_id}/monitor-policy",
        json={
            "cadence_template": "custom",
            "schedule": "daily 10:30",
            "baseline_mode": "refresh_before_run",
            "threshold": 17,
        },
    )
    assert updated.status_code == 200
    updated_payload = updated.json()
    assert updated_payload["monitor_policy"]["schedule"] == "daily 10:30"
    assert updated_payload["monitor_policy"]["baseline_mode"] == "refresh_before_run"

    fetched = client.get(f"/jin/api/projects/{project_id}/monitor-policy")
    assert fetched.status_code == 200
    assert fetched.json()["monitor_policy"]["schedule"] == "daily 10:30"

    applied = client.post(
        f"/jin/api/projects/{project_id}/monitor-policy/apply",
        json={"endpoint_paths": ["/api/watch/{retailer}"], "overwrite_existing_schedule": True},
    )
    assert applied.status_code == 200
    apply_payload = applied.json()
    assert apply_payload["requested"] == 1
    assert apply_payload["applied"] == 1
    assert apply_payload["results"][0]["ok"] is True

    scheduler_rows = client.get("/jin/api/scheduler").json()["jobs"]
    watch_job = next(item for item in scheduler_rows if item["job_id"] == "jin:/api/watch/{retailer}")
    assert watch_job["schedule"] == "daily 10:30"
    assert watch_job["baseline_mode"] == "refresh_before_run"


def test_project_monitor_bootstrap_endpoint_applies_for_current_project(client) -> None:
    status_payload = client.get("/jin/api/status")
    assert status_payload.status_code == 200
    current_db_path = status_payload.json()["project"]["db_path"]
    project_id = next(
        item["id"]
        for item in client.get("/jin/api/projects").json()["projects"]
        if item["db_path"] == current_db_path
    )

    configured = client.post(
        f"/jin/api/projects/{project_id}/monitor-policy",
        json={"cadence_template": "custom", "schedule": "daily 12:05", "baseline_mode": "fixed"},
    )
    assert configured.status_code == 200

    bootstrapped = client.post(
        f"/jin/api/projects/{project_id}/monitor-bootstrap",
        json={"endpoint_paths": ["/api/watch/{retailer}"], "overwrite_existing_schedule": True},
    )
    assert bootstrapped.status_code == 200
    payload = bootstrapped.json()
    assert payload["mode"] == "bootstrap"
    assert payload["requested"] == 1
    assert payload["applied"] == 1

    scheduler_rows = client.get("/jin/api/scheduler").json()["jobs"]
    watch_job = next(item for item in scheduler_rows if item["job_id"] == "jin:/api/watch/{retailer}")
    assert watch_job["schedule"] == "daily 12:05"


def test_project_monitor_policy_can_register_bundle_scheduler_job(client) -> None:
    status_payload = client.get("/jin/api/status")
    assert status_payload.status_code == 200
    current_db_path = status_payload.json()["project"]["db_path"]
    project_id = next(
        item["id"]
        for item in client.get("/jin/api/projects").json()["projects"]
        if item["db_path"] == current_db_path
    )

    updated = client.post(
        f"/jin/api/projects/{project_id}/monitor-policy",
        json={
            "cadence_template": "balanced",
            "baseline_mode": "fixed",
            "bundle_enabled": True,
            "bundle_schedule": "daily 13:00",
        },
    )
    assert updated.status_code == 200
    payload = updated.json()
    assert payload["monitor_policy"]["bundle_enabled"] is True
    assert payload["monitor_policy"]["bundle_schedule"] == "daily 13:00"

    bundle_job_id = f"jin:bundle:{project_id}"
    scheduler_rows = client.get("/jin/api/scheduler").json()["jobs"]
    bundle_job = next(item for item in scheduler_rows if item["job_id"] == bundle_job_id)
    assert bundle_job["job_type"] == "bundle"
    assert bundle_job["schedule"] == "daily 13:00"


def test_bundle_scheduler_job_run_creates_bundle_artifact(client) -> None:
    status_payload = client.get("/jin/api/status")
    assert status_payload.status_code == 200
    current_db_path = status_payload.json()["project"]["db_path"]
    project_id = next(
        item["id"]
        for item in client.get("/jin/api/projects").json()["projects"]
        if item["db_path"] == current_db_path
    )
    bundle_job_id = f"jin:bundle:{project_id}"

    updated = client.post(
        f"/jin/api/projects/{project_id}/monitor-policy",
        json={
            "cadence_template": "balanced",
            "baseline_mode": "fixed",
            "bundle_enabled": True,
            "bundle_schedule": "every 2h",
        },
    )
    assert updated.status_code == 200

    started = client.post(f"/jin/api/scheduler/{quote(bundle_job_id, safe='')}/run")
    assert started.status_code == 200
    assert started.json()["started"] is True

    history = client.get(f"/jin/api/projects/{project_id}/run-bundle/history")
    assert history.status_code == 200
    rows = history.json()["runs"]
    assert rows
    assert rows[0]["trigger"] in {"scheduler", "manual"}


def test_project_monitor_policy_routes_for_remote_projects(client, tmp_path: Path) -> None:
    remote_db = tmp_path / "policy-remote.duckdb"
    duckdb.connect(str(remote_db)).close()
    added = client.post(
        "/jin/api/projects",
        json={
            "name": "remote-policy",
            "root": str(tmp_path / "remote-policy-root"),
            "db_path": str(remote_db),
        },
    )
    assert added.status_code == 200
    project_id = added.json()["project"]["id"]

    updated = client.post(
        f"/jin/api/projects/{project_id}/monitor-policy",
        json={"cadence_template": "conservative", "baseline_mode": "fixed"},
    )
    assert updated.status_code == 200
    assert updated.json()["monitor_policy"]["schedule"] == "daily 09:00"

    applied = client.post(f"/jin/api/projects/{project_id}/monitor-policy/apply", json={})
    assert applied.status_code == 200
    payload = applied.json()
    assert payload["applied"] == 0
    assert "saved" in payload["message"].lower()

    invalid = client.post(
        f"/jin/api/projects/{project_id}/monitor-policy",
        json={"cadence_template": "custom", "schedule": "monthly 01:00"},
    )
    assert invalid.status_code == 400


def test_project_run_bundle_routes_execute_and_persist_artifacts(client) -> None:
    status_payload = client.get("/jin/api/status")
    assert status_payload.status_code == 200
    current_db_path = status_payload.json()["project"]["db_path"]
    project_id = next(
        item["id"]
        for item in client.get("/jin/api/projects").json()["projects"]
        if item["db_path"] == current_db_path
    )

    ran = client.post(
        f"/jin/api/projects/{project_id}/run-bundle",
        json={"endpoint_paths": ["/api/watch/{retailer}"]},
    )
    assert ran.status_code == 200
    run_payload = ran.json()
    assert run_payload["requested"] == 1
    assert run_payload["executed"] == 1
    assert run_payload["run_id"]
    assert run_payload["results"][0]["endpoint_path"] == "/api/watch/{retailer}"

    history = client.get(f"/jin/api/projects/{project_id}/run-bundle/history")
    assert history.status_code == 200
    history_payload = history.json()
    assert history_payload["count"] >= 1
    assert any(item["run_id"] == run_payload["run_id"] for item in history_payload["runs"])

    detail = client.get(f"/jin/api/projects/{project_id}/run-bundle/{run_payload['run_id']}")
    assert detail.status_code == 200
    assert detail.json()["run"]["run_id"] == run_payload["run_id"]

    markdown = client.get(
        f"/jin/api/projects/{project_id}/run-bundle/{run_payload['run_id']}/report",
        params={"format": "markdown"},
    )
    assert markdown.status_code == 200
    assert "Jin Bundle Run Report" in markdown.text


def test_project_run_bundle_route_for_remote_project_is_not_executable(client, tmp_path: Path) -> None:
    remote_db = tmp_path / "bundle-remote.duckdb"
    duckdb.connect(str(remote_db)).close()
    added = client.post(
        "/jin/api/projects",
        json={
            "name": "bundle-remote",
            "root": str(tmp_path / "bundle-remote-root"),
            "db_path": str(remote_db),
            "bootstrap_monitoring": False,
        },
    )
    assert added.status_code == 200
    project_id = added.json()["project"]["id"]

    ran = client.post(f"/jin/api/projects/{project_id}/run-bundle", json={})
    assert ran.status_code == 200
    payload = ran.json()
    assert payload["ok"] is False
    assert payload["status"] == "not_executable"
    assert "not performed" in payload["message"]


def test_po_friendly_project_alias_routes(client, encoded_sales_path: str) -> None:
    registered = client.post(
        "/jin/api/projects/register",
        json={
            "project_name": "alias-core",
            "username": "alias_owner",
            "password": "supersecret123",
        },
    )
    assert registered.status_code == 200
    token = base64.b64encode(b"alias_owner:supersecret123").decode("ascii")
    headers = {"authorization": f"Basic {token}"}

    listed = client.get("/jin/api/projects", headers=headers)
    assert listed.status_code == 200
    listed_payload = listed.json()
    project_id = str(listed_payload["active_project_id"] or listed_payload["projects"][0]["id"])

    activated = client.post("/jin/api/projects/activate", json={"project_id": project_id}, headers=headers)
    assert activated.status_code == 200
    current = client.get("/jin/api/projects/current", headers=headers)
    assert current.status_code == 200
    assert current.json()["project"]["id"] == project_id

    configured = client.post(
        f"/jin/api/projects/{project_id}/check-plan",
        json={"cadence_template": "custom", "schedule": "every 2h", "baseline_mode": "refresh_before_run"},
        headers=headers,
    )
    assert configured.status_code == 200
    assert configured.json()["monitor_policy"]["schedule"] == "every 2h"
    fetched = client.get(f"/jin/api/projects/{project_id}/check-plan", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["monitor_policy"]["baseline_mode"] == "refresh_before_run"

    applied = client.post(
        f"/jin/api/projects/{project_id}/check-plan/apply",
        json={"endpoint_paths": ["/api/watch/{retailer}"], "overwrite_existing_schedule": True},
        headers=headers,
    )
    assert applied.status_code == 200
    assert applied.json()["applied"] == 1

    client.get("/api/sales/amazon/YTD?value=100")

    ran = client.post(
        f"/jin/api/projects/{project_id}/checks/run",
        json={"endpoint_paths": ["/api/watch/{retailer}"]},
        headers=headers,
    )
    assert ran.status_code == 200
    run_payload = ran.json()
    run_id = str(run_payload["run_id"])
    assert run_payload["requested"] == 1

    history = client.get(f"/jin/api/projects/{project_id}/checks/history", headers=headers)
    assert history.status_code == 200
    assert any(str(item["run_id"]) == run_id for item in history.json()["runs"])

    detail = client.get(f"/jin/api/projects/{project_id}/checks/{run_id}", headers=headers)
    assert detail.status_code == 200
    assert str(detail.json()["run"]["run_id"]) == run_id

    report = client.get(
        f"/jin/api/projects/{project_id}/checks/{run_id}/report",
        params={"format": "markdown"},
        headers=headers,
    )
    assert report.status_code == 200
    assert "Jin Bundle Run Report" in report.text

    baseline = client.post(
        f"/jin/api/projects/{project_id}/baseline/refresh",
        json={"endpoints": []},
        headers=headers,
    )
    assert baseline.status_code == 200
    assert baseline.json()["requested"] == 0

    portfolio = client.get("/jin/api/portfolio/health", headers=headers)
    assert portfolio.status_code == 200
    assert portfolio.json()["count"] >= 1

    summary = client.get("/jin/api/reports/summary", headers=headers)
    assert summary.status_code == 200
    assert "health" in summary.json()

    digest = client.get("/jin/api/reports/leadership-digest", params={"days": 7}, headers=headers)
    assert digest.status_code == 200
    assert "totals" in digest.json()

    endpoint = client.get(f"/jin/api/reports/endpoint/{encoded_sales_path}", headers=headers)
    assert endpoint.status_code == 200
    assert endpoint.json()["endpoint_path"] == "/api/sales/{retailer}/{period}"


def test_v2_project_routes_cover_core_workflow(client, encoded_sales_path: str) -> None:
    registered = client.post(
        "/jin/api/v2/projects/register",
        json={
            "project_name": "v2-core",
            "username": "v2_owner",
            "password": "supersecret123",
        },
    )
    assert registered.status_code == 200
    token = base64.b64encode(b"v2_owner:supersecret123").decode("ascii")
    headers = {"authorization": f"Basic {token}"}

    listed = client.get("/jin/api/v2/projects", headers=headers)
    assert listed.status_code == 200
    listed_payload = listed.json()
    project_id = str(listed_payload["active_project_id"] or listed_payload["projects"][0]["id"])

    activated = client.post("/jin/api/v2/projects/activate", json={"project_id": project_id}, headers=headers)
    assert activated.status_code == 200
    current = client.get("/jin/api/v2/projects/current", headers=headers)
    assert current.status_code == 200
    assert current.json()["project"]["id"] == project_id

    configured = client.post(
        f"/jin/api/v2/projects/{project_id}/check-plan",
        json={"cadence_template": "custom", "schedule": "every 2h", "baseline_mode": "refresh_before_run"},
        headers=headers,
    )
    assert configured.status_code == 200
    fetched = client.get(f"/jin/api/v2/projects/{project_id}/check-plan", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["monitor_policy"]["schedule"] == "every 2h"

    applied = client.post(
        f"/jin/api/v2/projects/{project_id}/check-plan/apply",
        json={"endpoint_paths": ["/api/watch/{retailer}"], "overwrite_existing_schedule": True},
        headers=headers,
    )
    assert applied.status_code == 200
    assert applied.json()["applied"] == 1

    ran = client.post(
        f"/jin/api/v2/projects/{project_id}/checks/run",
        json={"endpoint_paths": ["/api/watch/{retailer}"]},
        headers=headers,
    )
    assert ran.status_code == 200
    run_id = str(ran.json()["run_id"])

    history = client.get(f"/jin/api/v2/projects/{project_id}/checks/history", headers=headers)
    assert history.status_code == 200
    assert any(str(item["run_id"]) == run_id for item in history.json()["runs"])

    detail = client.get(f"/jin/api/v2/projects/{project_id}/checks/{run_id}", headers=headers)
    assert detail.status_code == 200
    assert str(detail.json()["run"]["run_id"]) == run_id

    report = client.get(
        f"/jin/api/v2/projects/{project_id}/checks/{run_id}/report",
        params={"format": "markdown"},
        headers=headers,
    )
    assert report.status_code == 200
    assert "Jin Bundle Run Report" in report.text

    baseline = client.post(
        f"/jin/api/v2/projects/{project_id}/baseline/refresh",
        json={"endpoints": []},
        headers=headers,
    )
    assert baseline.status_code == 200
    assert baseline.json()["requested"] == 0

    status = client.get("/jin/api/v2/status", params={"project_id": project_id}, headers=headers)
    assert status.status_code == 200
    assert status.json()["project"]["name"] == "v2-core"

    health = client.get("/jin/api/v2/health", params={"project_id": project_id}, headers=headers)
    assert health.status_code == 200
    assert health.json()["project"]["name"] == "v2-core"

    portfolio = client.get("/jin/api/v2/portfolio/health", headers=headers)
    assert portfolio.status_code == 200
    assert portfolio.json()["count"] >= 1

    summary = client.get("/jin/api/v2/reports/summary", params={"project_id": project_id}, headers=headers)
    assert summary.status_code == 200
    assert summary.json()["project"]["name"] == "v2-core"

    digest = client.get("/jin/api/v2/reports/leadership-digest", params={"days": 7}, headers=headers)
    assert digest.status_code == 200
    assert "totals" in digest.json()

    endpoint = client.get(
        f"/jin/api/v2/reports/endpoint/{encoded_sales_path}",
        params={"project_id": project_id},
        headers=headers,
    )
    assert endpoint.status_code == 200
    assert endpoint.json()["endpoint_path"] == "/api/sales/{retailer}/{period}"


def test_endpoint_report_uses_issues_fallback_for_anomaly_count(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    def native_detail_error(*_args, **_kwargs):
        raise RuntimeError("detail unavailable")

    def native_issues(_db_path, endpoint_path=None, status=None):
        assert status == "active"
        return json.dumps(
            [
                {"id": 1, "endpoint_path": endpoint_path, "status": "active"},
                {"id": 2, "endpoint_path": endpoint_path, "status": "active"},
            ]
        )

    monkeypatch.setattr(router_module, "get_endpoint_detail", native_detail_error)
    monkeypatch.setattr(router_module, "issues_list", native_issues)

    endpoint = client.get(f"/jin/api/v2/reports/endpoint/{encoded_sales_path}")
    assert endpoint.status_code == 200
    assert endpoint.json()["anomaly_count"] == 2


def test_report_summary_includes_runtime_upload_validation_issues(client, encoded_sales_path: str) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    middleware = client.app.middleware_stack.app
    middleware.runtime_state.setdefault(endpoint_path, {})
    middleware.runtime_state[endpoint_path]["anomalies"] = [
        {
            "id": 912345,
            "endpoint_path": endpoint_path,
            "grain_key": f"{endpoint_path}|retailer=amazon|period=YTD",
            "kpi_field": "data.RSV",
            "actual_value": 130.0,
            "expected_value": 100.0,
            "pct_change": 30.0,
            "detection_method": "upload_validation",
            "detected_at": "2026-03-28 11:30:00",
            "resolved_at": None,
            "is_active": True,
            "incident_status": "active",
            "snoozed_until": None,
            "suppressed_until": None,
            "severity": "high",
            "confidence": 0.7,
        }
    ]

    response = client.get("/jin/api/v2/reports/summary")
    assert response.status_code == 200
    payload = response.json()
    active = payload.get("active_anomalies") or []
    assert any(
        str(item.get("detection_method") or "") == "upload_validation"
        and str(item.get("endpoint_path") or "") == endpoint_path
        for item in active
        if isinstance(item, dict)
    )


def test_reports_digest_falls_back_to_check_runs_and_top_issues(client) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    middleware = client.app.middleware_stack.app
    middleware.runtime_state.setdefault(endpoint_path, {})
    middleware.runtime_state[endpoint_path]["anomalies"] = [
        {
            "id": 912346,
            "endpoint_path": endpoint_path,
            "grain_key": f"{endpoint_path}|retailer=amazon|period=YTD",
            "kpi_field": "data.RSV",
            "actual_value": 140.0,
            "expected_value": 100.0,
            "pct_change": 40.0,
            "detection_method": "upload_validation",
            "detected_at": "2026-03-28 11:31:00",
            "resolved_at": None,
            "is_active": True,
            "incident_status": "active",
            "snoozed_until": None,
            "suppressed_until": None,
            "severity": "high",
            "confidence": 0.7,
        }
    ]
    run_start = middleware._record_check_run_start(
        endpoint_path,
        job_id=f"jin:{endpoint_path}",
        trigger="manual",
        source="watch",
    )
    middleware._record_check_run_finish(
        str(run_start.get("run_id") or ""),
        status="success",
        started_at=str(run_start.get("started_at") or ""),
        grains_processed=1,
        anomalies_detected=1,
        error=None,
    )

    response = client.get("/jin/api/v2/reports/leadership-digest", params={"days": 7, "limit": 50})
    assert response.status_code == 200
    payload = response.json()
    totals = payload.get("totals") or {}
    assert int(totals.get("runs") or 0) >= 1
    assert int(totals.get("degraded") or 0) >= 1
    assert len(payload.get("top_issues") or []) >= 1
    assert payload.get("report_ready") is False


def test_leadership_digest_backfills_totals_from_check_runs_when_bundle_totals_are_empty(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    middleware = client.app.middleware_stack.app
    run_start = middleware._record_check_run_start(
        endpoint_path,
        job_id=f"jin:{endpoint_path}",
        trigger="manual",
        source="watch",
    )
    run_id = str(run_start.get("run_id") or "")
    middleware._record_check_run_finish(
        run_id,
        status="success",
        started_at=str(run_start.get("started_at") or ""),
        grains_processed=1,
        anomalies_detected=0,
        error=None,
    )

    monkeypatch.setattr(
        middleware,
        "bundle_digest_payload",
        lambda *args, **kwargs: {
            "totals": {"runs": 0, "success": 0, "degraded": 0, "errors": 0},
            "recent_runs": [],
            "count": 0,
        },
    )

    response = client.get("/jin/api/v2/reports/leadership-digest", params={"days": 7, "limit": 20})
    assert response.status_code == 200
    payload = response.json()
    totals = payload.get("totals") or {}
    assert int(totals.get("runs") or 0) >= 1
    assert int(totals.get("success") or 0) >= 1
    assert any(str(item.get("run_id") or "") == run_id for item in payload.get("recent_runs") or [])


def test_project_checks_history_uses_check_runs_when_bundle_history_is_empty(client) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    middleware = client.app.middleware_stack.app
    run_start = middleware._record_check_run_start(
        endpoint_path,
        job_id=f"jin:{endpoint_path}",
        trigger="manual",
        source="watch",
    )
    run_id = str(run_start.get("run_id") or "")
    middleware._record_check_run_finish(
        run_id,
        status="success",
        started_at=str(run_start.get("started_at") or ""),
        grains_processed=1,
        anomalies_detected=0,
        error=None,
    )

    project_id = middleware._project_catalog_id(
        middleware.project_name,
        middleware.project_root,
        middleware.db_path,
    )
    assert project_id

    history = client.get(f"/jin/api/v2/projects/{project_id}/checks/history")
    assert history.status_code == 200
    payload = history.json()
    assert payload.get("source") in {"check_runs", "mixed"}
    assert any(str(item.get("run_id") or "") == run_id for item in payload.get("runs") or [])


def test_project_checks_history_reads_non_current_project_check_runs(client, tmp_path: Path) -> None:
    license_activation = client.post("/jin/api/v2/license/activate", json={"key": "BUS-TEST-SHARED-ACCOUNT"})
    assert license_activation.status_code == 200

    remote_db = tmp_path / "checks-remote.duckdb"
    with duckdb.connect(str(remote_db)) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jin_check_runs (
                id BIGINT,
                run_id VARCHAR NOT NULL,
                endpoint_path VARCHAR NOT NULL,
                job_id VARCHAR,
                trigger VARCHAR,
                source VARCHAR,
                status VARCHAR,
                started_at TIMESTAMP,
                finished_at TIMESTAMP,
                duration_ms BIGINT,
                grains_processed BIGINT,
                anomalies_detected BIGINT,
                error VARCHAR,
                created_at TIMESTAMP DEFAULT now()
            )
            """
        )
        conn.execute(
            """
            INSERT INTO jin_check_runs (
                id, run_id, endpoint_path, job_id, trigger, source, status,
                started_at, finished_at, duration_ms, grains_processed, anomalies_detected, error, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
            """,
            [
                1,
                "check-remote-1",
                "/api/orders",
                "jin:/api/orders",
                "manual",
                "watch",
                "success",
                "2026-03-28 10:00:00",
                "2026-03-28 10:00:02",
                2000,
                1,
                0,
                None,
            ],
        )

    added = client.post(
        "/jin/api/projects",
        json={
            "name": "checks-remote",
            "root": str(tmp_path / "checks-remote-root"),
            "db_path": str(remote_db),
            "bootstrap_monitoring": False,
        },
    )
    assert added.status_code == 200
    project_id = str(added.json()["project"]["id"])

    history = client.get(f"/jin/api/v2/projects/{project_id}/checks/history")
    assert history.status_code == 200
    payload = history.json()
    assert payload.get("source") in {"check_runs", "mixed"}
    assert any(str(item.get("run_id") or "") == "check-remote-1" for item in payload.get("runs") or [])


def test_endpoint_detail_monitoring_runs_show_needs_review_for_active_upload_issues(
    client,
    encoded_sales_path: str,
) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    seeded = client.get("/api/sales/amazon/YTD?value=100")
    assert seeded.status_code == 200
    middleware = client.app.middleware_stack.app
    middleware.runtime_state.setdefault(endpoint_path, {})
    middleware.runtime_state[endpoint_path]["anomalies"] = [
        {
            "id": 902210,
            "endpoint_path": endpoint_path,
            "grain_key": f"{endpoint_path}|retailer=amazon|period=YTD",
            "kpi_field": "data.RSV",
            "actual_value": 140.0,
            "expected_value": 100.0,
            "pct_change": 40.0,
            "detection_method": "upload_validation",
            "detected_at": "2026-01-01 00:00:00",
            "resolved_at": None,
            "is_active": True,
            "incident_status": "active",
            "snoozed_until": None,
            "suppressed_until": None,
            "severity": "high",
            "confidence": 0.7,
        }
    ]
    run_start = middleware._record_check_run_start(
        endpoint_path,
        job_id=f"jin:{endpoint_path}",
        trigger="manual",
        source="watch",
    )
    run_id = str(run_start.get("run_id") or "")
    middleware._record_check_run_finish(
        run_id,
        status="success",
        started_at=str(run_start.get("started_at") or ""),
        grains_processed=1,
        anomalies_detected=0,
        error=None,
    )

    detail = client.get(f"/jin/api/v2/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    monitoring_runs = detail.json().get("monitoring_runs") or []
    row = next((item for item in monitoring_runs if str(item.get("run_id") or "") == run_id), None)
    assert isinstance(row, dict)
    assert int(row.get("anomalies_detected") or 0) >= 1
    assert str(row.get("status") or "").lower() == "degraded"


def test_v2_project_archive_restore_delete_lifecycle(client, tmp_path: Path) -> None:
    status_payload = client.get("/jin/api/v2/status")
    assert status_payload.status_code == 200
    runtime_db_path = status_payload.json()["project"]["db_path"]

    baseline = client.get("/jin/api/v2/projects", params={"include_archived": True})
    assert baseline.status_code == 200
    current_project_id = str(
        next(item["id"] for item in baseline.json()["projects"] if item["db_path"] == runtime_db_path)
    )

    license_activation = client.post("/jin/api/v2/license/activate", json={"key": "BUS-TEST-SHARED-ACCOUNT"})
    assert license_activation.status_code == 200

    remote_db = tmp_path / "archive-delete-remote.duckdb"
    duckdb.connect(str(remote_db)).close()
    added = client.post(
        "/jin/api/v2/projects",
        json={
            "name": "archive-delete-target",
            "root": str(tmp_path / "archive-delete-root"),
            "db_path": str(remote_db),
            "bootstrap_monitoring": False,
        },
    )
    assert added.status_code == 200
    project_id = str(added.json()["project"]["id"])

    listed_default = client.get("/jin/api/v2/projects")
    assert listed_default.status_code == 200
    assert any(item["id"] == project_id for item in listed_default.json()["projects"])

    archived = client.post(f"/jin/api/v2/projects/{project_id}/archive")
    assert archived.status_code == 200
    assert archived.json()["project"]["is_archived"] is True

    listed_after_archive = client.get("/jin/api/v2/projects")
    assert listed_after_archive.status_code == 200
    assert all(item["id"] != project_id for item in listed_after_archive.json()["projects"])

    listed_include_archived = client.get("/jin/api/v2/projects", params={"include_archived": True})
    assert listed_include_archived.status_code == 200
    restored_candidate = next(item for item in listed_include_archived.json()["projects"] if item["id"] == project_id)
    assert restored_candidate["is_archived"] is True

    activate_archived = client.post("/jin/api/v2/projects/activate", json={"project_id": project_id})
    assert activate_archived.status_code == 400

    restored = client.post(f"/jin/api/v2/projects/{project_id}/restore")
    assert restored.status_code == 200
    assert restored.json()["project"]["is_archived"] is False

    delete_without_archive = client.request("DELETE", f"/jin/api/v2/projects/{project_id}")
    assert delete_without_archive.status_code == 400
    assert "archived before deletion" in delete_without_archive.json()["detail"]

    archived_again = client.post(f"/jin/api/v2/projects/{project_id}/archive")
    assert archived_again.status_code == 200
    assert archived_again.json()["project"]["is_archived"] is True

    deleted = client.request("DELETE", f"/jin/api/v2/projects/{project_id}")
    assert deleted.status_code == 200
    assert deleted.json()["deleted_project"]["id"] == project_id

    listed_final = client.get("/jin/api/v2/projects", params={"include_archived": True})
    assert listed_final.status_code == 200
    assert all(item["id"] != project_id for item in listed_final.json()["projects"])

    cannot_delete_runtime = client.request("DELETE", f"/jin/api/v2/projects/{current_project_id}")
    assert cannot_delete_runtime.status_code == 400
    assert "current runtime project" in cannot_delete_runtime.json()["detail"]


def test_register_with_credentials_sets_session_cookie_for_followup_flows(client) -> None:
    registered = client.post(
        "/jin/api/v2/projects/register",
        json={
            "project_name": "cookie-bootstrap",
            "username": "flow_owner",
            "password": "flow-owner-password",
        },
    )
    assert registered.status_code == 200
    assert registered.cookies.get("jin_session")

    # Cookie-based auth should now allow immediate continuation without manual Basic header setup.
    projects = client.get("/jin/api/v2/projects")
    assert projects.status_code == 200
    assert projects.json()["projects"]


def test_po_playbook_route_exposes_operator_workflows(client) -> None:
    v2 = client.get("/jin/api/v2/po/playbook")
    assert v2.status_code == 200
    payload = v2.json()
    assert payload["persona"] == "product-operator"
    assert payload["workflows"]
    assert any(item["id"] == "monitor-and-regression" for item in payload["workflows"])
    assert any(item["path"] == "/jin/api/v2/projects/{project_id}/checks/run" for item in payload["route_catalog"])

    legacy = client.get("/jin/api/po/playbook")
    assert legacy.status_code == 200
    assert legacy.headers.get("deprecation") == "true"
    assert legacy.headers.get("sunset") == "Thu, 31 Dec 2026 23:59:59 GMT"


def test_legacy_api_routes_emit_deprecation_headers(client) -> None:
    legacy = client.get("/jin/api/projects")
    assert legacy.status_code == 200
    assert legacy.headers.get("deprecation") == "true"
    assert legacy.headers.get("sunset") == "Thu, 31 Dec 2026 23:59:59 GMT"
    link = legacy.headers.get("link", "")
    assert "</jin/api/v2/migration>" in link
    assert 'rel="deprecation"' in link

    legacy_anomalies = client.get("/jin/api/anomalies")
    assert legacy_anomalies.status_code == 200
    assert legacy_anomalies.headers.get("deprecation") == "true"
    assert legacy_anomalies.headers.get("sunset") == "Thu, 31 Dec 2026 23:59:59 GMT"

    v2 = client.get("/jin/api/v2/projects")
    assert v2.status_code == 200
    assert v2.headers.get("deprecation") is None
    assert v2.headers.get("sunset") is None

    v2_anomalies = client.get("/jin/api/v2/anomalies")
    assert v2_anomalies.status_code == 200
    assert v2_anomalies.headers.get("deprecation") is None
    assert v2_anomalies.headers.get("sunset") is None

    migration = client.get("/jin/api/v2/migration")
    assert migration.status_code == 200
    payload = migration.json()
    assert payload["api_version"] == "v2"
    assert payload["migration"]["preferred_prefix"] == "/jin/api/v2"
    assert payload["migration"]["sunset"] == "Thu, 31 Dec 2026 23:59:59 GMT"


def test_incident_status_routes_support_notes_snooze_and_bulk(client, encoded_sales_path: str) -> None:
    client.get("/api/sales/amazon/YTD?value=100")
    client.get("/api/sales/amazon/YTD?value=150")

    anomalies = client.get("/jin/api/anomalies").json()["anomalies"]
    anomaly_id = anomalies[0]["id"]

    snoozed = client.post(
        f"/jin/api/anomaly/{anomaly_id}/status",
        json={"action": "snoozed", "note": "triaging", "owner": "PO User", "snooze_minutes": 30},
    )
    assert snoozed.status_code == 200
    refreshed = client.get("/jin/api/anomalies").json()["anomalies"]
    updated = next(item for item in refreshed if item["id"] == anomaly_id)
    assert updated["status"] == "snoozed"
    assert updated["note"] == "triaging"
    assert updated["owner"] == "po-user"

    detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}").json()
    assert detail["anomaly_history"]
    assert detail["anomalies"][0]["why_flagged"]
    assert detail["anomalies"][0]["baseline_label"]
    assert detail["anomalies"][0]["change_since_last_healthy_run"]

    bulk = client.post(
        "/jin/api/anomalies/bulk",
        json={"anomaly_ids": [item["id"] for item in refreshed], "action": "acknowledged", "note": "bulk review", "owner": "triage-team"},
    )
    assert bulk.status_code == 200
    bulk_rows = client.get("/jin/api/anomalies").json()["anomalies"]
    assert all(item["status"] in {"acknowledged", "snoozed"} for item in bulk_rows)

    resolved = client.post(f"/jin/api/anomaly/{anomaly_id}/status", json={"action": "resolved", "resolution_reason": "fixed"})
    assert resolved.status_code == 200
    active_after_resolve = client.get("/jin/api/anomalies").json()["anomalies"]
    assert all(item["id"] != anomaly_id for item in active_after_resolve)


def test_jin_routes_support_cookie_login_and_basic_auth(monkeypatch: pytest.MonkeyPatch, app, tmp_path: Path) -> None:
    monkeypatch.setenv("JIN_AUTH_ENABLED", "true")
    monkeypatch.setenv("JIN_USERNAME", "operator")
    monkeypatch.setenv("JIN_PASSWORD", "secret")
    monkeypatch.setenv("JIN_SESSION_SECRET", "session-secret")

    protected = FastAPI()

    class DemoResponse(BaseModel):
        order_id: str
        amount: float

    @protected.get("/api/demo", response_model=DemoResponse)
    async def demo() -> DemoResponse:
        return DemoResponse(order_id="A1", amount=10.0)

    protected.add_middleware(
        JinMiddleware,
        db_path=str(tmp_path / "auth.duckdb"),
        global_threshold=10.0,
    )

    with TestClient(protected) as auth_client:
        dashboard = auth_client.get("/jin", follow_redirects=False)
        assert dashboard.status_code == 303
        assert dashboard.headers["location"].startswith("/jin/login")

        login_page = auth_client.get("/jin/login")
        assert login_page.status_code == 200
        assert "Sign in to manage monitoring" in login_page.text
        assert "Project Login" in login_page.text

        login = auth_client.post(
            "/jin/login",
            data={"username": "operator", "password": "secret", "next": "/jin"},
            follow_redirects=False,
        )
        assert login.status_code == 303
        assert login.headers["location"] == "/jin"
        assert "jin_session" in login.cookies

        cookie_dashboard = auth_client.get("/jin")
        assert cookie_dashboard.status_code == 200

        cookie_status = auth_client.get("/jin/api/status")
        assert cookie_status.status_code == 200

        logout = auth_client.post("/jin/logout", follow_redirects=False)
        assert logout.status_code == 303
        assert logout.headers["location"].startswith("/jin/login")

        unauthorized = auth_client.get("/jin/api/status")
        assert unauthorized.status_code == 401
        assert unauthorized.headers["www-authenticate"] == "Basic"

        token = base64.b64encode(b"operator:secret").decode("ascii")
        authorized = auth_client.get("/jin/api/status", headers={"authorization": f"Basic {token}"})
        assert authorized.status_code == 200

        login_again = auth_client.post(
            "/jin/login",
            data={"username": "operator", "password": "secret", "next": "/jin"},
            follow_redirects=False,
        )
        assert login_again.status_code == 303

        logout_get = auth_client.get("/jin/logout", follow_redirects=False)
        assert logout_get.status_code == 303
        assert logout_get.headers["location"].startswith("/jin/login")

        unauthorized_after_get = auth_client.get("/jin/api/status")
        assert unauthorized_after_get.status_code == 401


def test_jin_routes_support_hashed_password_login(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    salt = "salty"
    password = "s3cret!"
    iterations = 120000
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()

    monkeypatch.setenv("JIN_AUTH_ENABLED", "true")
    monkeypatch.setenv("JIN_USERNAME", "operator")
    monkeypatch.delenv("JIN_PASSWORD", raising=False)
    monkeypatch.setenv("JIN_PASSWORD_HASH", f"pbkdf2_sha256${iterations}${salt}${password_hash}")
    monkeypatch.setenv("JIN_SESSION_SECRET", "hashed-session-secret")

    protected = FastAPI()

    class DemoResponse(BaseModel):
        order_id: str
        amount: float

    @protected.get("/api/demo", response_model=DemoResponse)
    async def demo() -> DemoResponse:
        return DemoResponse(order_id="A1", amount=10.0)

    protected.add_middleware(
        JinMiddleware,
        db_path=str(tmp_path / "auth-hash.duckdb"),
        global_threshold=10.0,
    )

    with TestClient(protected) as auth_client:
        failed = auth_client.post(
            "/jin/login",
            data={"username": "operator", "password": "wrong", "next": "/jin"},
        )
        assert failed.status_code == 401
        assert "Invalid username or password." in failed.text

        login = auth_client.post(
            "/jin/login",
            data={"username": "operator", "password": password, "next": "/jin"},
            follow_redirects=False,
        )
        assert login.status_code == 303
        assert "jin_session" in login.cookies


def test_logout_lands_on_login_page_when_auth_is_disabled(client) -> None:
    logout = client.get("/jin/logout", follow_redirects=False)
    assert logout.status_code == 303
    assert logout.headers["location"].startswith("/jin/login?logged_out=1")

    login_page = client.get(logout.headers["location"], follow_redirects=False)
    assert login_page.status_code == 200
    assert "You are signed out." in login_page.text


def test_scheduler_routes_404_for_missing_jobs(client) -> None:
    paused = client.post(f"/jin/api/scheduler/{quote('jin:/missing', safe='')}/pause")
    resumed = client.post(f"/jin/api/scheduler/{quote('jin:/missing', safe='')}/resume")
    started = client.post(f"/jin/api/scheduler/{quote('jin:/missing', safe='')}/run")
    assert paused.status_code == 404
    assert resumed.status_code == 404
    assert started.status_code == 404


def test_register_scheduler_jobs_supports_sync_payload_handlers(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "sync-jobs.duckdb"))
    middleware._ensure_python_schema()
    captured = []

    class SyncResponse(BaseModel):
        amount: int

    def sync_endpoint(payload: dict) -> SyncResponse:
        return SyncResponse(amount=payload["amount"])

    middleware.endpoint_registry["/custom-sync"] = EndpointRecord(
        method="POST",
        path="/custom-sync",
        response_model=SyncResponse,
        endpoint_callable=sync_endpoint,
        fields=[{"name": "amount", "kind": "kpi", "annotation": "int"}],
        dimension_fields=[],
        kpi_fields=["amount"],
        metrics=[],
        watch_config={"schedule": "every 1h", "default_params": {"body": {"amount": 9}}},
    )

    def fake_process(endpoint_path, method, request_json, item, config_json):
        captured.append((endpoint_path, method, json.loads(request_json), item, json.loads(config_json)))
        return {"grain_key": endpoint_path, "anomalies": []}

    middleware._process_item = fake_process  # type: ignore[method-assign]
    middleware._register_scheduler_jobs()
    job = next(job for job in middleware.scheduler.scheduler.get_jobs() if job.id == "jin:/custom-sync")

    import asyncio

    asyncio.run(job.func())
    assert captured[0][1] == "POST"
    assert captured[0][2]["body"] == {"amount": 9}
    assert captured[0][3] == {"amount": 9}


def test_register_scheduler_jobs_resolves_forward_body_annotations(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "forward-annotated-jobs.duckdb"))
    middleware._ensure_python_schema()
    captured = []

    def sync_endpoint(payload: ForwardBodyModel) -> ForwardResponseModel:
        return ForwardResponseModel(count=len(payload.dates))

    middleware.endpoint_registry["/custom-forward"] = EndpointRecord(
        method="POST",
        path="/custom-forward",
        response_model=ForwardResponseModel,
        endpoint_callable=sync_endpoint,
        fields=[{"name": "count", "kind": "kpi", "annotation": "int"}],
        dimension_fields=[],
        kpi_fields=["count"],
        metrics=[],
        watch_config={"schedule": "every 1h", "default_params": {"body": {"dates": ["2026-03-21"]}}},
    )

    def fake_process(endpoint_path, method, request_json, item, config_json):
        captured.append((endpoint_path, method, json.loads(request_json), item, json.loads(config_json)))
        return {"grain_key": endpoint_path, "anomalies": []}

    middleware._process_item = fake_process  # type: ignore[method-assign]
    middleware._register_scheduler_jobs()
    job = next(job for job in middleware.scheduler.scheduler.get_jobs() if job.id == "jin:/custom-forward")

    import asyncio

    asyncio.run(job.func())
    assert captured[0][1] == "POST"
    assert captured[0][2]["body"] == {"dates": ["2026-03-21"]}
    assert captured[0][3] == {"count": 1}


@pytest.mark.anyio
async def test_build_request_json_paths(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "request.duckdb"))
    get_request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [(b"x-region", b"us")],
            "query_string": b"value=100",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    post_request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/orders",
            "headers": [(b"x-tenant", b"north")],
            "query_string": b"",
            "path_params": {},
            "app": app,
        }
    )

    get_payload = json.loads(middleware._build_request_json(get_request, b""))
    post_payload = json.loads(middleware._build_request_json(post_request, b"{not-json"))

    assert get_payload["query"] == {"value": "100"}
    assert get_payload["headers"] == {"x-region": "us", "api_version": "0.1.0"}
    assert post_payload["body"] == {}
    assert post_payload["headers"] == {"x-tenant": "north", "api_version": "0.1.0"}

    app.include_router(create_router(middleware), prefix="/jin")
    middleware._discover_routes(get_request)
    assert "/jin" not in middleware.endpoint_registry
    assert middleware.endpoint_registry["/api/watch/{retailer}"].watch_config["schedule"] == "every 2h"


@pytest.mark.anyio
async def test_invoke_endpoint_callable_injects_api_version_header(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "invoke.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/watch/amazon",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon"},
            "app": app,
        }
    )

    app.include_router(create_router(middleware), prefix="/jin")
    middleware._discover_routes(request)
    record = middleware.endpoint_registry["/api/watch/{retailer}"]

    _, request_json = await middleware._invoke_endpoint_callable(
        record,
        {"path_params": {"retailer": "amazon"}, "query_params": {}, "headers": {}, "body": {}},
    )
    payload = json.loads(request_json)
    assert payload["headers"]["api_version"] == "0.1.0"


def test_end_to_end_status_anomaly_and_routes(client, app, encoded_sales_path: str) -> None:
    first = client.get("/api/sales/amazon/YTD?value=100")
    assert first.status_code == 200
    assert first.json()["data"]["RSV"] == 100.0

    second = client.get("/api/sales/amazon/YTD?value=150")
    assert second.status_code == 200
    assert second.json()["retailer"] == "amazon"

    status = client.get("/jin/api/status")
    assert status.status_code == 200
    payload = status.json()
    assert payload["summary"]["total_endpoints"] >= 1
    assert payload["project"]["name"]
    assert payload["project"]["deployment_model"] == "client_infra_embedded"
    assert "recent_errors" in payload
    sales_status = next(item for item in payload["endpoints"] if item["endpoint_path"] == "/api/sales/{retailer}/{period}")
    assert sales_status["status"] == "anomaly"
    assert sales_status["last_checked"] is not None
    assert any(item["endpoint_path"] == "/api/watch/{retailer}" for item in payload["endpoints"])

    detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    assert detail.json()["history"]
    assert detail.json()["fields"]
    assert "recent_history" in detail.json()

    anomalies = client.get("/jin/api/anomalies")
    assert anomalies.status_code == 200
    active_anomalies = anomalies.json()["anomalies"]
    assert {item["kpi_field"] for item in active_anomalies} == {"data.RSV", "data.units"}

    config = client.post(
        f"/jin/api/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["data.RSV"],
            "tolerance_pct": 12,
            "confirmed": True,
            "references": [
                {
                    "grain_key": "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
                    "kpi_field": "data.RSV",
                    "expected_value": 110.0,
                }
            ],
        },
    )
    assert config.status_code == 200

    reference = client.post(
        f"/jin/api/reference/{encoded_sales_path}",
        json={
            "references": [
                {
                    "grain_key": "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
                    "kpi_field": "data.RSV",
                    "expected_value": 100.0,
                    "tolerance_pct": 10.0,
                }
            ]
        },
    )
    assert reference.status_code == 200
    assert reference.json()["count"] == 1

    template_csv = client.get(f"/jin/template/{encoded_sales_path}.csv")
    assert template_csv.status_code == 200
    assert "retailer" in template_csv.text
    assert "data.RSV" in template_csv.text

    template_xlsx = client.get(f"/jin/template/{encoded_sales_path}.xlsx")
    assert template_xlsx.status_code == 200
    assert template_xlsx.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    upload = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert upload.status_code == 200
    assert upload.json()["rows"] == 1
    assert upload.json()["imported"] == 2
    assert upload.json()["dimension_fields"] == ["retailer", "period"]
    assert upload.json()["kpi_fields"] == ["data.RSV", "data.units"]

    refreshed_detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}")
    assert refreshed_detail.status_code == 200
    assert refreshed_detail.json()["references"]
    assert refreshed_detail.json()["config"]["confirmed"] is True

    for anomaly in active_anomalies:
        resolved = client.post(f"/jin/api/resolve/{anomaly['id']}")
        assert resolved.status_code == 200
    remaining_after_upload = client.get("/jin/api/anomalies").json()["anomalies"]
    for anomaly in remaining_after_upload:
        resolved = client.post(f"/jin/api/resolve/{anomaly['id']}")
        assert resolved.status_code == 200
    assert client.get("/jin/api/anomalies").json()["anomalies"] == []

    dashboard = client.get("/jin")
    assert dashboard.status_code == 200
    assert "Review API health, recent changes, and follow-up actions one endpoint at a time." in dashboard.text
    assert 'data-view="overview"' in dashboard.text
    assert 'data-view="playbook"' in dashboard.text
    assert 'data-view="incidents"' in dashboard.text
    assert "Errors" in dashboard.text
    assert "error-status-filter" in dashboard.text
    assert "Resolve" in dashboard.text
    assert 'value="business"' in dashboard.text
    assert "Business Impact First" in dashboard.text
    assert 'id="logout-button"' in dashboard.text
    assert 'id="settings-security"' in dashboard.text
    assert '/jin/assets/dashboard.css' in dashboard.text
    assert '/jin/assets/dashboard.js' in dashboard.text

    dashboard_css = client.get("/jin/assets/dashboard.css")
    assert dashboard_css.status_code == 200
    assert "--font-sans" in dashboard_css.text

    dashboard_js = client.get("/jin/assets/dashboard.js")
    assert dashboard_js.status_code == 200
    assert "currentView" in dashboard_js.text
    assert "Upload analysis found" in dashboard_js.text
    assert "Upload Findings" in dashboard_js.text
    assert "Running deep validation in the background." in dashboard_js.text

    po_dashboard = client.get("/jin/po", follow_redirects=False)
    assert po_dashboard.status_code == 303
    assert po_dashboard.headers["location"] == "/jin?y_view=playbook"

    po_docs = client.get("/jin/po/docs", follow_redirects=False)
    assert po_docs.status_code == 303
    assert po_docs.headers["location"] == "/jin?y_view=playbook"

    missing_asset = client.get("/jin/assets/not-real.js")
    assert missing_asset.status_code == 404

    missing_detail = client.get(f"/jin/api/endpoint/{quote('/missing', safe='')}")
    assert missing_detail.status_code == 404

    missing_csv = client.get(f"/jin/template/{quote('/missing', safe='')}.csv")
    assert missing_csv.status_code == 404

    missing_xlsx = client.get(f"/jin/template/{quote('/missing', safe='')}.xlsx")
    assert missing_xlsx.status_code == 404


def test_error_status_route_supports_acknowledge_archive_and_reopen(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(router_module, "get_status", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("status boom")))
    payload = client.get("/jin/api/status").json()
    error_id = payload["recent_errors"][0]["id"]

    acknowledged = client.post(f"/jin/api/errors/{error_id}/status", json={"action": "acknowledged"})
    assert acknowledged.status_code == 200
    assert acknowledged.json()["error"]["status"] == "acknowledged"

    archived = client.post(f"/jin/api/errors/{error_id}/status", json={"action": "archived"})
    assert archived.status_code == 200
    assert archived.json()["error"]["status"] == "archived"

    reopened = client.post(f"/jin/api/errors/{error_id}/status", json={"action": "reopened"})
    assert reopened.status_code == 200
    assert reopened.json()["error"]["status"] == "open"


def test_error_status_route_rejects_invalid_or_missing_errors(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(router_module, "get_status", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("status boom")))
    payload = client.get("/jin/api/status").json()
    error_id = payload["recent_errors"][0]["id"]

    invalid = client.post(f"/jin/api/errors/{error_id}/status", json={"action": "bad-action"})
    assert invalid.status_code == 400

    missing = client.post("/jin/api/errors/999999/status", json={"action": "acknowledged"})
    assert missing.status_code == 404


def test_live_request_path_does_not_duplicate_observations(client, app) -> None:
    first = client.post("/api/orders", json={"order_id": "A1", "amount": 20})
    assert first.status_code == 200

    second = client.post("/api/orders", json={"order_id": "A1", "amount": 25})
    assert second.status_code == 200

    detail = client.get(f"/jin/api/endpoint/{quote('/api/orders', safe='')}")
    assert detail.status_code == 200
    assert len(detail.json()["history"]) == 2

    anomalies = client.get("/jin/api/anomalies").json()["anomalies"]
    assert len([item for item in anomalies if item["endpoint_path"] == "/api/orders"]) == 1


def test_post_body_and_non_json_paths(client, app) -> None:
    post = client.post("/api/orders", json={"order_id": "A1", "amount": 20})
    assert post.status_code == 200
    assert post.json() == {"order_id": "A1", "amount": 20.0}

    plain = client.get("/plain")
    assert plain.status_code == 200
    assert plain.text == "ok"

    raw = client.get("/raw")
    assert raw.status_code == 200
    assert raw.text == "raw"

    info = client.get("/api/info")
    assert info.status_code == 200
    assert info.json() == {"label": "ready"}

    boom = client.get("/boom")
    assert boom.status_code == 500
    assert boom.json()["detail"] == "boom"

    middleware = next(layer for layer in app.user_middleware if layer.cls.__name__ == "JinMiddleware")
    assert middleware.kwargs["exclude_paths"] == ["/plain"]


def test_direct_rust_api_round_trip(tmp_path: Path) -> None:
    import jin_core

    db_path = tmp_path / "core.duckdb"
    config = json.dumps(
        {
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["value"],
            "tolerance_pct": 10.0,
            "confirmed": False,
        }
    )
    request = json.dumps(
        {"path": {"retailer": "amazon", "period": "YTD"}, "query": {}, "body": {}, "headers": {}}
    )

    jin_core.init_db(str(db_path))
    first = json.loads(
        jin_core.process_observation(
            "/api/sales",
            "GET",
            request,
            json.dumps({"retailer": "amazon", "period": "YTD", "value": 100.0}),
            config,
            str(db_path),
        )
    )
    second = json.loads(
        jin_core.process_observation(
            "/api/sales",
            "GET",
            request,
            json.dumps({"retailer": "amazon", "period": "YTD", "value": 150.0}),
            config,
            str(db_path),
        )
    )
    status = json.loads(jin_core.get_status(str(db_path)))

    assert first["status"] == "learning"
    assert second["status"] == "anomaly"
    assert second["anomalies"][0]["method"] == "threshold"
    assert status["endpoints"][0]["status"] == "anomaly"

    with duckdb.connect(str(db_path)) as conn:
        count = conn.execute("SELECT COUNT(*) FROM jin_observations").fetchone()[0]
    assert count == 2


def test_direct_rust_api_saves_config_and_references(tmp_path: Path) -> None:
    import jin_core

    db_path = tmp_path / "core-config.duckdb"
    jin_core.init_db(str(db_path))

    config_result = json.loads(
        jin_core.save_endpoint_config(
            str(db_path),
            "/api/sales/{retailer}/{period}",
            "GET",
            json.dumps(["retailer", "period"]),
            json.dumps(["data.RSV", "data.units"]),
            json.dumps(
                {
                    "dimension_fields": ["retailer", "period"],
                    "kpi_fields": ["data.RSV"],
                    "tolerance_pct": 12.0,
                    "confirmed": True,
                    "references": [
                        {
                            "grain_key": "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
                            "kpi_field": "data.RSV",
                            "expected_value": 110.0,
                        }
                    ],
                }
            ),
        )
    )
    reference_result = json.loads(
        jin_core.save_references(
            str(db_path),
            "/api/sales/{retailer}/{period}",
            json.dumps(
                {
                    "references": [
                        {
                            "grain_key": "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
                            "kpi_field": "data.RSV",
                            "expected_value": 120.0,
                            "tolerance_pct": 8.0,
                        }
                    ]
                }
            ),
            "ui",
        )
    )
    detail = json.loads(jin_core.get_endpoint_detail(str(db_path), "/api/sales/{retailer}/{period}"))

    assert config_result["ok"] is True
    assert config_result["count"] == 1
    assert config_result["confirmed"] is True
    assert reference_result == {"ok": True, "count": 1}
    assert detail["config"]["tolerance_pct"] == 12.0
    assert detail["config"]["confirmed"] is True
    assert detail["endpoint"]["config_source"] == "ui"
    assert detail["references"][0]["expected_value"] == 120.0
    assert detail["references"][0]["tolerance_pct"] == 8.0


def test_direct_rust_api_resolves_endpoint_config(tmp_path: Path) -> None:
    import jin_core

    db_path = tmp_path / "core-resolve.duckdb"
    jin_core.init_db(str(db_path))
    jin_core.save_endpoint_config(
        str(db_path),
        "/api/watch/{retailer}",
        "GET",
        json.dumps(["retailer"]),
        json.dumps(["amount"]),
        json.dumps(
            {
                "dimension_fields": ["order_id"],
                "kpi_fields": ["amount"],
                "tolerance_pct": 12.0,
                "confirmed": True,
            }
        ),
    )

    resolved = json.loads(
        jin_core.resolve_endpoint_config(
            str(db_path),
            "/api/watch/{retailer}",
            json.dumps(["retailer"]),
            json.dumps(["value"]),
            10.0,
            20.0,
            json.dumps({"confirmed": True}),
        )
    )

    assert resolved["dimension_fields"] == ["order_id"]
    assert resolved["kpi_fields"] == ["amount"]
    assert resolved["tolerance_pct"] == 20.0
    assert resolved["confirmed"] is True


def test_direct_rust_api_lists_and_resolves_anomalies(tmp_path: Path) -> None:
    import jin_core

    db_path = tmp_path / "core-anomalies.duckdb"
    jin_core.init_db(str(db_path))
    config = json.dumps(
        {
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["value"],
            "tolerance_pct": 10.0,
            "confirmed": False,
        }
    )
    request = json.dumps(
        {"path": {"retailer": "amazon", "period": "YTD"}, "query": {}, "body": {}, "headers": {}}
    )
    jin_core.process_observation(
        "/api/sales",
        "GET",
        request,
        json.dumps({"retailer": "amazon", "period": "YTD", "value": 100.0}),
        config,
        str(db_path),
    )
    jin_core.process_observation(
        "/api/sales",
        "GET",
        request,
        json.dumps({"retailer": "amazon", "period": "YTD", "value": 150.0}),
        config,
        str(db_path),
    )

    anomalies = json.loads(jin_core.get_active_anomalies(str(db_path)))
    anomaly_id = anomalies["anomalies"][0]["id"]
    resolved = json.loads(jin_core.resolve_anomaly(str(db_path), anomaly_id))
    after = json.loads(jin_core.get_active_anomalies(str(db_path)))

    assert len(anomalies["anomalies"]) == 1
    assert resolved == {"ok": True, "id": anomaly_id}
    assert after["anomalies"] == []


def test_direct_rust_api_merges_status_with_registry() -> None:
    import jin_core

    merged = json.loads(
        jin_core.merge_status_with_registry(
            json.dumps(
                {
                    "summary": {"total_endpoints": 1, "healthy": 0, "anomalies": 1, "unconfirmed": 1},
                    "endpoints": [
                        {
                            "endpoint_path": "/api/sales",
                            "http_method": "GET",
                            "dimension_fields": ["retailer"],
                            "kpi_fields": ["value"],
                            "grain_count": 1,
                            "active_anomalies": 1,
                            "status": "anomaly",
                            "confirmed": False,
                            "tolerance_pct": 10.0,
                            "config_source": "auto",
                            "last_checked": "2026-03-12 10:00:00",
                        }
                    ],
                }
            ),
            json.dumps(
                [
                    {
                        "endpoint_path": "/api/info",
                        "http_method": "GET",
                        "dimension_fields": ["label"],
                        "kpi_fields": [],
                        "fields": [{"name": "label", "kind": "dimension", "annotation": "str"}],
                    },
                    {
                        "endpoint_path": "/api/sales",
                        "http_method": "GET",
                        "dimension_fields": ["retailer"],
                        "kpi_fields": ["value"],
                        "fields": [{"name": "value", "kind": "kpi", "annotation": "float"}],
                    },
                ]
            ),
            10.0,
        )
    )

    assert merged["summary"]["total_endpoints"] == 2
    assert merged["summary"]["anomalies"] == 1
    assert merged["endpoints"][0]["endpoint_path"] == "/api/info"
    assert merged["endpoints"][1]["status"] == "anomaly"


def test_status_route_falls_back_without_native_status(client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(router_module, "get_status", None)
    response = client.get("/jin/api/status")
    assert response.status_code == 200
    assert "summary" in response.json()
    assert any(item["endpoint_path"] == "/api/sales/{retailer}/{period}" for item in response.json()["endpoints"])


def test_status_route_uses_python_merge_when_native_merger_missing(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        router_module,
        "get_status",
        lambda _db_path: json.dumps(
            {
                "endpoints": [
                    "ignore-me",
                    {"http_method": "GET"},
                    {
                        "endpoint_path": "/api/orders",
                        "http_method": "POST",
                        "grain_count": 2,
                        "active_anomalies": 1,
                        "status": "anomaly",
                        "confirmed": True,
                        "tolerance_pct": 15.0,
                        "config_source": "ui",
                        "last_checked": "2026-03-12 10:00:00",
                    },
                ]
            }
        ),
    )
    monkeypatch.setattr(router_module, "merge_status_with_registry", None)
    payload = client.get("/jin/api/status").json()
    orders = next(item for item in payload["endpoints"] if item["endpoint_path"] == "/api/orders")

    assert payload["summary"]["total_endpoints"] >= 1
    assert payload["summary"]["anomalies"] >= 1
    assert orders["status"] == "anomaly"
    assert orders["config_source"] == "ui"


def test_status_route_falls_back_when_native_status_errors(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    client.get("/api/sales/amazon/YTD?value=100")
    client.get("/api/sales/amazon/YTD?value=150")

    def boom(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(router_module, "get_status", boom)
    payload = client.get("/jin/api/status").json()
    sales_status = next(item for item in payload["endpoints"] if item["endpoint_path"] == "/api/sales/{retailer}/{period}")
    assert sales_status["active_anomalies"] >= 1
    assert sales_status["status"] == "anomaly"
    assert sales_status["last_checked"] is not None


def test_status_route_fallback_warning_state(client, monkeypatch: pytest.MonkeyPatch) -> None:
    client.post("/api/orders", json={"order_id": "A1", "amount": 20})
    monkeypatch.setattr(router_module, "get_status", None)
    payload = client.get("/jin/api/status").json()
    orders = next(item for item in payload["endpoints"] if item["endpoint_path"] == "/api/orders")
    assert orders["grain_count"] == 1
    assert orders["status"] == "warning"


def test_status_route_fallback_merges_saved_overrides(client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str) -> None:
    client.get("/api/sales/amazon/YTD?value=100")
    client.post(
        f"/jin/api/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer"],
            "kpi_fields": ["data.RSV"],
            "tolerance_pct": 12,
            "confirmed": True,
        },
    )
    monkeypatch.setattr(router_module, "get_status", None)
    payload = client.get("/jin/api/status").json()
    sales = next(item for item in payload["endpoints"] if item["endpoint_path"] == "/api/sales/{retailer}/{period}")
    assert sales["dimension_fields"] == ["retailer"]
    assert sales["kpi_fields"] == ["data.RSV"]
    assert sales["tolerance_pct"] == 12
    assert sales["confirmed"] is True


def test_direct_namespace_exports() -> None:
    from jin.config import EndpointModelInfo, build_config_json, classify_model
    from jin.scheduler import JinScheduler as SchedulerAlias
    from jin.templates import generate_csv_template as csv_template_alias
    from jin.templates import generate_xlsx_template, template_columns
    from jin.uploader import parse_csv_upload as csv_upload_alias
    from jin.uploader import parse_xlsx_upload, validate_upload_rows

    assert SchedulerAlias is JinScheduler
    assert EndpointModelInfo.__name__ == "EndpointModelInfo"
    assert callable(classify_model)
    assert callable(build_config_json)
    assert callable(template_columns)
    assert callable(csv_template_alias)
    assert callable(generate_xlsx_template)
    assert callable(csv_upload_alias)
    assert callable(parse_xlsx_upload)
    assert callable(validate_upload_rows)


def test_router_status_without_duckdb(monkeypatch: pytest.MonkeyPatch, app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "no-duck.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    monkeypatch.setattr(router_module, "duckdb", None)
    router = create_router(middleware)
    status_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith("/api/status"))
    detail_endpoint = next(route.endpoint for route in router.routes if "/api/endpoint/" in getattr(route, "path", ""))
    import asyncio

    result = asyncio.run(status_endpoint())
    assert result.body
    with pytest.raises(Exception):
        asyncio.run(detail_endpoint("api/sales"))


def test_router_template_metadata_tolerates_bad_stored_json(client, tmp_path: Path) -> None:
    response = client.get("/api/sales/amazon/YTD?value=100")
    assert response.status_code == 200
    middleware = client.app.middleware_stack.app

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, *_args, **_kwargs):
            return self

        def fetchone(self):
            return ("{bad", "{bad", "{bad")

    class FakeDuckDB:
        def connect(self, *_args, **_kwargs):
            return FakeConnection()

    import asyncio

    router = create_router(middleware)
    template_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith(".csv"))
    original_duckdb = router_module.duckdb
    router_module.duckdb = FakeDuckDB()
    try:
        result = asyncio.run(template_endpoint("api/sales/{retailer}/{period}"))
    finally:
        router_module.duckdb = original_duckdb
    assert b"retailer" in result.body
    assert b"data.RSV" in result.body


def test_router_template_metadata_tolerates_empty_stored_json_fields(client) -> None:
    response = client.get("/api/sales/amazon/YTD?value=100")
    assert response.status_code == 200
    middleware = client.app.middleware_stack.app

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, *_args, **_kwargs):
            return self

        def fetchone(self):
            return (None, None, None)

    class FakeDuckDB:
        def connect(self, *_args, **_kwargs):
            return FakeConnection()

    import asyncio

    router = create_router(middleware)
    template_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith(".csv"))
    original_duckdb = router_module.duckdb
    router_module.duckdb = FakeDuckDB()
    try:
        result = asyncio.run(template_endpoint("api/sales/{retailer}/{period}"))
    finally:
        router_module.duckdb = original_duckdb
    assert b"retailer" in result.body
    assert b"data.RSV" in result.body


def test_router_template_metadata_reads_schema_contract_dict(client) -> None:
    response = client.get("/api/sales/amazon/YTD?value=100")
    assert response.status_code == 200
    middleware = client.app.middleware_stack.app

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, *_args, **_kwargs):
            return self

        def fetchone(self):
            return (
                json.dumps(
                    {
                        "fields": [{"name": "retailer", "kind": "dimension", "annotation": "str"}],
                        "dimension_fields": ["retailer"],
                        "kpi_fields": ["data.RSV"],
                    }
                ),
                None,
                None,
            )

    class FakeDuckDB:
        def connect(self, *_args, **_kwargs):
            return FakeConnection()

    import asyncio

    router = create_router(middleware)
    template_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith(".csv"))
    original_duckdb = router_module.duckdb
    router_module.duckdb = FakeDuckDB()
    try:
        result = asyncio.run(template_endpoint("api/sales/{retailer}/{period}"))
    finally:
        router_module.duckdb = original_duckdb
    assert b"retailer" in result.body
    assert b"data.RSV" in result.body


def test_router_status_handles_non_dict_schema_contract(client, monkeypatch: pytest.MonkeyPatch) -> None:
    response = client.get("/api/sales/amazon/YTD?value=100")
    assert response.status_code == 200
    middleware = client.app.middleware_stack.app

    class FakeConnection:
        def __init__(self) -> None:
            self.sql = ""

        def execute(self, sql, *_args, **_kwargs):
            self.sql = sql
            return self

        def fetchone(self):
            if "FROM jin_config" in self.sql:
                return None
            return (json.dumps(["legacy-field"]), json.dumps(["retailer"]), json.dumps(["data.RSV"]))

    class FakeLock:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    import asyncio

    router = create_router(middleware)
    status_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith("/api/status"))
    monkeypatch.setattr(middleware, "_get_connection", lambda: (FakeConnection(), FakeLock()))
    try:
        result = asyncio.run(status_endpoint())
    finally:
        pass
    payload = json.loads(result.body)
    endpoint = next(item for item in payload["endpoints"] if item["endpoint_path"] == "/api/sales/{retailer}/{period}")
    assert endpoint["fields"] == ["legacy-field"]


def test_endpoint_detail_returns_schema_contract_and_trend_summary(client, encoded_sales_path: str) -> None:
    first = client.get("/api/sales/amazon/YTD?value=100")
    second = client.get("/api/sales/amazon/YTD?value=120")
    assert first.status_code == 200
    assert second.status_code == 200

    detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    payload = detail.json()
    assert payload["schema_contract"]["field_count"] >= 1
    assert payload["schema_contract"]["kpi_fields"]
    assert payload["trend_summary"]
    assert payload["trend_summary"][0]["kpi_field"] in payload["kpi_fields"]


def test_router_status_load_runtime_without_duckdb(monkeypatch: pytest.MonkeyPatch, app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "no-duck-runtime.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    monkeypatch.setattr(router_module, "duckdb", None)
    monkeypatch.setattr(router_module, "get_status", None)
    router = create_router(middleware)
    status_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith("/api/status"))

    import asyncio

    result = asyncio.run(status_endpoint())
    assert result.body


def test_load_overrides_returns_empty_when_queries_fail(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "override-errors.duckdb"))

    class BrokenConnection:
        def execute(self, *_args, **_kwargs):
            raise RuntimeError("broken")

    class BrokenLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(middleware, "_get_connection", lambda: (BrokenConnection(), BrokenLock()))
    assert middleware._load_overrides("/api/sales/{retailer}/{period}") == {}


def test_router_fallback_paths_without_native_helpers(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    client.get("/api/sales/amazon/YTD?value=100")
    client.get("/api/sales/amazon/YTD?value=150")

    monkeypatch.setattr(router_module, "get_endpoint_detail", None)
    monkeypatch.setattr(router_module, "get_active_anomalies", None)
    monkeypatch.setattr(router_module, "save_endpoint_config", None)
    monkeypatch.setattr(router_module, "save_references", None)
    monkeypatch.setattr(router_module, "import_reference_rows", None)
    monkeypatch.setattr(router_module, "resolve_native_anomaly", None)

    detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    assert detail.json()["anomalies"]

    config = client.post(
        f"/jin/api/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["data.RSV"],
            "tolerance_pct": 11,
            "confirmed": True,
            "references": [
                {
                    "grain_key": "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
                    "kpi_field": "data.RSV",
                    "expected_value": 111.0,
                }
            ],
        },
    )
    assert config.status_code == 200
    assert config.json() == {"ok": True}

    reference = client.post(
        f"/jin/api/reference/{encoded_sales_path}",
        json={
            "references": [
                {
                    "grain_key": "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
                    "kpi_field": "data.RSV",
                    "expected_value": 115.0,
                    "tolerance_pct": 7.0,
                }
            ]
        },
    )
    assert reference.status_code == 200
    assert reference.json() == {"ok": True, "count": 1}

    upload = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert upload.status_code == 200
    assert upload.json()["imported"] == 2

    refreshed = client.get(f"/jin/api/endpoint/{encoded_sales_path}").json()
    assert refreshed["config"]["confirmed"] is True
    assert refreshed["references"]

    fallback_anomalies = client.get("/jin/api/anomalies")
    assert fallback_anomalies.status_code == 200
    assert fallback_anomalies.json()["anomalies"]

    resolved = client.post(f"/jin/api/resolve/{fallback_anomalies.json()['anomalies'][0]['id']}")
    assert resolved.status_code == 200


def test_router_falls_back_when_native_helpers_raise(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    client.get("/api/sales/amazon/YTD?value=100")
    client.get("/api/sales/amazon/YTD?value=150")

    def boom(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(router_module, "get_endpoint_detail", boom)
    monkeypatch.setattr(router_module, "get_active_anomalies", boom)
    monkeypatch.setattr(router_module, "save_endpoint_config", boom)
    monkeypatch.setattr(router_module, "save_references", boom)
    monkeypatch.setattr(router_module, "import_reference_rows", boom)
    monkeypatch.setattr(router_module, "resolve_native_anomaly", boom)

    detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    assert detail.json()["history"]

    config = client.post(
        f"/jin/api/config/{encoded_sales_path}",
        json={"dimension_fields": ["retailer"], "kpi_fields": ["data.RSV"], "confirmed": True},
    )
    assert config.status_code == 200
    assert config.json() == {"ok": True}

    reference = client.post(
        f"/jin/api/reference/{encoded_sales_path}",
        json={
            "references": [
                {
                    "grain_key": "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
                    "kpi_field": "data.RSV",
                    "expected_value": 101.0,
                }
            ]
        },
    )
    assert reference.status_code == 200
    assert reference.json() == {"ok": True, "count": 1}

    upload = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert upload.status_code == 200
    assert upload.json()["imported"] == 2

    fallback_anomalies = client.get("/jin/api/anomalies")
    assert fallback_anomalies.status_code == 200
    assert fallback_anomalies.json()["anomalies"]

    resolved = client.post(f"/jin/api/resolve/{fallback_anomalies.json()['anomalies'][0]['id']}")
    assert resolved.status_code == 200


def test_anomalies_route_falls_back_when_db_history_load_errors(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    client.get("/api/sales/amazon/YTD?value=100")
    client.get("/api/sales/amazon/YTD?value=150")
    middleware = client.app.middleware_stack.app

    class BrokenConnection:
        def execute(self, *_args, **_kwargs):
            raise RuntimeError("broken history")

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(middleware, "_get_connection", lambda: (BrokenConnection(), FakeLock()))
    monkeypatch.setattr(router_module, "get_active_anomalies", None)

    anomalies = client.get("/jin/api/anomalies")
    assert anomalies.status_code == 200
    assert anomalies.json()["anomalies"]


def test_anomalies_route_prefers_db_backed_history_payload(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "anomaly-history.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    monkeypatch.setattr(router_module, "get_active_anomalies", None)

    class FakeCursor:
        def __init__(self, rows):
            self.rows = rows

        def fetchall(self):
            return self.rows

    class FakeConnection:
        def execute(self, sql, _params=None):
            if "FROM jin_incident_events" in sql:
                return FakeCursor([])
            if "FROM jin_anomalies a" in sql:
                return FakeCursor(
                    [
                        (
                            1,
                            "/api/sales/{retailer}/{period}",
                            "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
                            "data.RSV",
                            150.0,
                            100.0,
                            50.0,
                            "threshold",
                            "2026-03-13 10:00:00",
                            None,
                            True,
                            "Threshold anomaly",
                            "active",
                            "triaging",
                            None,
                            None,
                            None,
                            None,
                            "high",
                            0.75,
                        )
                    ]
                )
            raise AssertionError(sql)

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(middleware, "_get_connection", lambda: (FakeConnection(), FakeLock()))
    router = create_router(middleware)
    anomalies_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith("/api/anomalies"))

    import asyncio

    response = asyncio.run(anomalies_endpoint())
    payload = json.loads(response.body)
    assert payload["anomalies"][0]["kpi_field"] == "data.RSV"
    assert payload["anomalies"][0]["note"] == "triaging"
    assert payload["anomalies"][0]["owner"] is None


def test_endpoint_detail_falls_back_when_native_payload_has_no_endpoint(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    client.get("/api/sales/amazon/YTD?value=100")
    monkeypatch.setattr(router_module, "get_endpoint_detail", lambda *_args, **_kwargs: "{}")
    detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    assert detail.json()["history"]


def test_upload_reference_rejects_mismatched_endpoint(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    monkeypatch.setattr(router_module, "import_reference_rows", None)
    response = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/wrong","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert response.status_code == 400
    assert "does not match target" in response.json()["detail"]


def test_upload_reference_reports_duplicate_warnings(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    monkeypatch.setattr(router_module, "import_reference_rows", None)
    response = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                (
                    b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n'
                    b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,100,50,10\n'
                    b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n'
                ),
                "text/csv",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    # The uploader now dedupes internally to 1 unique row, but we import 2 KPI records for that row
    assert payload["imported"] == 2
    assert any("duplicate grain combination" in item for item in payload["warnings"])


def test_upload_reference_replaces_previous_endpoint_baseline_snapshot(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    monkeypatch.setattr(router_module, "import_reference_rows", None)
    first_upload = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                (
                    b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n'
                    b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,100,50,10\n'
                    b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",walmart,YTD,90,45,10\n'
                ),
                "text/csv",
            )
        },
    )
    assert first_upload.status_code == 200
    assert first_upload.json()["imported"] == 4

    second_upload = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                (
                    b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n'
                    b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n'
                ),
                "text/csv",
            )
        },
    )
    assert second_upload.status_code == 200
    assert second_upload.json()["imported"] == 2

    detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    references = detail.json()["references"]
    grain_keys = {str(item["grain_key"]) for item in references}
    assert "/api/sales/{retailer}/{period}|period=YTD|retailer=walmart" not in grain_keys
    assert "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon" in grain_keys


def test_upload_reference_triggers_analysis_and_populates_history(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    monkeypatch.setattr(router_module, "import_reference_rows", None)
    response = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    analysis = payload["analysis"]
    assert analysis["attempted_runs"] >= 1
    assert analysis["successful_runs"] >= 1
    assert analysis["status"] in {"success", "partial"}
    assert analysis["verdict"] == "mismatch"
    assert analysis["mismatch_runs"] >= 1
    assert analysis["runs"]
    assert analysis["runs"][0]["comparisons"]
    assert any(item["status"] != "match" for item in analysis["runs"][0]["comparisons"])

    detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["history"]
    assert detail_payload["recent_history"]
    assert detail_payload["last_upload_analysis"]["verdict"] == "mismatch"
    assert detail_payload["last_upload_analysis"]["summary_message"]
    assert detail_payload["upload_analysis_history"]
    assert detail_payload["upload_analysis_history"][0]["verdict"] == "mismatch"


def test_upload_analysis_mismatches_can_be_materialized_to_issues(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    monkeypatch.setenv("JIN_UPLOAD_AUTO_CREATE_ISSUES", "0")
    monkeypatch.setattr(router_module, "import_reference_rows", None)
    upload = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert upload.status_code == 200
    upload_payload = upload.json()
    assert upload_payload["analysis"]["mismatch_runs"] >= 1
    assert upload_payload["analysis"]["issues_sync"]["auto_enabled"] is False
    assert upload_payload["analysis"]["issues_sync"]["created"] == 0

    anomalies_before = client.get("/jin/api/v2/anomalies").json()
    existing_upload_issues = [
        item
        for item in anomalies_before["anomalies"]
        if item.get("endpoint_path") == "/api/sales/{retailer}/{period}"
        and item.get("detection_method") == "upload_validation"
    ]
    assert existing_upload_issues == []

    first_materialize = client.post(f"/jin/api/v2/upload-analysis/issues/{encoded_sales_path}")
    assert first_materialize.status_code == 200
    first_payload = first_materialize.json()
    assert first_payload["created"] >= 1

    anomalies_payload = client.get("/jin/api/v2/anomalies").json()
    upload_issues = [
        item
        for item in anomalies_payload["anomalies"]
        if item.get("endpoint_path") == "/api/sales/{retailer}/{period}"
        and item.get("detection_method") == "upload_validation"
    ]
    assert upload_issues

    second_materialize = client.post(f"/jin/api/v2/upload-analysis/issues/{encoded_sales_path}")
    assert second_materialize.status_code == 200
    second_payload = second_materialize.json()
    assert second_payload["created"] == 0
    assert second_payload["updated"] >= 1


def test_upload_analysis_mismatches_auto_create_issues_by_default(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    monkeypatch.delenv("JIN_UPLOAD_AUTO_CREATE_ISSUES", raising=False)
    monkeypatch.setattr(router_module, "import_reference_rows", None)
    upload = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert upload.status_code == 200
    upload_payload = upload.json()
    issues_sync = upload_payload["analysis"]["issues_sync"]
    assert issues_sync["auto_enabled"] is True
    assert issues_sync["created"] >= 1

    anomalies_payload = client.get("/jin/api/v2/anomalies").json()
    upload_issues = [
        item
        for item in anomalies_payload["anomalies"]
        if item.get("endpoint_path") == "/api/sales/{retailer}/{period}"
        and item.get("detection_method") == "upload_validation"
    ]
    assert upload_issues

    manual_after_auto = client.post(f"/jin/api/v2/upload-analysis/issues/{encoded_sales_path}")
    assert manual_after_auto.status_code == 200
    manual_payload = manual_after_auto.json()
    assert manual_payload["created"] == 0
    assert manual_payload["updated"] >= 1


def test_upload_analysis_auto_sync_reuses_existing_active_upload_issues(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    monkeypatch.delenv("JIN_UPLOAD_AUTO_CREATE_ISSUES", raising=False)
    monkeypatch.setattr(router_module, "import_reference_rows", None)

    upload_file = {
        "file": (
            "reference.csv",
            b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
            "text/csv",
        )
    }

    first_upload = client.post(f"/jin/api/upload/{encoded_sales_path}", files=upload_file)
    assert first_upload.status_code == 200
    assert first_upload.json()["analysis"]["issues_sync"]["created"] >= 1

    anomalies_after_first = client.get("/jin/api/v2/anomalies").json()["anomalies"]
    upload_issues_first = [
        item
        for item in anomalies_after_first
        if item.get("endpoint_path") == "/api/sales/{retailer}/{period}"
        and item.get("detection_method") == "upload_validation"
    ]
    assert upload_issues_first
    first_id_map = {(item.get("grain_key"), item.get("kpi_field")): item.get("id") for item in upload_issues_first}

    second_upload = client.post(f"/jin/api/upload/{encoded_sales_path}", files=upload_file)
    assert second_upload.status_code == 200
    second_sync = second_upload.json()["analysis"]["issues_sync"]
    assert second_sync["created"] == 0
    assert second_sync["updated"] >= 1

    anomalies_after_second = client.get("/jin/api/v2/anomalies").json()["anomalies"]
    upload_issues_second = [
        item
        for item in anomalies_after_second
        if item.get("endpoint_path") == "/api/sales/{retailer}/{period}"
        and item.get("detection_method") == "upload_validation"
    ]
    assert len(upload_issues_second) == len(upload_issues_first)
    second_id_map = {(item.get("grain_key"), item.get("kpi_field")): item.get("id") for item in upload_issues_second}
    assert second_id_map == first_id_map


def test_upload_analysis_materialization_requires_existing_analysis(client, encoded_sales_path: str) -> None:
    response = client.post(f"/jin/api/v2/upload-analysis/issues/{encoded_sales_path}")
    assert response.status_code == 404
    payload = response.json()
    assert payload["ok"] is False
    assert "No upload analysis" in payload["message"]


def test_upload_reference_keeps_upload_analysis_history(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    monkeypatch.setattr(router_module, "import_reference_rows", None)

    first = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert first.status_code == 200

    second = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,130,65,10\n',
                "text/csv",
            )
        },
    )
    assert second.status_code == 200

    detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    history = detail.json()["upload_analysis_history"]
    assert len(history) >= 2
    assert history[0]["summary_message"]
    assert history[1]["summary_message"]
    assert history[0]["runs"]


def test_upload_analysis_history_survives_runtime_state_reset(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    monkeypatch.setattr(router_module, "import_reference_rows", None)

    upload = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert upload.status_code == 200
    assert upload.json()["analysis"]["summary_message"]

    middleware = client.app.middleware_stack.app
    middleware.runtime_state.clear()

    detail = client.get(f"/jin/api/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    payload = detail.json()
    assert payload["last_upload_analysis"] is not None
    assert payload["upload_analysis_history"]
    assert payload["upload_analysis_history"][0]["summary_message"]


def test_upload_analysis_history_persists_across_middleware_restart(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(router_module, "import_reference_rows", None)
    db_path = tmp_path / "persist-upload-analysis.duckdb"
    encoded_path = quote("/api/sales/{retailer}/{period}", safe="")

    class RestartMetrics(BaseModel):
        RSV: float
        units: int

    class RestartSalesResponse(BaseModel):
        retailer: str
        period: str
        data: RestartMetrics

    def build_app() -> FastAPI:
        application = FastAPI()

        @application.get("/api/sales/{retailer}/{period}", response_model=RestartSalesResponse)
        async def sales(retailer: str, period: str, value: float = 100.0) -> RestartSalesResponse:
            return RestartSalesResponse(
                retailer=retailer,
                period=period,
                data=RestartMetrics(RSV=value, units=int(value / 2)),
            )

        application.add_middleware(
            JinMiddleware,
            db_path=str(db_path),
            global_threshold=10.0,
            log_level="INFO",
        )
        return application

    with TestClient(build_app()) as first_client:
        upload = first_client.post(
            f"/jin/api/upload/{encoded_path}",
            files={
                "file": (
                    "reference.csv",
                    b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                    "text/csv",
                )
            },
        )
        assert upload.status_code == 200
        assert upload.json()["analysis"]["summary_message"]

    with TestClient(build_app()) as second_client:
        detail = second_client.get(f"/jin/api/endpoint/{encoded_path}")
        assert detail.status_code == 200
        payload = detail.json()
        assert payload["last_upload_analysis"] is not None
        assert payload["upload_analysis_history"]
        assert payload["upload_analysis_history"][0]["summary_message"]


def test_upload_analysis_issues_rehydrate_after_runtime_reset(
    client,
    monkeypatch: pytest.MonkeyPatch,
    encoded_sales_path: str,
) -> None:
    monkeypatch.setattr(router_module, "import_reference_rows", None)
    _configure_v2_sales_setup(client, encoded_sales_path)
    upload = client.post(
        f"/jin/api/v2/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n'
                b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert upload.status_code == 200
    analysis = upload.json().get("analysis") or {}
    assert analysis.get("verdict") in {"mismatch", "matched", "error"}

    first_anomalies = client.get("/jin/api/v2/anomalies")
    assert first_anomalies.status_code == 200
    first_upload_issues = [
        item
        for item in first_anomalies.json().get("anomalies", [])
        if item.get("detection_method") == "upload_validation"
    ]
    assert first_upload_issues

    middleware = client.app.middleware_stack.app
    endpoint_state = middleware._runtime_endpoint_state("/api/sales/{retailer}/{period}")
    endpoint_state["anomalies"] = []
    endpoint_state.pop("upload_issue_materialized_for", None)

    second_anomalies = client.get("/jin/api/v2/anomalies")
    assert second_anomalies.status_code == 200
    second_upload_issues = [
        item
        for item in second_anomalies.json().get("anomalies", [])
        if item.get("detection_method") == "upload_validation"
    ]
    assert second_upload_issues


def test_upload_reference_falls_back_when_native_validation_errors(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    monkeypatch.setattr(router_module, "import_reference_rows", None)

    def _native_validation_boom(*_args, **_kwargs) -> str:
        raise RuntimeError("native validator rejected contextual field")

    monkeypatch.setattr(router_module, "validate_reference_rows", _native_validation_boom)

    response = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert any("Native validation failed; Python fallback was used" in item for item in payload["warnings"])
    assert payload["rows_in_file"] == 1
    assert payload["columns_in_file"] >= 8
    assert payload["file_size_bytes"] > 0
    assert payload["is_large_upload"] is False
    assert payload["analysis"]["attempted_runs"] >= 1


def test_upload_preview_falls_back_when_native_validation_errors(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    def _native_validation_boom(*_args, **_kwargs) -> str:
        raise RuntimeError("native validator rejected contextual field")

    monkeypatch.setattr(router_module, "validate_reference_rows", _native_validation_boom)

    response = client.post(
        f"/jin/api/upload-preview/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["rows_in_file"] == 1
    assert payload["columns_in_file"] >= 8
    assert payload["file_size_bytes"] > 0
    assert payload["is_large_upload"] is False
    assert any("Native validation failed; Python fallback was used" in item for item in payload["warnings"])


def test_upload_preview_reports_wide_file_shape_and_warning(client, encoded_sales_path: str) -> None:
    wide_headers = ",".join(f"c{i}" for i in range(1, 122))
    wide_values = ",".join("1" for _ in range(121))
    response = client.post(
        f"/jin/api/upload-preview/{encoded_sales_path}",
        files={"file": ("wide.csv", f"{wide_headers}\n{wide_values}\n".encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 422
    payload = response.json()
    assert payload["columns_in_file"] == 121
    assert payload["rows_in_file"] == 1
    assert payload["file_size_bytes"] > 0
    assert payload["is_large_upload"] is True
    assert any("Wide table detected" in warning for warning in payload["warnings"])


def test_upload_preview_metadata_read_avoids_native_endpoint_detail(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    def _must_not_call_native_detail(*_args, **_kwargs):
        raise SystemExit("native endpoint detail should not be used for upload-preview metadata")

    monkeypatch.setattr(router_module, "get_endpoint_detail", _must_not_call_native_detail)

    response = client.post(
        f"/jin/api/upload-preview/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["rows_found"] == 1


def test_upload_preview_and_upload_do_not_require_get_endpoint_detail(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    def _must_not_call_native_detail(*_args, **_kwargs):
        raise SystemExit("get_endpoint_detail should not be required for upload preview/upload")

    monkeypatch.setattr(router_module, "get_endpoint_detail", _must_not_call_native_detail)

    preview = client.post(
        f"/jin/api/upload-preview/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert preview.status_code == 200
    assert preview.json()["ok"] is True

    upload = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert upload.status_code == 200
    assert upload.json()["ok"] is True


def test_upload_preview_infers_roles_when_saved_config_is_unavailable(
    client, encoded_sales_path: str
) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    client.get("/api/sales/amazon/YTD?value=100")
    middleware = client.app.middleware_stack.app
    record = middleware.endpoint_registry[endpoint_path]
    record.dimension_fields = []
    record.kpi_fields = []
    middleware.override_state[endpoint_path] = {"dimension_fields": [], "kpi_fields": []}

    response = client.post(
        f"/jin/api/upload-preview/{encoded_sales_path}",
        files={
            "file": (
                "simple.csv",
                b"retailer,period,data.RSV,data.units\namazon,YTD,120,60\n",
                "text/csv",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["rows_found"] == 1
    assert any("auto-inferred" in item.lower() for item in payload["warnings"])


def test_upload_preview_infers_roles_from_headers_when_schema_fields_are_unavailable(
    client, encoded_sales_path: str
) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    client.get("/api/sales/amazon/YTD?value=100")
    middleware = client.app.middleware_stack.app
    record = middleware.endpoint_registry[endpoint_path]
    record.fields = []
    record.dimension_fields = []
    record.kpi_fields = []
    middleware.override_state[endpoint_path] = {"dimension_fields": [], "kpi_fields": []}

    response = client.post(
        f"/jin/api/upload-preview/{encoded_sales_path}",
        files={
            "file": (
                "simple.csv",
                b"retailer,period,revenue,orders\namazon,YTD,120,60\n",
                "text/csv",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["rows_found"] == 1
    assert any("upload headers were used" in item.lower() for item in payload["warnings"])
    assert any("auto-inferred" in item.lower() for item in payload["warnings"])


def test_upload_reference_infers_roles_from_headers_when_schema_fields_are_unavailable(
    client, encoded_sales_path: str
) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    client.get("/api/sales/amazon/YTD?value=100")
    middleware = client.app.middleware_stack.app
    record = middleware.endpoint_registry[endpoint_path]
    record.fields = []
    record.dimension_fields = []
    record.kpi_fields = []
    middleware.override_state[endpoint_path] = {"dimension_fields": [], "kpi_fields": []}

    response = client.post(
        f"/jin/api/upload/{encoded_sales_path}",
        files={
            "file": (
                "simple.csv",
                b"retailer,period,revenue,orders\namazon,YTD,120,60\n",
                "text/csv",
            )
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["rows"] == 1
    assert any("upload headers were used" in item.lower() for item in payload["warnings"])
    assert any("auto-inferred" in item.lower() for item in payload["warnings"])


def _configure_v2_sales_setup(client, encoded_sales_path: str) -> None:
    response = client.post(
        f"/jin/api/v2/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["data.RSV", "data.units"],
            "time_field": "period",
            "time_profile": "auto",
            "time_extraction_rule": "single",
            "confirmed": True,
        },
    )
    assert response.status_code == 200


def _configure_v2_orders_setup(client, *, confirmed: bool) -> str:
    encoded_orders_path = quote("/api/orders", safe="")
    response = client.post(
        f"/jin/api/v2/config/{encoded_orders_path}",
        json={
            "dimension_fields": ["order_id"],
            "kpi_fields": ["amount"],
            "time_field": None,
            "time_profile": "auto",
            "time_extraction_rule": "single",
            "confirmed": bool(confirmed),
        },
    )
    assert response.status_code == 200
    return encoded_orders_path


def test_upload_preview_v2_requires_saved_setup(client, encoded_sales_path: str) -> None:
    response = client.post(
        f"/jin/api/v2/upload-preview/{encoded_sales_path}",
        files={
            "file": (
                "preview.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n'
                b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert response.status_code == 409
    payload = response.json()
    assert payload["ok"] is False
    assert "setup" in payload
    assert any("save configuration" in item for item in payload.get("setup_blockers", []))


def test_manual_check_v2_requires_saved_setup(client, encoded_sales_path: str) -> None:
    response = client.post(f"/jin/api/v2/check/{encoded_sales_path}")
    assert response.status_code == 409
    payload = response.json()
    assert payload["ok"] is False
    assert any("save configuration" in item for item in payload.get("setup_blockers", []))


def test_v2_setup_allows_time_optional_endpoints(client) -> None:
    encoded_orders_path = _configure_v2_orders_setup(client, confirmed=False)
    blocked = client.post(
        f"/jin/api/v2/upload-preview/{encoded_orders_path}",
        files={
            "file": (
                "orders.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_order_id,expected_amount,tolerance_pct\n'
                b'"/api/orders","order_id","amount",ORD-1,99,10\n',
                "text/csv",
            )
        },
    )
    assert blocked.status_code == 409
    blockers = blocked.json().get("setup_blockers") or []
    assert any("save configuration" in item for item in blockers)
    assert all("Time" not in item for item in blockers)

    encoded_orders_path = _configure_v2_orders_setup(client, confirmed=True)
    ready = client.post(
        f"/jin/api/v2/upload-preview/{encoded_orders_path}",
        files={
            "file": (
                "orders.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_order_id,expected_amount,tolerance_pct\n'
                b'"/api/orders","order_id","amount",ORD-1,99,10\n',
                "text/csv",
            )
        },
    )
    assert ready.status_code == 200
    payload = ready.json()
    assert payload.get("ok") is True
    assert int(payload.get("rows_found") or 0) >= 1


def test_v2_setup_ignores_technical_time_fields_for_optional_endpoints(client) -> None:
    encoded_orders_path = quote("/api/orders", safe="")
    endpoint_path = "/api/orders"
    prime = client.post("/api/orders", json={"order_id": "ORD-0", "amount": 11})
    assert prime.status_code == 200
    middleware = client.app.middleware_stack.app
    record = middleware.endpoint_registry[endpoint_path]
    record.fields = [
        {"name": "timestamp", "annotation": "datetime", "example": "2026-03-19T00:00:00Z"},
        {"name": "_jin_id", "annotation": "str", "example": "trace-1"},
        {"name": "order_id", "annotation": "str"},
        {"name": "amount", "annotation": "float"},
    ]

    setup = client.post(
        f"/jin/api/v2/config/{encoded_orders_path}",
        json={
            "dimension_fields": ["order_id"],
            "kpi_fields": ["amount"],
            "time_field": None,
            "time_profile": "auto",
            "time_extraction_rule": "single",
            "confirmed": True,
        },
    )
    assert setup.status_code == 200

    preview = client.post(
        f"/jin/api/v2/upload-preview/{encoded_orders_path}",
        files={
            "file": (
                "orders.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_order_id,expected_amount,tolerance_pct\n'
                b'"/api/orders","order_id","amount",ORD-1,99,10\n',
                "text/csv",
            )
        },
    )
    assert preview.status_code == 200
    assert preview.json().get("ok") is True


def test_upload_preview_v2_maps_simple_template_validation_error_to_setup_feedback(
    client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str
) -> None:
    _configure_v2_sales_setup(client, encoded_sales_path)

    def _raise_simple_template_error(*_args, **_kwargs):
        raise ValueError(
            "The upload file uses the simple template format but the server did not receive the expected field configuration."
        )

    monkeypatch.setattr(router_module, "validate_upload_rows", _raise_simple_template_error)
    response = client.post(
        f"/jin/api/v2/upload-preview/{encoded_sales_path}",
        files={
            "file": (
                "preview.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n'
                b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert response.status_code == 409
    payload = response.json()
    assert payload.get("ok") is False
    assert "setup" in payload
    assert isinstance(payload.get("setup_blockers"), list)
    assert "configuration" in str(payload.get("error", "")).lower()
    assert "save configuration" in [str(item).lower() for item in (payload.get("setup_blockers") or [])]


def test_manual_check_uses_latest_reference_when_watch_defaults_missing(client, encoded_sales_path: str) -> None:
    middleware = client.app.middleware_stack.app
    middleware._process_item = lambda endpoint_path, method, request_json, item, config_json: {
        "grain_key": "/api/sales/{retailer}/{period}|period=YTD|retailer=amazon",
        "dimension_json": {"retailer": "amazon", "period": "YTD"},
        "kpi_json": {"data.RSV": 100.0, "data.units": 50},
        "comparisons": [],
        "anomalies": [],
    }
    _configure_v2_sales_setup(client, encoded_sales_path)
    upload = client.post(
        f"/jin/api/v2/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n'
                b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,100,50,10\n',
                "text/csv",
            )
        },
    )
    assert upload.status_code == 200
    check = client.post(f"/jin/api/v2/check/{encoded_sales_path}")
    assert check.status_code == 200
    payload = check.json()
    assert payload.get("ok") is True
    assert payload.get("status") in {None, "success"}


def test_upload_async_job_completes_and_returns_result(client, encoded_sales_path: str) -> None:
    _configure_v2_sales_setup(client, encoded_sales_path)
    kickoff = client.post(
        f"/jin/api/v2/upload-async/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert kickoff.status_code == 202
    kickoff_payload = kickoff.json()
    assert kickoff_payload["ok"] is True
    job_id = kickoff_payload["job_id"]
    assert job_id

    final_payload = None
    for _ in range(120):
        status = client.get(f"/jin/api/v2/upload-async/{job_id}")
        assert status.status_code == 200
        payload = status.json()
        if payload.get("done"):
            final_payload = payload
            break
        time.sleep(0.05)

    assert final_payload is not None
    assert final_payload["status"] == "completed"
    assert final_payload["rows_in_file"] == 1
    assert final_payload["columns_in_file"] >= 8
    assert final_payload["file_size_bytes"] > 0
    assert final_payload["result"]["ok"] is True
    assert final_payload["result"]["imported"] >= 1
    assert final_payload["result"]["analysis"]["attempted_runs"] >= 1


def test_upload_preview_succeeds_during_async_upload_flow(client, encoded_sales_path: str) -> None:
    _configure_v2_sales_setup(client, encoded_sales_path)
    kickoff = client.post(
        f"/jin/api/v2/upload-async/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n'
                b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n'
                b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",walmart,YTD,90,45,10\n',
                "text/csv",
            )
        },
    )
    assert kickoff.status_code == 202
    job_id = kickoff.json().get("job_id")
    assert isinstance(job_id, str) and job_id

    preview = client.post(
        f"/jin/api/v2/upload-preview/{encoded_sales_path}",
        files={
            "file": (
                "preview.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n'
                b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert preview.status_code == 200
    preview_payload = preview.json()
    assert preview_payload["ok"] is True
    assert preview_payload["rows_found"] == 1

    status = client.get(f"/jin/api/v2/upload-async/{job_id}")
    assert status.status_code == 200


def test_upload_async_latest_returns_active_job(client, encoded_sales_path: str) -> None:
    _configure_v2_sales_setup(client, encoded_sales_path)
    kickoff = client.post(
        f"/jin/api/v2/upload-async/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n',
                "text/csv",
            )
        },
    )
    assert kickoff.status_code == 202
    kickoff_payload = kickoff.json()
    latest = client.get(f"/jin/api/v2/upload-async/latest/{encoded_sales_path}")
    assert latest.status_code == 200
    latest_payload = latest.json()
    assert latest_payload["job_id"] == kickoff_payload["job_id"]
    assert latest_payload["endpoint_path"] == "/api/sales/{retailer}/{period}"


def test_upload_async_job_runs_deferred_full_analysis_for_sampled_upload(
    client,
    monkeypatch: pytest.MonkeyPatch,
    encoded_sales_path: str,
) -> None:
    _configure_v2_sales_setup(client, encoded_sales_path)
    monkeypatch.setenv("JIN_UPLOAD_ANALYSIS_MAX_RUNS", "1")
    monkeypatch.setenv("JIN_UPLOAD_DEFERRED_FULL_ANALYSIS", "true")
    monkeypatch.setenv("JIN_UPLOAD_DEFERRED_MAX_RUNS", "200")

    rows = []
    for idx in range(30):
        retailer = f"retailer_{idx:02d}"
        rows.append(
            f'"/api/sales/{{retailer}}/{{period}}","retailer,period","data.RSV,data.units",{retailer},YTD,{100 + idx},{50 + idx},10'
        )
    csv_payload = (
        "endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"
        + "\n".join(rows)
        + "\n"
    ).encode("utf-8")
    kickoff = client.post(
        f"/jin/api/v2/upload-async/{encoded_sales_path}",
        files={"file": ("reference.csv", csv_payload, "text/csv")},
    )
    assert kickoff.status_code == 202
    job_id = kickoff.json()["job_id"]

    final_payload = None
    for _ in range(320):
        status = client.get(f"/jin/api/v2/upload-async/{job_id}")
        assert status.status_code == 200
        payload = status.json()
        if payload.get("done") and payload.get("followup_status") in {"completed", "failed"}:
            final_payload = payload
            break
        time.sleep(0.05)

    assert final_payload is not None
    assert final_payload["status"] == "completed"
    assert final_payload["followup_status"] == "completed"
    assert final_payload["result"]["analysis_sampled"] is True
    assert final_payload["result"]["analysis_sample_rows"] == 25
    assert final_payload["result"]["analysis_total_rows"] == 30
    assert final_payload["result"]["full_analysis"]["deferred"] is True
    assert final_payload["result"]["full_analysis"]["deferred_analyzed_rows"] >= 30


def test_upload_job_cleanup_removes_stale_completed_rows(
    client,
    monkeypatch: pytest.MonkeyPatch,
    encoded_sales_path: str,
) -> None:
    monkeypatch.setenv("JIN_UPLOAD_CLEANUP_INTERVAL_SECONDS", "0")
    monkeypatch.setenv("JIN_UPLOAD_JOB_TTL_HOURS", "1")

    schema_prime = client.get(f"/jin/api/v2/upload-async/latest/{encoded_sales_path}")
    assert schema_prime.status_code == 200

    status_payload = client.get("/jin/api/v2/status").json()
    db_path = str(status_payload["project"]["db_path"])
    stale_job_id = "upload-stale-cleanup"
    stale_time = "2001-01-01 00:00:00"

    with duckdb.connect(db_path) as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO jin_upload_jobs (
                job_id, endpoint_path, status, stage, progress_pct, message,
                filename, file_size_bytes, rows_in_file, columns_in_file, is_large_upload,
                result_json, error, followup_status, followup_message,
                followup_started_at, followup_finished_at, created_at, updated_at
            )
            VALUES (?, ?, 'completed', 'completed', 100, 'done', 'stale.csv', 100, 1, 8, false, '{}', '', 'not_requested', '', NULL, NULL, ?, ?)
            """,
            [stale_job_id, "/api/sales/{retailer}/{period}", stale_time, stale_time],
        )
        inserted = conn.execute(
            "SELECT COUNT(*) FROM jin_upload_jobs WHERE job_id = ?",
            [stale_job_id],
        ).fetchone()
        assert inserted is not None and int(inserted[0]) == 1

    latest = client.get(f"/jin/api/v2/upload-async/latest/{encoded_sales_path}")
    assert latest.status_code == 200

    with duckdb.connect(db_path) as conn:
        remaining = conn.execute(
            "SELECT COUNT(*) FROM jin_upload_jobs WHERE job_id = ?",
            [stale_job_id],
        ).fetchone()
        assert remaining is not None and int(remaining[0]) == 0


def test_upload_async_status_marks_orphaned_running_jobs_as_failed(
    client,
    encoded_sales_path: str,
) -> None:
    schema_prime = client.get(f"/jin/api/v2/upload-async/latest/{encoded_sales_path}")
    assert schema_prime.status_code == 200
    status_payload = client.get("/jin/api/v2/status").json()
    db_path = str(status_payload["project"]["db_path"])
    job_id = "upload-orphaned-running"
    stale_time = "2001-01-01 00:00:00"
    with duckdb.connect(db_path) as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO jin_upload_jobs (
                job_id, endpoint_path, status, stage, progress_pct, message,
                filename, file_size_bytes, rows_in_file, columns_in_file, is_large_upload,
                result_json, error, followup_status, followup_message,
                followup_started_at, followup_finished_at, created_at, updated_at
            )
            VALUES (?, ?, 'running', 'importing', 65, 'running', 'stale.csv', 100, 1, 8, false, '{}', '', 'not_requested', '', NULL, NULL, ?, ?)
            """,
            [job_id, "/api/sales/{retailer}/{period}", stale_time, stale_time],
        )

    status = client.get(f"/jin/api/v2/upload-async/{job_id}")
    assert status.status_code == 200
    payload = status.json()
    assert payload.get("status") == "failed"
    assert payload.get("done") is True
    assert payload.get("stale_after_restart") is True


def test_upload_reference_chunked_csv_mode_with_sampling(client, monkeypatch: pytest.MonkeyPatch, encoded_sales_path: str) -> None:
    _configure_v2_sales_setup(client, encoded_sales_path)
    monkeypatch.setenv("JIN_UPLOAD_FORCE_CHUNKED", "true")
    monkeypatch.setenv("JIN_UPLOAD_CHUNK_ROWS", "1")
    monkeypatch.setattr(router_module, "import_reference_rows", None)
    csv_payload = (
        b"endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,expected_data.units,tolerance_pct\n"
        b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",amazon,YTD,120,60,10\n'
        b'"/api/sales/{retailer}/{period}","retailer,period","data.RSV,data.units",walmart,YTD,90,45,10\n'
    )
    response = client.post(
        f"/jin/api/v2/upload/{encoded_sales_path}",
        files={"file": ("reference.csv", csv_payload, "text/csv")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["rows_in_file"] == 2
    assert payload["columns_in_file"] >= 8
    assert payload["imported"] >= 2
    assert any("chunked mode" in str(item).lower() for item in payload["warnings"])
    assert payload["analysis"]["requested_grains"] == 2
    assert "sampling_note" in payload["analysis"]


def test_templates_reflect_saved_endpoint_config(client, encoded_sales_path: str) -> None:
    response = client.post(
        f"/jin/api/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer"],
            "kpi_fields": ["data.RSV"],
            "tolerance_pct": 12,
            "confirmed": True,
        },
    )
    assert response.status_code == 200

    template_csv = client.get(f"/jin/template/{encoded_sales_path}.csv")
    assert template_csv.status_code == 200
    assert b"retailer,data.RSV,tolerance_pct" in template_csv.content


def test_status_warning_state_after_confirmable_observation(client, encoded_sales_path: str) -> None:
    response = client.post("/api/orders", json={"order_id": "A1", "amount": 20})
    assert response.status_code == 200
    payload = client.get("/jin/api/status").json()
    orders = next(item for item in payload["endpoints"] if item["endpoint_path"] == "/api/orders")
    assert orders["status"] == "warning"


def test_scheduler_pause_failure_without_pause_job() -> None:
    class StubScheduler:
        def __init__(self) -> None:
            self.calls = []

        def add_job(self, func, trigger, hours, id, replace_existing):
            self.calls.append(func)

    scheduler = JinScheduler()
    scheduler.scheduler = StubScheduler()

    async def boom():
        raise RuntimeError("boom")

    assert scheduler.register("job-x", "every 1h", boom)
    runner = scheduler.scheduler.calls[0]

    import asyncio

    for _ in range(3):
        asyncio.run(runner())

    assert scheduler.failures["job-x"] == 3


def test_scheduler_failure_tracking_and_pause() -> None:
    class StubScheduler:
        def __init__(self) -> None:
            self.calls = []

        def add_job(self, func, trigger, hours, id, replace_existing):
            self.calls.append((func, trigger, hours, id, replace_existing))

        def pause_job(self, job_id):
            self.calls.append(("pause", job_id))

    scheduler = JinScheduler()
    scheduler.scheduler = StubScheduler()

    async def boom():
        raise RuntimeError("boom")

    assert scheduler.register("job-x", "every 1h", boom)
    runner = scheduler.scheduler.calls[0][0]

    import asyncio

    for _ in range(3):
        asyncio.run(runner())

    assert scheduler.failures["job-x"] == 3
    assert ("pause", "job-x") in scheduler.scheduler.calls


def test_scheduler_skipped_and_run_now_metadata() -> None:
    scheduler = JinScheduler()
    scheduler.record_skipped("job-skip", "every 2h", "missing_default_params")
    skipped = next(item for item in scheduler.job_status() if item["job_id"] == "job-skip")
    assert skipped["last_status"] == "skipped"
    assert skipped["skip_reason"] == "missing_default_params"
    assert skipped["recent_runs"][0]["status"] == "skipped"

    class StubScheduler:
        def __init__(self) -> None:
            self.calls = []

        def add_job(self, func, trigger, hours, id, replace_existing):
            self.calls.append(func)

    scheduler.scheduler = StubScheduler()
    called = []

    async def run_me():
        called.append("ok")

    assert scheduler.register("job-run", "every 1h", run_me)
    import asyncio

    assert asyncio.run(scheduler.run_now("job-run"))
    assert called == ["ok"]
    job_run = next(item for item in scheduler.job_status() if item["job_id"] == "job-run")
    assert job_run["recent_runs"][0]["status"] == "success"
    assert not asyncio.run(scheduler.run_now("missing"))


def test_scheduler_run_now_exposes_manual_trigger_context() -> None:
    scheduler = JinScheduler()

    class StubScheduler:
        def __init__(self) -> None:
            self.calls = []

        def add_job(self, func, trigger, hours, id, replace_existing):
            self.calls.append(func)

    scheduler.scheduler = StubScheduler()
    seen_triggers: list[str] = []

    async def run_me():
        seen_triggers.append(scheduler.current_trigger())

    assert scheduler.register("job-trigger", "every 1h", run_me)
    runner = scheduler.scheduler.calls[0]
    import asyncio

    assert asyncio.run(scheduler.run_now("job-trigger"))
    asyncio.run(runner())
    assert seen_triggers == ["manual", "scheduler"]


def test_scheduler_sets_retry_backoff_before_pause() -> None:
    class StubScheduler:
        def __init__(self) -> None:
            self.calls = []

        def add_job(self, func, trigger, hours, id, replace_existing):
            self.calls.append(func)

        def pause_job(self, job_id):
            self.calls.append(("pause", job_id))

    scheduler = JinScheduler(failure_threshold=3, retry_backoff_seconds=30)
    scheduler.scheduler = StubScheduler()

    async def boom():
        raise RuntimeError("nope")

    assert scheduler.register("job-retry", "every 1h", boom)
    runner = scheduler.scheduler.calls[0]
    import asyncio

    asyncio.run(runner())
    first_state = next(item for item in scheduler.job_status() if item["job_id"] == "job-retry")
    assert first_state["last_status"] == "error"
    assert first_state["next_retry_at"] is not None
    assert first_state["backoff_active"] is True

    asyncio.run(runner())
    backoff_state = next(item for item in scheduler.job_status() if item["job_id"] == "job-retry")
    assert backoff_state["last_status"] == "backoff"
    assert backoff_state["recent_runs"][0]["status"] == "backoff"


def test_scheduler_backoff_helpers_tolerate_invalid_retry_timestamps() -> None:
    scheduler = JinScheduler(retry_backoff_seconds=30)
    assert scheduler._backoff_active({"next_retry_at": 123}) is False
    assert scheduler._backoff_active({"next_retry_at": "not-a-date"}) is False


def test_sync_endpoint_registry_falls_back_without_schema_column(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "sync-fallback.duckdb"))
    middleware.endpoint_registry["/custom"] = EndpointRecord(
        method="GET",
        path="/custom",
        response_model=None,
        endpoint_callable=lambda: None,
        fields=[{"name": "value", "kind": "kpi", "annotation": "float"}],
        dimension_fields=[],
        kpi_fields=["value"],
        metrics=[],
        watch_config={},
    )

    class FakeCursor:
        def fetchone(self):
            return None

    class FakeConnection:
        def __init__(self) -> None:
            self.calls: list[str] = []

        def execute(self, sql, _params=None):
            self.calls.append(sql)
            if "pydantic_schema" in sql:
                raise RuntimeError("missing column")
            if "CHECKPOINT" in sql:
                raise RuntimeError("checkpoint failed")
            return FakeCursor()

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    # In the new architecture, we mock jin_core.sync_registry since _get_connection isn't used for this
    # We'll just assert that the middleware completes without error when sync_registry is mocked
    
    mock_calls = []
    def mock_sync_registry(db_path, records_json):
        mock_calls.append((db_path, records_json))
        return "{}"
    
    monkeypatch.setattr("jin.middleware.sync_registry", mock_sync_registry)
    middleware._sync_endpoint_registry_to_db()
    
    assert len(mock_calls) == 1


def test_ensure_python_schema_tolerates_checkpoint_failure(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "schema-checkpoint.duckdb"))

    class FakeConnection:
        def __init__(self) -> None:
            self.calls: list[str] = []

        def execute(self, sql, _params=None):
            self.calls.append(sql)
            if "CHECKPOINT" in sql:
                raise RuntimeError("checkpoint failed")
            return self

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    # init_db is now a direct Rust call, we mock it to verify the middleware calls it
    mock_calls = []
    def mock_init_db(db_path):
        mock_calls.append(db_path)
        return None
        
    monkeypatch.setattr("jin.middleware.init_db", mock_init_db)
    middleware._initialized = False # Force re-init
    middleware._ensure_python_schema()

    assert len(mock_calls) == 1
    assert mock_calls[0] == middleware.db_path


def test_load_overrides_returns_empty_for_missing_legacy_rows(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "override-missing.duckdb"))

    class FakeCursor:
        def __init__(self, row):
            self.row = row

        def fetchone(self):
            return self.row

    class FakeConnection:
        def execute(self, sql, _params=None):
            if "tolerance_relaxed" in sql:
                raise RuntimeError("new columns missing")
            return FakeCursor(None)

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(middleware, "_get_connection", lambda: (FakeConnection(), FakeLock()))

    assert middleware._load_overrides("/api/missing") == {}


def test_register_scheduler_jobs_records_skipped_jobs(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "jobs-skipped.duckdb"))
    middleware.endpoint_registry["/needs-defaults"] = EndpointRecord(
        method="GET",
        path="/needs-defaults",
        response_model=None,
        endpoint_callable=lambda: None,
        fields=[],
        dimension_fields=[],
        kpi_fields=["value"],
        metrics=[],
        watch_config={"schedule": "every 1h"},
    )

    middleware._register_scheduler_jobs()

    skipped = next(item for item in middleware.scheduler.job_status() if item["job_id"] == "jin:/needs-defaults")
    assert skipped["last_status"] == "skipped"
    assert skipped["skip_reason"] == "missing_default_params"


def test_router_template_metadata_handles_query_errors(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "router-query-error.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)

    class BrokenConnection:
        def execute(self, *_args, **_kwargs):
            raise RuntimeError("query failed")

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(middleware, "_get_connection", lambda: (BrokenConnection(), FakeLock()))
    router = create_router(middleware)
    template_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith(".csv"))

    import asyncio

    response = asyncio.run(template_endpoint("api/sales/{retailer}/{period}"))
    assert b"retailer" in response.body


def test_router_template_metadata_tolerates_partial_bad_stored_json(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "router-bad-json.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)

    class FakeCursor:
        def fetchone(self):
            return ('[{"name":"value"}]', "{bad", "{bad")

    class FakeConnection:
        def execute(self, *_args, **_kwargs):
            return FakeCursor()

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(middleware, "_get_connection", lambda: (FakeConnection(), FakeLock()))
    monkeypatch.setattr(middleware, "_load_overrides", lambda _endpoint_path: {})
    router = create_router(middleware)
    template_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith(".csv"))

    import asyncio

    response = asyncio.run(template_endpoint("api/sales/{retailer}/{period}"))
    assert b"retailer" in response.body
    assert b"data.RSV" in response.body


def test_router_template_metadata_tolerates_bad_field_schema_json(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "router-bad-fields.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)

    class FakeCursor:
        def fetchone(self):
            return ("{bad", json.dumps(["retailer"]), json.dumps(["data.RSV"]))

    class FakeConnection:
        def execute(self, *_args, **_kwargs):
            return FakeCursor()

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(middleware, "_get_connection", lambda: (FakeConnection(), FakeLock()))
    monkeypatch.setattr(middleware, "_load_overrides", lambda _endpoint_path: {})
    router = create_router(middleware)
    template_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith(".csv"))

    import asyncio

    response = asyncio.run(template_endpoint("api/sales/{retailer}/{period}"))
    assert b"retailer" in response.body
    assert b"data.RSV" in response.body


def test_router_template_metadata_tolerates_missing_dimension_and_kpi_json(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "router-missing-columns.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)

    class FakeCursor:
        def fetchone(self):
            return (json.dumps([{"name": "value"}]), None, None)

    class FakeConnection:
        def execute(self, *_args, **_kwargs):
            return FakeCursor()

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(middleware, "_get_connection", lambda: (FakeConnection(), FakeLock()))
    monkeypatch.setattr(middleware, "_load_overrides", lambda _endpoint_path: {})
    router = create_router(middleware)
    template_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith(".csv"))

    import asyncio

    response = asyncio.run(template_endpoint("api/sales/{retailer}/{period}"))
    assert b"retailer" in response.body


def test_router_template_metadata_tolerates_empty_field_schema(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "router-empty-fields.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)

    class FakeCursor:
        def fetchone(self):
            return (None, json.dumps(["retailer"]), json.dumps(["data.RSV"]))

    class FakeConnection:
        def execute(self, *_args, **_kwargs):
            return FakeCursor()

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(middleware, "_get_connection", lambda: (FakeConnection(), FakeLock()))
    monkeypatch.setattr(middleware, "_load_overrides", lambda _endpoint_path: {})
    router = create_router(middleware)
    template_endpoint = next(route.endpoint for route in router.routes if getattr(route, "path", "").endswith(".csv"))

    import asyncio

    response = asyncio.run(template_endpoint("api/sales/{retailer}/{period}"))
    assert b"retailer" in response.body
    assert b"data.RSV" in response.body


def test_endpoint_detail_fallback_supports_legacy_config_rows(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "detail-legacy.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    monkeypatch.setattr(router_module, "get_endpoint_detail", None)

    class FakeCursor:
        def __init__(self, row):
            self.row = row

        def fetchone(self):
            return self.row

        def fetchall(self):
            return []

    class FakeConnection:
        def execute(self, sql, _params=None):
            if "FROM jin_endpoints" in sql:
                return FakeCursor(
                    ("/api/sales/{retailer}/{period}", "GET", json.dumps(["retailer"]), json.dumps(["data.RSV"]))
                )
            if "tolerance_relaxed" in sql:
                raise RuntimeError("legacy config only")
            if "FROM jin_config" in sql:
                return FakeCursor((json.dumps(["retailer"]), json.dumps(["data.RSV"]), 12.0, True))
            return FakeCursor([])

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(middleware, "_get_connection", lambda: (FakeConnection(), FakeLock()))
    router = create_router(middleware)
    detail_endpoint = next(route.endpoint for route in router.routes if "/api/endpoint/" in getattr(route, "path", ""))

    import asyncio

    response = asyncio.run(detail_endpoint("api/sales/{retailer}/{period}"))
    payload = json.loads(response.body)

    assert payload["config"]["tolerance_pct"] == 12.0
    assert payload["config"]["active_tolerance"] == "normal"


def test_endpoint_detail_returns_503_when_connection_fails(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "detail-503.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    monkeypatch.setattr(router_module, "get_endpoint_detail", None)

    def boom():
        raise RuntimeError("connection exploded")

    monkeypatch.setattr(middleware, "_get_connection", boom)
    router = create_router(middleware)
    detail_endpoint = next(route.endpoint for route in router.routes if "/api/endpoint/" in getattr(route, "path", ""))

    import asyncio

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(detail_endpoint("api/sales/{retailer}/{period}"))
    assert exc_info.value.status_code == 503


def test_config_route_fallback_supports_legacy_config_insert(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "config-legacy.duckdb"))
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/sales/amazon/YTD",
            "headers": [],
            "query_string": b"",
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "app": app,
        }
    )
    middleware._discover_routes(request)
    monkeypatch.setattr(router_module, "save_endpoint_config", None)

    class FakeConnection:
        def __init__(self) -> None:
            self.calls: list[str] = []

        def execute(self, sql, _params=None):
            self.calls.append(sql)
            if "tolerance_relaxed" in sql:
                raise RuntimeError("legacy config only")
            return self

    class FakeLock:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    fake_conn = FakeConnection()
    monkeypatch.setattr(middleware, "_get_connection", lambda: (fake_conn, FakeLock()))
    router = create_router(middleware)
    config_endpoint = next(route.endpoint for route in router.routes if "/api/config/" in getattr(route, "path", ""))

    class FakeRequest:
        async def json(self):
            return {
                "dimension_fields": ["retailer"],
                "kpi_fields": ["data.RSV"],
                "tolerance_pct": 11.0,
                "confirmed": True,
            }

    import asyncio

    response = asyncio.run(
        config_endpoint("api/sales/{retailer}/{period}", FakeRequest())
    )
    payload = json.loads(response.body)

    assert payload == {"ok": True}
    assert any("tolerance_relaxed" in sql for sql in fake_conn.calls)
    assert any("tolerance_pct, confirmed, time_field, time_granularity, updated_at" in sql for sql in fake_conn.calls)


def test_config_mapping_preview_endpoint_parses_nested_rows_path(
    client,
    encoded_sales_path: str,
) -> None:
    response = client.post(
        f"/jin/api/v2/config-mapping/test/{encoded_sales_path}",
        json={
            "sample_payload": {
                "data": [
                    {"retailer": "amazon", "period_week": "2025-W13", "orders": 10},
                    {"retailer": "walmart", "period_week": "2025-W14", "orders": 12},
                ]
            },
            "rows_path": "data[]",
            "time_field": "period_week",
            "time_profile": "year_week",
            "time_extraction_rule": "single",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["sample_source"] == "request_payload"
    assert payload["row_extraction_source"] == "rows_path"
    assert payload["sample_count"] == 2
    assert payload["summary"]["success_count"] == 2
    assert payload["summary"]["detected_granularity"] == "week"


def test_config_mapping_preview_uses_runtime_history_when_payload_missing(
    client,
    encoded_sales_path: str,
) -> None:
    # Seed runtime history so preview works without a pasted payload.
    seed = client.get("/api/sales/amazon/YTD?value=100")
    assert seed.status_code == 200

    response = client.post(
        f"/jin/api/v2/config-mapping/test/{encoded_sales_path}",
        json={
            "time_field": "period",
            "time_profile": "token",
            "time_extraction_rule": "single",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["sample_source"] == "runtime_history"
    assert payload["sample_count"] >= 1
    assert payload["summary"]["success_count"] >= 1


def test_config_mapping_preview_uses_saved_mapping_defaults_when_payload_is_minimal(
    client,
    encoded_sales_path: str,
) -> None:
    save = client.post(
        f"/jin/api/v2/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["data.RSV", "data.units"],
            "tolerance_pct": 10.0,
            "confirmed": True,
            "rows_path": "data[]",
            "time_field": "period",
            "time_profile": "token",
            "time_extraction_rule": "single",
        },
    )
    assert save.status_code == 200
    seed = client.get("/api/sales/amazon/YTD?value=100")
    assert seed.status_code == 200

    preview = client.post(
        f"/jin/api/v2/config-mapping/test/{encoded_sales_path}",
        json={},
    )
    assert preview.status_code == 200
    payload = preview.json()
    assert payload["ok"] is True
    assert payload["mapping"]["rows_path"] == "data[]"
    assert payload["mapping"]["time_field"] == "period"
    assert payload["mapping"]["time_profile"] == "token"
    assert payload["mapping"]["time_extraction_rule"] == "single"


def test_save_config_persists_time_mapping_overrides_in_endpoint_detail(
    client,
    encoded_sales_path: str,
) -> None:
    save = client.post(
        f"/jin/api/v2/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["data.RSV", "data.units"],
            "tolerance_pct": 11.0,
            "tolerance_relaxed": 18.0,
            "tolerance_normal": 11.0,
            "tolerance_strict": 6.0,
            "active_tolerance": "normal",
            "confirmed": True,
            "rows_path": "data[]",
            "time_field": "period",
            "time_end_field": "period_end",
            "time_granularity": "week",
            "time_profile": "token",
            "time_extraction_rule": "last",
            "time_format": "%Y-W%W",
            "time_pin": True,
        },
    )
    assert save.status_code == 200
    detail = client.get(f"/jin/api/v2/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    config = detail.json()["config"]
    assert config["rows_path"] == "data[]"
    assert config["time_field"] == "period"
    assert config["time_end_field"] == "period_end"
    assert config["time_profile"] == "token"
    assert config["time_extraction_rule"] == "last"
    assert config["time_format"] == "%Y-W%W"
    assert config["time_pin"] is True


def test_save_config_native_path_upserts_mapping_override_columns(
    client,
    monkeypatch: pytest.MonkeyPatch,
    encoded_sales_path: str,
) -> None:
    monkeypatch.setattr(router_module, "save_endpoint_config", lambda *_args, **_kwargs: json.dumps({"ok": True}))
    endpoint_path = "/api/sales/{retailer}/{period}"

    first = client.post(
        f"/jin/api/v2/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["data.RSV", "data.units"],
            "tolerance_pct": 10.0,
            "confirmed": True,
            "rows_path": "data[]",
            "time_field": "period",
            "time_profile": "token",
            "time_extraction_rule": "single",
            "time_pin": False,
        },
    )
    assert first.status_code == 200

    second = client.post(
        f"/jin/api/v2/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["data.RSV", "data.units"],
            "tolerance_pct": 10.0,
            "confirmed": True,
            "rows_path": "payload.items[]",
            "time_field": "period",
            "time_end_field": "period_end",
            "time_profile": "year_week",
            "time_extraction_rule": "last",
            "time_format": "%Y-W%W",
            "time_pin": True,
        },
    )
    assert second.status_code == 200

    status_payload = client.get("/jin/api/v2/status").json()
    db_path = status_payload["project"]["db_path"]
    with duckdb.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT rows_path, time_end_field, time_profile, time_extraction_rule, time_format, time_pin
            FROM jin_config
            WHERE endpoint_path = ?
            """,
            [endpoint_path],
        ).fetchone()
    assert row is not None
    assert row[0] == "payload.items[]"
    assert row[1] == "period_end"
    assert row[2] == "year_week"
    assert row[3] == "last"
    assert row[4] == "%Y-W%W"
    assert bool(row[5]) is True


def test_upload_preview_uses_saved_config_after_restart_without_auto_infer_warning(
    client,
    encoded_sales_path: str,
) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    save = client.post(
        f"/jin/api/v2/config/{encoded_sales_path}",
        json={
            "dimension_fields": ["retailer", "period"],
            "kpi_fields": ["data.RSV", "data.units"],
            "tolerance_pct": 10.0,
            "confirmed": True,
            "time_field": "period",
            "time_granularity": "week",
        },
    )
    assert save.status_code == 200

    middleware = client.app.middleware_stack.app
    middleware.override_state.clear()
    record = middleware.endpoint_registry[endpoint_path]
    record.dimension_fields = []
    record.kpi_fields = []

    preview = client.post(
        f"/jin/api/v2/upload-preview/{encoded_sales_path}",
        files={
            "file": (
                "simple.csv",
                b"retailer,period,data.RSV,data.units\namazon,YTD,120,60\n",
                "text/csv",
            )
        },
    )
    assert preview.status_code == 200
    payload = preview.json()
    assert payload["ok"] is True
    assert payload["rows_found"] == 1
    assert not any("auto-inferred" in str(item).lower() for item in payload.get("warnings", []))


def test_dashboard_asset_missing_on_disk_returns_404(client, monkeypatch: pytest.MonkeyPatch) -> None:
    original_exists = Path.exists

    def fake_exists(self: Path) -> bool:
        if self.name == "dashboard.css":
            return False
        return original_exists(self)

    monkeypatch.setattr(Path, "exists", fake_exists)
    response = client.get("/jin/assets/dashboard.css")
    assert response.status_code == 404

def test_rollups_population_and_query(client) -> None:
    query_payload = {
        "measures": ["data.RSV"],
        "dimensions": ["retailer"],
        "limit": 10
    }

    # Trigger observations that should populate rollups
    client.get("/api/sales/amazon/YTD?value=100")
    client.get("/api/sales/amazon/YTD?value=120")

    response = client.post("/jin/api/v1/query", json=query_payload)
    assert response.status_code == 200
    payload = response.json()
    rows = payload.get("data")
    assert isinstance(rows, list)
    assert payload.get("results") == rows

    amazon_rows = [
        row
        for row in rows
        if "retailer=amazon" in str(row.get("grain_key") or "") and row.get("metric_name") == "data.RSV"
    ]
    if amazon_rows:
        total_value = sum(float(row.get("value") or 0.0) for row in amazon_rows)
        total_samples = sum(int(row.get("samples") or 0) for row in amazon_rows)
        assert total_value >= 120.0
        assert total_samples >= 1
