from __future__ import annotations

import base64
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

import duckdb
import jin.middleware as middleware_module
from jin.core.license import LicensePolicy
from jin.middleware import EndpointRecord, JinMiddleware


def test_project_catalog_limits_and_required_fields(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JIN_LICENSE_ENFORCEMENT", "1")
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-catalog.duckdb"))

    middleware.project_root = ""
    with pytest.raises(ValueError, match="project root is required"):
        middleware.add_project_to_catalog("phase5", db_path=str(tmp_path / "p1.duckdb"))

    middleware.project_root = str(tmp_path)
    middleware.db_path = ""
    with pytest.raises(ValueError, match="project db_path is required"):
        middleware.add_project_to_catalog("phase5")

    middleware.db_path = str(tmp_path / "phase5-catalog.duckdb")
    monkeypatch.setattr(middleware.license_client, "get_policy", lambda: SimpleNamespace(tier="free"))
    monkeypatch.setattr(middleware, "_load_license_projects_registry", lambda _path: ["different-project"])
    with pytest.raises(ValueError, match="Free tier allows one project per account"):
        middleware.add_project_to_catalog(
            "locked",
            root=str(tmp_path / "another-root"),
            db_path=str(tmp_path / "another.duckdb"),
        )

    saved_registry: list[list[str]] = []
    monkeypatch.setattr(middleware, "_load_license_projects_registry", lambda _path: [])
    monkeypatch.setattr(
        middleware,
        "_save_license_projects_registry",
        lambda _path, rows: saved_registry.append(list(rows)),
    )
    created = middleware.add_project_to_catalog(
        "starter",
        root=str(tmp_path / "starter-root"),
        db_path=str(tmp_path / "starter.duckdb"),
    )
    assert created["name"] == "starter"
    assert saved_registry and len(saved_registry[0]) == 1


def test_project_catalog_is_permissive_when_license_enforcement_is_disabled(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("JIN_LICENSE_ENFORCEMENT", raising=False)
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-catalog-open.duckdb"))
    monkeypatch.setattr(middleware.license_client, "get_policy", lambda: LicensePolicy(tier="free"))
    monkeypatch.setattr(middleware, "_load_license_projects_registry", lambda _path: ["different-project"])

    created = middleware.add_project_to_catalog(
        "open-mode",
        root=str(tmp_path / "open-root"),
        db_path=str(tmp_path / "open.duckdb"),
    )
    assert created["name"] == "open-mode"

    meta = middleware.get_license_meta()
    assert meta["license_enforced"] is False
    assert meta["is_unlicensed"] is False
    assert meta["project_limit"] is None


def test_project_list_and_lifecycle_edge_paths(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-list.duckdb"))
    current_id = middleware._project_catalog_id(middleware.project_name, middleware.project_root, middleware.db_path)

    archived_current = middleware._current_project_payload(
        current_id,
        middleware.project_name,
        middleware.project_root,
        middleware.db_path,
    )
    archived_current["archived_at"] = "2026-03-24 10:00:00"
    archived_other = dict(archived_current)
    archived_other["id"] = "archived-other"
    archived_other["name"] = "archived-other"

    saved_active_ids: list[str] = []
    monkeypatch.setattr(middleware, "_load_projects_catalog", lambda: [dict(archived_current), dict(archived_other)])
    monkeypatch.setattr(middleware, "_load_active_project_id", lambda: "archived-other")
    monkeypatch.setattr(middleware, "_save_active_project_id", lambda project_id: saved_active_ids.append(str(project_id)))
    assert middleware.list_projects_catalog(include_archived=False) == []
    assert saved_active_ids and saved_active_ids[0] == current_id

    lifecycle = JinMiddleware(app, db_path=str(tmp_path / "phase5-lifecycle.duckdb"))
    current_id = lifecycle._project_catalog_id(lifecycle.project_name, lifecycle.project_root, lifecycle.db_path)

    with pytest.raises(ValueError, match="project_id is required"):
        lifecycle.archive_project_in_catalog("")
    with pytest.raises(ValueError, match="cannot archive the current runtime project"):
        lifecycle.archive_project_in_catalog(current_id)
    with pytest.raises(ValueError, match="project not found"):
        lifecycle.archive_project_in_catalog("missing-project")

    with pytest.raises(ValueError, match="project_id is required"):
        lifecycle.restore_project_in_catalog("")

    restored_current = lifecycle.restore_project_in_catalog(current_id)
    assert restored_current["id"] == current_id
    assert restored_current["is_archived"] is False

    active_project = lifecycle.resolve_project(current_id)
    assert active_project["id"] == current_id

    archived = lifecycle.add_project_to_catalog(
        "archived-target",
        root=str(tmp_path / "archived-root"),
        db_path=str(tmp_path / "archived.duckdb"),
    )
    archived_id = str(archived["id"])
    lifecycle.archive_project_in_catalog(archived_id)
    with pytest.raises(ValueError, match="cannot activate an archived project"):
        lifecycle.set_active_project(archived_id)

    with pytest.raises(ValueError, match="project_id is required"):
        lifecycle.delete_project_from_catalog("")
    with pytest.raises(ValueError, match="cannot delete the current runtime project"):
        lifecycle.delete_project_from_catalog(current_id)
    with pytest.raises(ValueError, match="project not found"):
        lifecycle.delete_project_from_catalog("missing-delete")

    non_archived = lifecycle.add_project_to_catalog(
        "live-target",
        root=str(tmp_path / "live-root"),
        db_path=str(tmp_path / "live.duckdb"),
    )
    with pytest.raises(ValueError, match="project must be archived before deletion"):
        lifecycle.delete_project_from_catalog(str(non_archived["id"]))

    lifecycle.archive_project_in_catalog(str(non_archived["id"]))
    saved_after_delete: list[str] = []
    monkeypatch.setattr(lifecycle, "_load_active_project_id", lambda: str(non_archived["id"]))
    monkeypatch.setattr(lifecycle, "_save_active_project_id", lambda project_id: saved_after_delete.append(str(project_id)))
    deleted = lifecycle.delete_project_from_catalog(str(non_archived["id"]))
    assert deleted["active"] is False
    assert saved_after_delete


def test_apply_policy_reason_paths(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-policy.duckdb"))

    async def endpoint_callable() -> dict[str, float]:
        return {"value": 10.0}

    record = EndpointRecord(
        method="GET",
        path="/api/policy",
        response_model=None,
        endpoint_callable=endpoint_callable,
        fields=[],
        dimension_fields=["retailer"],
        kpi_fields=["value"],
        metrics=[],
        watch_config={},
    )
    middleware.endpoint_registry[record.path] = record

    current_project = middleware.add_project_to_catalog(middleware.project_name, source="runtime")
    foreign_project = middleware.add_project_to_catalog(
        "foreign-policy",
        root=str(tmp_path / "foreign-root"),
        db_path=str(tmp_path / "foreign.duckdb"),
    )

    foreign_result = middleware.apply_project_monitor_policy(
        str(foreign_project["id"]),
        endpoint_paths=[record.path],
    )
    assert foreign_result["requested"] == 0
    assert "Load this project runtime" in foreign_result["message"]

    missing_result = middleware.apply_project_monitor_policy(
        str(current_project["id"]),
        endpoint_paths=["/missing-endpoint"],
    )
    assert missing_result["results"][0]["reason"] == "endpoint_not_found"

    monkeypatch.setattr(middleware, "project_monitor_policy", lambda _project_id: {"schedule": "bad schedule", "baseline_mode": "fixed"})
    monkeypatch.setattr(middleware.scheduler, "is_supported_schedule", lambda schedule: str(schedule) != "bad schedule")
    unsupported_result = middleware.apply_project_monitor_policy(
        str(current_project["id"]),
        endpoint_paths=[record.path],
    )
    assert unsupported_result["results"][0]["reason"] == "unsupported_schedule"

    monkeypatch.setattr(middleware, "project_monitor_policy", lambda _project_id: {"schedule": "every 2h", "baseline_mode": "fixed"})
    monkeypatch.setattr(middleware.scheduler, "is_supported_schedule", lambda _schedule: True)
    missing_defaults_result = middleware.apply_project_monitor_policy(
        str(current_project["id"]),
        endpoint_paths=[record.path],
    )
    assert missing_defaults_result["results"][0]["reason"] == "missing_default_params"


@pytest.mark.asyncio
async def test_bundle_run_and_digest_status_paths(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-bundle.duckdb"))
    project = middleware.add_project_to_catalog(middleware.project_name, source="runtime")
    project_id = str(project["id"])

    middleware.scheduler_snapshot = lambda: [  # type: ignore[assignment]
        {"job_id": "jin:/api/policy", "endpoint_path": "/api/policy"}
    ]

    async def run_now_false(_job_id: str) -> bool:
        return False

    monkeypatch.setattr(middleware.scheduler, "run_now", run_now_false)
    not_scheduled = await middleware.run_project_bundle(project_id, endpoint_paths=["/api/policy"])
    assert not_scheduled["status"] == "not_scheduled"
    assert not_scheduled["executed"] == 0

    async def run_now_true(_job_id: str) -> bool:
        return True

    monkeypatch.setattr(middleware.scheduler, "run_now", run_now_true)
    middleware.scheduler_snapshot = lambda: [  # type: ignore[assignment]
        {"job_id": "jin:/api/policy", "last_status": "error", "last_error": "boom"}
    ]
    degraded = await middleware.run_project_bundle(project_id, endpoint_paths=["/api/policy"])
    assert degraded["status"] == "degraded"
    assert degraded["errors"] == 1

    foreign = middleware.add_project_to_catalog(
        "foreign-bundle",
        root=str(tmp_path / "foreign-bundle-root"),
        db_path=str(tmp_path / "foreign-bundle.duckdb"),
    )
    not_executable = await middleware.run_project_bundle(str(foreign["id"]), endpoint_paths=["/api/policy"])
    assert not_executable["ok"] is False
    assert not_executable["status"] == "not_executable"

    bad_bundle_path = tmp_path / "bad-bundle.json"
    bad_bundle_path.write_text("{bad-json")
    monkeypatch.setattr(middleware, "_bundle_runs_path", lambda: bad_bundle_path)
    assert middleware._load_bundle_runs() == []

    bad_bundle_path.write_text(json.dumps({"not": "a-list"}))
    assert middleware._load_bundle_runs() == []

    digest = middleware.bundle_digest_payload(days=1, project_ids=[project_id], limit=5)
    assert digest["totals"]["runs"] >= 0
    assert isinstance(digest["projects"], list)


def test_auth_and_comparison_branches(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-auth.duckdb"))
    middleware.auth_enabled = True
    middleware.auth_username = "operator"
    middleware.auth_password_hash = "sha256$390000$salt$digest"
    assert middleware._verify_password("secret-pass") is False

    middleware.auth_password_hash = middleware._hash_password("secret-pass")
    assert middleware.authenticate_credentials("operator", "secret-pass") is True

    class DummyRequest:
        def __init__(self, cookie_value: str) -> None:
            self.cookies = {middleware.auth_session_cookie: cookie_value}

    token = middleware.create_session_token("operator")
    assert middleware.is_authenticated(request=DummyRequest(token)) is True

    tampered = token[:-3] + "abc"
    assert middleware.is_authenticated(request=DummyRequest(tampered)) is False
    assert middleware.is_authenticated(authorization="Basic invalid-base64") is False

    basic = base64.b64encode(b"operator:secret-pass").decode("ascii")
    assert middleware.is_authenticated(authorization=f"Basic {basic}") is True

    assert middleware._comparison_pct_change(120, 100, fallback_pct=7.0) == 7.0
    assert middleware._comparison_pct_change("x", 100) is None
    assert middleware._comparison_pct_change(100, 0) is None
    assert middleware._comparison_pct_change(0, 0) == 0.0

    assert "could not complete" in middleware._comparison_reason("amount", 0, 0, "error", None)
    assert "did not find an uploaded reference" in middleware._comparison_reason(
        "amount",
        0,
        0,
        "missing_reference",
        None,
    )
    assert "did not include amount" in middleware._comparison_reason("amount", None, 100, "missing_kpi", None)
    assert "within the allowed" in middleware._comparison_reason("amount", 101, 100, "match", 1.0, 5.0)
    assert "did not match the uploaded reference" in middleware._comparison_reason("amount", "x", "y", "mismatch", None)
    assert "different than the reference" in middleware._comparison_reason("amount", 100, 100, "mismatch", 0.0)

    monkeypatch.setattr(middleware_module, "init_db", None)
    middleware._initialized = False
    middleware._init_db_if_needed()
    # When native init is unavailable, Jin should still initialize a Python schema
    # so uploads/reconciliation work in Python-only mode.
    assert middleware._initialized is True


def test_override_and_processed_item_branches(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-overrides.duckdb"))
    endpoint_path = "/api/override"

    def load_override_error(_db_path: str, _endpoint_path: str) -> str:
        raise RuntimeError("native override boom")

    monkeypatch.setattr(middleware_module, "load_saved_endpoint_config", load_override_error)
    assert middleware._load_overrides(endpoint_path) == {}
    assert any(item["source"] == "config.overrides" for item in middleware.recent_errors)

    monkeypatch.setattr(
        middleware_module,
        "load_saved_endpoint_config",
        lambda _db_path, _endpoint_path: json.dumps(
            {
                "dimension_fields": ["retailer"],
                "kpi_fields": ["data.RSV"],
                "tolerance_pct": 9.0,
                "confirmed": True,
            }
        ),
    )
    loaded = middleware._load_overrides(endpoint_path)
    assert loaded["confirmed"] is True
    assert loaded["active_tolerance"] == "normal"

    # If native config loading returns an empty payload (e.g. missing row or degraded native store),
    # Jin should fall back to the Python DuckDB config row when present.
    monkeypatch.setattr(middleware_module, "load_saved_endpoint_config", lambda *_args, **_kwargs: "{}")
    with middleware.db_lock():
        with duckdb.connect(middleware.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS jin_config (
                    endpoint_path VARCHAR PRIMARY KEY,
                    dimension_overrides VARCHAR,
                    kpi_overrides VARCHAR,
                    tolerance_pct DOUBLE DEFAULT 10.0,
                    confirmed BOOLEAN DEFAULT false,
                    time_field VARCHAR,
                    time_granularity VARCHAR DEFAULT 'minute',
                    updated_at TIMESTAMP DEFAULT now()
                )
                """
            )
            conn.execute(
                """
                INSERT OR REPLACE INTO jin_config (
                    endpoint_path, dimension_overrides, kpi_overrides, tolerance_pct, confirmed, time_field, time_granularity, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, now())
                """,
                [
                    endpoint_path,
                    json.dumps(["retailer"]),
                    json.dumps(["data.RSV"]),
                    12.0,
                    True,
                    "period",
                    "week",
                ],
            )
    loaded = middleware._load_overrides(endpoint_path)
    assert loaded["dimension_fields"] == ["retailer"]
    assert loaded["kpi_fields"] == ["data.RSV"]
    assert loaded["confirmed"] is True
    assert loaded["time_field"] == "period"

    record = EndpointRecord(
        method="GET",
        path=endpoint_path,
        response_model=None,
        endpoint_callable=lambda: {},
        fields=[],
        dimension_fields=["retailer"],
        kpi_fields=["data.RSV"],
        metrics=[],
        watch_config={},
    )

    monkeypatch.setattr(
        middleware,
        "_process_item",
        lambda *_args, **_kwargs: {
            "grain_key": "grain-a",
            "anomalies": [{"kpi_field": "data.RSV", "pct_change": 12.5}],
        },
    )
    monkeypatch.setattr(middleware, "_mirror_python_state", lambda *_args, **_kwargs: None)
    processed = middleware._record_processed_item(record, record.path, record.method, "{}", {"data": {}}, "{}")
    assert processed["grain_key"] == "grain-a"


def test_demo_disable_native_config_load_skips_native_override_loading(
    app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-demo-overrides.duckdb"))
    endpoint_path = "/api/demo"

    monkeypatch.setenv("JIN_DISABLE_NATIVE_CONFIG_LOAD", "1")

    def boom(_db_path: str, _endpoint_path: str) -> str:
        raise AssertionError("native config loader should be skipped for the demo harness")

    monkeypatch.setattr(middleware_module, "load_saved_endpoint_config", boom)
    assert middleware._load_overrides(endpoint_path) == {}
    assert middleware.recent_errors == []


def test_dashboard_safe_mode_endpoints_avoid_duckdb_native_reads(
    client,
    encoded_sales_path: str,
) -> None:
    headers = {"x-jin-client": "dashboard"}
    status = client.get("/jin/api/v2/status", headers=headers)
    assert status.status_code == 200
    payload = status.json()
    assert isinstance(payload, dict)

    anomalies = client.get("/jin/api/v2/anomalies", headers=headers)
    assert anomalies.status_code == 200
    anomalies_payload = anomalies.json()
    assert "anomalies" in anomalies_payload
    assert "issues" in anomalies_payload

    endpoint = client.get(f"/jin/api/v2/endpoint/{encoded_sales_path}", headers=headers)
    assert endpoint.status_code == 200
    endpoint_payload = endpoint.json()
    assert endpoint_payload["endpoint_path"] == "/api/sales/{retailer}/{period}"
    assert "config" in endpoint_payload
    assert "setup" in endpoint_payload


def test_windows_multi_worker_guard_disables_scheduler(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UVICORN_WORKERS", "4")
    monkeypatch.setenv("JIN_FORCE_WINDOWS_GUARDS", "1")
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-windows-guard.duckdb"))
    assert middleware.scheduler_enabled is False
    assert any(item.get("source") == "middleware.db" for item in middleware.recent_errors)


@pytest.mark.asyncio
async def test_run_upload_analysis_native_array_and_fallback_processed_item_paths(
    app,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-upload-analysis.duckdb"))
    endpoint_path = "/api/sales/{retailer}/{period}"
    record = EndpointRecord(
        method="GET",
        path=endpoint_path,
        response_model=None,
        endpoint_callable=lambda: {},
        fields=[],
        dimension_fields=["retailer", "period"],
        kpi_fields=["data.RSV"],
        metrics=[],
        watch_config={},
    )
    middleware.endpoint_registry[endpoint_path] = record

    monkeypatch.setenv("JIN_UPLOAD_ANALYSIS_SAFE_MODE", "false")
    monkeypatch.setattr(
        middleware,
        "_prepare_reference_invocation",
        lambda _record, _row: {"path_params": {}, "query_params": {}, "body": {}},
    )

    async def _fake_invoke(_record, _invocation):
        return {"data": [{"retailer": "amazon", "period": "YTD", "RSV": 100.0}]}, "{}"

    monkeypatch.setattr(middleware, "_invoke_endpoint_callable", _fake_invoke)

    extraction_counter = {"count": 0}

    def _fake_extract(_record, _data):
        extraction_counter["count"] += 1
        if extraction_counter["count"] == 1:
            return (
                [{"retailer": "amazon", "period": "YTD", "RSV": 100.0}],
                [{"data[].retailer": "amazon", "data[].period": "YTD", "data[].RSV": 100.0}],
            )
        return (None, None)

    monkeypatch.setattr(middleware, "_extract_array_items_for_result", _fake_extract)
    monkeypatch.setattr(
        middleware,
        "_run_native_process_observations",
        lambda *_args, **_kwargs: [
            {
                "grain_key": f"{endpoint_path}|period=YTD|retailer=amazon",
                "dimension_json": {"retailer": "amazon", "period": "YTD"},
                "comparisons": [{"kpi_field": "data.RSV", "actual": 100.0, "expected": 100.0, "delta": 0.0}],
                "anomalies": [],
            }
        ],
    )
    monkeypatch.setattr(middleware, "_mirror_python_state", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        middleware,
        "_record_processed_item",
        lambda *_args, **_kwargs: {
            "grain_key": f"{endpoint_path}|period=YTD|retailer=walmart",
            "dimension_json": {"retailer": "walmart", "period": "YTD"},
            "comparisons": [{"kpi_field": "data.RSV", "actual": 90.0, "expected": 90.0, "delta": 0.0}],
            "anomalies": [],
        },
    )

    normalized_rows = [
        {
            "dimensions": {"retailer": "amazon", "period": "YTD"},
            "expected": {"data.RSV": 100.0},
            "tolerance_pct": 10.0,
        },
        {
            "dimensions": {"retailer": "walmart", "period": "YTD"},
            "expected": {"data.RSV": 90.0},
            "tolerance_pct": 10.0,
        },
    ]
    payload = await middleware.run_upload_analysis(endpoint_path, normalized_rows, max_runs=2)
    assert payload["status"] == "success"
    assert payload["attempted_runs"] == 2
    assert payload["successful_runs"] == 2
    assert payload["failed_runs"] == 0
    assert len(payload["runs"]) == 2


@pytest.mark.asyncio
async def test_process_observation_native_failure_uses_python_runtime_fallback(
    app,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "phase5-process-fallback.duckdb"))
    endpoint_path = "/api/revenue/{retailer}"
    record = EndpointRecord(
        method="GET",
        path=endpoint_path,
        response_model=None,
        endpoint_callable=lambda: {},
        fields=[],
        dimension_fields=["retailer", "data[].date", "data[].label"],
        kpi_fields=["data[].revenue", "data[].orders"],
        metrics=[],
        watch_config={},
    )

    monkeypatch.setattr(
        middleware,
        "_run_native_process_observations_async",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("native observation boom")),
    )

    await middleware._process_observation_payload_async(
        record,
        endpoint_path,
        "GET",
        json.dumps({"path": {"retailer": "walmart"}, "query": {"dates": ["2026-03-19"]}, "body": {}, "headers": {}}),
        [
            {"date": "2026-03-19", "label": "current", "revenue": 4711.9, "orders": 100},
            {"date": "2026-03-18", "label": "baseline", "revenue": 4500.0, "orders": 98},
        ],
        "{}",
    )

    state = middleware._runtime_endpoint_state(endpoint_path)
    assert len(state["history"]) == 2
    assert state["history"][0]["dimension_json"]["retailer"] == "walmart"
    assert {entry["kpi_json"]["data[].revenue"] for entry in state["history"]} == {4711.9, 4500.0}
    assert len(state["recent_history"]) == 2
