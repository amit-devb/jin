from __future__ import annotations

import asyncio
import json
from pathlib import Path
from urllib.parse import quote

import duckdb
import pytest
from pydantic import BaseModel

from jin.config import classify_model
from jin.middleware import EndpointRecord, JinMiddleware
from jin.metrics import override_metrics
from jin.technical_metadata import default_technical_metadata_value
from jin.templates import convert_po_rows_to_internal
from jin.uploader import _technical_default_for_field, validate_upload_rows
import jin.router as router_module
import jin.middleware as middleware_module


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


def test_router_native_detail_and_anomaly_action_paths(client, monkeypatch: pytest.MonkeyPatch) -> None:
    client.get("/api/sales/amazon/YTD?value=100")
    endpoint_path = "/api/sales/{retailer}/{period}"
    encoded = quote(endpoint_path, safe="")
    middleware = client.app.middleware_stack.app
    middleware._runtime_endpoint_state(endpoint_path)["anomalies"] = [{"id": 777, "is_active": True}]

    def native_get_endpoint_detail(_db_path, path, _history_limit, _reference_limit):
        assert path == endpoint_path
        return json.dumps(
            {
                "endpoint": {
                    "http_method": "GET",
                    "dimension_fields": ["retailer", "period"],
                    "kpi_fields": ["data.RSV"],
                    "schema_contract": {
                        "fields": [{"name": "retailer"}, {"name": "period"}, {"name": "data.RSV"}],
                        "dimension_fields": ["retailer", "period"],
                        "kpi_fields": ["data.RSV"],
                    },
                },
                "history": [],
                "anomalies": [
                    {
                        "id": 777,
                        "endpoint_path": endpoint_path,
                        "kpi_field": "data.RSV",
                        "actual_value": 120.0,
                        "expected_value": 100.0,
                        "pct_change": 20.0,
                    }
                ],
                "config": {"dimension_fields": ["retailer", "period"], "kpi_fields": ["data.RSV"]},
                "references": [],
            }
        )

    def native_issues_list(_db_path, _endpoint_path=None, _status=None):
        return json.dumps(
            [
                {
                    "id": 777,
                    "endpoint_path": endpoint_path,
                    "kpi_field": "data.RSV",
                    "actual_value": 120.0,
                    "expected_value": 100.0,
                    "pct_change": 20.0,
                    "detection_method": "reconciliation",
                    "status": "active",
                    "incident_status": "active",
                    "snoozed_until": None,
                    "suppressed_until": None,
                }
            ]
        )

    update_calls: list[dict[str, object]] = []

    def native_issues_update(_db_path, anomaly_id, action, note, owner, resolution_reason, until):
        update_calls.append(
            {
                "id": int(anomaly_id),
                "action": action,
                "note": note,
                "owner": owner,
                "resolution_reason": resolution_reason,
                "until": until,
            }
        )
        return json.dumps(
            {
                "ok": True,
                "id": int(anomaly_id),
                "status": action,
                "incident_status": action,
                "snoozed_until": until if action == "snoozed" else None,
                "suppressed_until": until if action == "suppressed" else None,
            }
        )

    def native_promote_anomaly(_db_path, anomaly_id):
        return json.dumps({"status": "ok", "anomaly_id": int(anomaly_id)})

    monkeypatch.setattr(router_module, "get_endpoint_detail", native_get_endpoint_detail)
    monkeypatch.setattr(router_module, "issues_list", native_issues_list)
    monkeypatch.setattr(router_module, "issues_update", native_issues_update)
    monkeypatch.setattr(router_module, "promote_anomaly_to_baseline", native_promote_anomaly, raising=False)

    detail = client.get(f"/jin/api/v2/endpoint/{encoded}")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["anomalies"]
    assert detail_payload["anomalies"][0]["baseline_label"]
    assert detail_payload["anomalies"][0]["why_flagged"]

    anomalies = client.get("/jin/api/v2/anomalies")
    assert anomalies.status_code == 200
    assert anomalies.json()["anomalies"]

    snoozed = client.post(
        "/jin/api/v2/anomaly/777/status",
        json={"action": "snoozed", "note": "review", "snooze_minutes": 15},
    )
    assert snoozed.status_code == 200
    assert update_calls[-1]["action"] == "snoozed"
    assert update_calls[-1]["until"] is not None

    bulk = client.post(
        "/jin/api/v2/anomalies/bulk",
        json={"anomaly_ids": [777], "action": "resolved", "note": "bulk close"},
    )
    assert bulk.status_code == 200
    assert bulk.json()["count"] == 1

    resolved = client.post("/jin/api/v2/resolve/777")
    assert resolved.status_code == 200
    assert middleware.runtime_state[endpoint_path]["anomalies"][0]["is_active"] is False

    promoted = client.post("/jin/api/v2/anomaly/777/promote")
    assert promoted.status_code == 200
    assert promoted.json()["status"] == "ok"

    def native_promote_error(_db_path, _anomaly_id):
        raise RuntimeError("native promote failed")

    monkeypatch.setattr(router_module, "promote_anomaly_to_baseline", native_promote_error, raising=False)
    promote_error = client.post("/jin/api/v2/anomaly/777/promote")
    assert promote_error.status_code == 500
    assert "native promote failed" in promote_error.json()["message"]

    monkeypatch.setattr(router_module, "promote_anomaly_to_baseline", None, raising=False)
    promote_unavailable = client.post("/jin/api/v2/anomaly/777/promote")
    assert promote_unavailable.status_code == 400

    monkeypatch.delattr(router_module, "promote_anomaly_to_baseline", raising=False)
    promote_missing_symbol = client.post("/jin/api/v2/anomaly/777/promote")
    assert promote_missing_symbol.status_code == 400


def test_router_project_status_and_baseline_native_paths(
    client,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    remote_db = tmp_path / "remote-native.duckdb"
    duckdb.connect(str(remote_db)).close()
    added = client.post(
        "/jin/api/projects",
        json={
            "name": "remote-native",
            "root": str(tmp_path / "remote-native-root"),
            "db_path": str(remote_db),
        },
    )
    assert added.status_code == 200
    project_id = added.json()["project"]["id"]

    def native_status(_db_path):
        return json.dumps(
            {
                "summary": {"total_endpoints": 1, "healthy": 1, "anomalies": 0, "unconfirmed": 0},
                "endpoints": [{"endpoint_path": "/api/sales/{retailer}/{period}", "status": "healthy"}],
            }
        )

    monkeypatch.setattr(router_module, "get_status", native_status)

    project_status = client.get("/jin/api/v2/status", params={"project_id": project_id})
    assert project_status.status_code == 200
    assert project_status.json()["summary"]["total_endpoints"] == 1

    def failing_native_status(_db_path):
        raise RuntimeError("status read failed")

    monkeypatch.setattr(router_module, "get_status", failing_native_status)
    fallback_status = client.get("/jin/api/v2/status", params={"project_id": project_id})
    assert fallback_status.status_code == 200
    assert "summary" in fallback_status.json()

    def native_promote_baseline(_db_path, endpoint_path):
        if endpoint_path == "/api/sales/{retailer}/{period}":
            return json.dumps({"ok": True, "promoted": 1})
        raise RuntimeError("promotion failed")

    monkeypatch.setattr(router_module, "promote_baseline", native_promote_baseline)
    promoted = client.post(
        f"/jin/api/v2/projects/{project_id}/baseline/refresh",
        json={"endpoints": ["/api/sales/{retailer}/{period}", "/broken"]},
    )
    assert promoted.status_code == 200
    payload = promoted.json()
    assert payload["requested"] == 2
    assert payload["promoted"] == 1
    assert any(item["ok"] is False for item in payload["results"])

    middleware = client.app.middleware_stack.app

    def exploding_resolve_project(_project_id):
        raise RuntimeError("resolve project failed")

    monkeypatch.setattr(middleware, "resolve_project", exploding_resolve_project)
    generic_fallback = client.get("/jin/api/v2/status", params={"project_id": "broken"})
    assert generic_fallback.status_code == 200
    assert "summary" in generic_fallback.json()


def test_router_license_activation_branches(client, monkeypatch: pytest.MonkeyPatch) -> None:
    middleware = client.app.middleware_stack.app

    missing_key = client.post("/jin/api/v2/license/activate", json={})
    assert missing_key.status_code == 400

    monkeypatch.setattr(
        middleware.license_client,
        "activate",
        lambda _key, _site_id: {"success": False, "error": "bad key"},
    )
    failed = client.post("/jin/api/v2/license/activate", json={"key": "bad-license"})
    assert failed.status_code == 400
    assert failed.json()["detail"] == "bad key"

    monkeypatch.setattr(
        middleware.license_client,
        "activate",
        lambda _key, _site_id: {"success": True, "policy": {"tier": "business"}},
    )
    succeeded = client.post("/jin/api/v2/license/activate", json={"key": "BUS-ORG-123"})
    assert succeeded.status_code == 200
    assert succeeded.json()["success"] is True


def test_middleware_helper_paths_cover_invocation_and_matching(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "helpers.duckdb"))

    env_file = tmp_path / ".env"
    env_file.write_text("# existing\nJIN_USERNAME=old\n")
    written = middleware._upsert_env_file({"JIN_USERNAME": "new", "JIN_PASSWORD": "secret"}, env_file)
    assert written == str(env_file)
    content = env_file.read_text()
    assert "JIN_USERNAME=new" in content
    assert "JIN_PASSWORD=secret" in content

    def create_order(order_id: str, retailer: str | None = None, payload: dict | None = None):
        return {"order_id": order_id, "retailer": retailer, "payload": payload}

    record = EndpointRecord(
        method="POST",
        path="/api/orders/{order_id}",
        response_model=None,
        endpoint_callable=create_order,
        fields=[],
        dimension_fields=["order_id", "retailer"],
        kpi_fields=["amount"],
        metrics=[],
        watch_config={"default_params": {"body": {"source": "upload"}}},
    )
    row = {
        "dimensions": {
            "order_id": "A-100",
            "retailer": "amazon",
            "event.date": "2026-03-22",
            "campaign": "spring",
            "nested.value": "ignored",
            "api_version": "v2",
        }
    }
    invocation = middleware._prepare_reference_invocation(record, row)
    assert invocation["path_params"]["order_id"] == "A-100"
    assert invocation["query_params"]["retailer"] == "amazon"
    assert invocation["body"]["dates"] == ["2026-03-22"]
    assert invocation["body"]["campaign"] == "spring"
    assert "nested.value" not in invocation["query_params"]

    array_record = EndpointRecord(
        method="GET",
        path="/api/items",
        response_model=None,
        endpoint_callable=lambda: {},
        fields=[],
        dimension_fields=["retailer"],
        kpi_fields=["amount"],
        metrics=[],
        watch_config={},
        array_field_path="items.records",
    )
    items, prefixed = middleware._extract_array_items_for_result(
        array_record,
        {"items": {"records": [{"retailer": "amazon", "amount": 10}]}},
    )
    assert items and prefixed
    assert prefixed[0]["items.records[].amount"] == 10
    missing_items = middleware._extract_array_items_for_result(array_record, {"items": {"rows": []}})
    assert missing_items == (None, None)

    selected = middleware._select_array_result_for_row(
        [
            {"dimension_json": {"retailer": "target", "period": "YTD"}},
            {"dimension_json": {"retailer": "amazon", "period": "YTD"}},
        ],
        {"dimensions": {"retailer": "amazon", "period": "YTD"}},
    )
    assert selected and selected["dimension_json"]["retailer"] == "amazon"

    assert middleware._grain_key_from_dimensions("/api/items", {}) == "/api/items"
    assert middleware._grain_key_from_dimensions(
        "/api/items",
        {"api_version": "v2", "retailer": "amazon"},
    ) == "/api/items|retailer=amazon"

    assert middleware._coerce_number(None) is None
    assert middleware._coerce_number(True) is None
    assert middleware._coerce_number("12.5") == 12.5
    assert middleware._coerce_number("x") is None

    assert "matched the uploaded reference" in middleware._comparison_reason(
        "amount",
        100,
        100,
        "match",
        0.0,
        5.0,
    )
    assert "outside the allowed" in middleware._comparison_reason(
        "amount",
        130,
        100,
        "mismatch",
        30.0,
        10.0,
    )


@pytest.mark.asyncio
async def test_middleware_ingestion_worker_paths(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "ingest.duckdb"))
    middleware.async_ingest_enabled = True
    middleware.ingest_workers = 1
    middleware.ingest_queue_size = 2

    assert middleware._enqueue_ingestion_task({"dummy": True}) is False

    middleware._ingest_queue = asyncio.Queue(maxsize=1)
    middleware._ingest_queue.put_nowait({"dummy": "full"})
    assert middleware._enqueue_ingestion_task({"dummy": "overflow"}) is False
    middleware._ingest_queue = None

    processed: list[str] = []

    async def fake_process(_record, endpoint_path, *_args):
        if endpoint_path == "/fail":
            raise RuntimeError("worker boom")
        processed.append(endpoint_path)

    middleware._process_observation_payload_async = fake_process  # type: ignore[assignment]
    middleware._ensure_ingestion_workers()
    middleware._ensure_ingestion_workers()

    dummy_record = EndpointRecord(
        method="GET",
        path="/dummy",
        response_model=None,
        endpoint_callable=lambda: {},
        fields=[],
        dimension_fields=[],
        kpi_fields=[],
        metrics=[],
        watch_config={},
    )
    assert middleware._enqueue_ingestion_task(
        {
            "record": dummy_record,
            "endpoint_path": "/ok",
            "method": "GET",
            "request_json": "{}",
            "data": {},
            "config_json": "{}",
        }
    )
    assert middleware._enqueue_ingestion_task(
        {
            "record": dummy_record,
            "endpoint_path": "/fail",
            "method": "GET",
            "request_json": "{}",
            "data": {},
            "config_json": "{}",
        }
    )

    await asyncio.wait_for(middleware._ingest_queue.join(), timeout=2.0)  # type: ignore[union-attr]
    assert "/ok" in processed
    assert any(item["source"] == "middleware.ingest_worker" for item in middleware.recent_errors)

    for task in middleware._ingest_worker_tasks:
        task.cancel()
    await asyncio.gather(*middleware._ingest_worker_tasks, return_exceptions=True)
    middleware._ingest_worker_tasks.clear()


@pytest.mark.asyncio
async def test_run_upload_analysis_array_success_partial_and_failed(app, tmp_path: Path) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "analysis.duckdb"))

    async def list_items(retailer: str):
        return {"items": [{"retailer": retailer, "amount": 100.0}]}

    record = EndpointRecord(
        method="GET",
        path="/api/items",
        response_model=None,
        endpoint_callable=list_items,
        fields=[],
        dimension_fields=["retailer"],
        kpi_fields=["amount"],
        metrics=[],
        watch_config={},
        array_field_path="items",
    )
    middleware.endpoint_registry[record.path] = record
    middleware._build_endpoint_config = lambda _record: "{}"  # type: ignore[assignment]
    middleware._persist_upload_analysis = lambda *_args, **_kwargs: None  # type: ignore[assignment]
    middleware._mirror_python_state = lambda *_args, **_kwargs: None  # type: ignore[assignment]

    def native_process(_path, _method, _request_json, data_json, _config_json):
        rows = json.loads(data_json)
        output = []
        for row in rows:
            amount = float(row.get("items[].amount", 0))
            output.append(
                {
                    "dimension_json": {"retailer": row.get("items[].retailer")},
                    "kpi_json": {"amount": amount},
                    "expected_json": {"amount": 100.0},
                    "tolerance_pct": 10.0,
                    "anomalies": [],
                    "comparisons": [{"kpi_field": "amount", "actual": amount, "expected": 100.0, "delta": 0.0}],
                }
            )
        return output

    middleware._run_native_process_observations = native_process  # type: ignore[assignment]
    state = middleware._runtime_endpoint_state(record.path)
    state["upload_analysis_history"] = [{"old": idx} for idx in range(25)]

    success = await middleware.run_upload_analysis(
        record.path,
        [{"dimensions": {"retailer": "amazon"}, "expected": {"amount": 100.0}, "tolerance_pct": 10.0}],
    )
    assert success["status"] == "success"
    assert success["verdict"] == "matched"
    assert len(middleware.runtime_state[record.path]["upload_analysis_history"]) == 20

    async def invoke_with_failure(_record, invocation):
        retailer = str(invocation.get("query_params", {}).get("retailer", ""))
        if retailer == "fail":
            raise RuntimeError("invoke failed")
        return {"items": [{"retailer": retailer, "amount": 100.0}]}, "{}"

    middleware._invoke_endpoint_callable = invoke_with_failure  # type: ignore[assignment]

    partial = await middleware.run_upload_analysis(
        record.path,
        [
            {"dimensions": {"retailer": "amazon"}, "expected": {"amount": 100.0}, "tolerance_pct": 10.0},
            {"dimensions": {"retailer": "fail"}, "expected": {"amount": 100.0}, "tolerance_pct": 10.0},
        ],
    )
    assert partial["status"] == "partial"
    assert partial["failed_runs"] == 1
    assert partial["errors"]

    failed = await middleware.run_upload_analysis(
        record.path,
        [{"dimensions": {"retailer": "fail"}, "expected": {"amount": 100.0}, "tolerance_pct": 10.0}],
    )
    assert failed["status"] == "failed"
    assert failed["verdict"] == "error"


def test_supporting_module_branches_for_config_templates_and_technical_metadata() -> None:
    class ItemModel(BaseModel):
        sku: str
        amount: float

    class ResponseModel(BaseModel):
        rows: list[ItemModel]

    _, dims, _kpis, array_path = classify_model(ResponseModel)
    assert array_path == "rows"
    assert "rows[].sku" in dims

    class WrapperModel(BaseModel):
        rows: list[ItemModel]

    class NestedResponseModel(BaseModel):
        payload: WrapperModel

    _, nested_dims, _nested_kpis, nested_array_path = classify_model(NestedResponseModel)
    assert nested_array_path == "payload.rows"
    assert "payload.rows[].sku" in nested_dims

    class IdModel(BaseModel):
        store_id: int

    _, id_dims, _, _ = classify_model(IdModel)
    assert "store_id" in id_dims

    converted = convert_po_rows_to_internal(
        [{"retailer": "amazon", "amount": "100", "tolerance_pct": "12"}],
        "/api/items",
        ["retailer"],
        ["amount"],
    )
    assert converted[0]["endpoint"] == "/api/items"
    assert converted[0]["grain_retailer"] == "amazon"
    assert converted[0]["expected_amount"] == "100"

    assert default_technical_metadata_value("api_version", "1.2.3") == "1.2.3"
    assert default_technical_metadata_value("label") == "current"
    assert default_technical_metadata_value("timestamp")
    assert default_technical_metadata_value("_jin_id")
    assert default_technical_metadata_value("unknown") == ""


def test_router_native_branches_for_reports_upload_checks_and_anomalies(
    client,
    encoded_sales_path: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    client.get("/api/sales/amazon/YTD?value=100")
    middleware = client.app.middleware_stack.app

    def native_config_show(_db_path, _endpoint_path):
        return json.dumps(
            {
                "http_method": "GET",
                "schema_contract": {
                    "fields": [{"name": "retailer"}, {"name": "period"}, {"name": "data.RSV"}],
                    "dimension_fields": ["retailer", "period"],
                    "kpi_fields": ["data.RSV"],
                },
                "config": {"dimension_fields": ["retailer", "period"], "kpi_fields": ["data.RSV"]},
            }
        )

    def native_references_export(_db_path, _endpoint_path):
        return json.dumps({"references": []})

    def native_get_detail(_db_path, _endpoint_path, _history_limit, _reference_limit):
        return json.dumps(
            {
                "endpoint": {
                    "http_method": "GET",
                    "fields": [{"name": "retailer"}, {"name": "period"}, {"name": "data.RSV"}],
                    "dimension_fields": ["retailer", "period"],
                    "kpi_fields": ["data.RSV"],
                },
                "schema_contract": {
                    "fields": [{"name": "retailer"}, {"name": "period"}, {"name": "data.RSV"}],
                    "dimension_fields": ["retailer", "period"],
                    "kpi_fields": ["data.RSV"],
                },
                "config": {"dimension_fields": ["retailer", "period"], "kpi_fields": ["data.RSV"]},
                "anomalies": [{"id": 900}],
                "current_kpis": [{"kpi_field": "data.RSV", "value": 100.0}],
            }
        )

    def native_validate(_field_names_json, _rows_json, _unused):
        return json.dumps(
            {
                "dimension_fields": ["retailer", "period"],
                "kpi_fields": ["data.RSV"],
                "normalized": [
                    {
                        "endpoint": endpoint_path,
                        "dimension_fields": ["retailer", "period"],
                        "kpi_fields": ["data.RSV"],
                        "tolerance_pct": 10.0,
                        "dimensions": {"retailer": "amazon", "period": "YTD"},
                        "expected": {"data.RSV": 100.0},
                    }
                ],
                "warnings": ["native validation used"],
            }
        )

    def native_import(_db_path, _endpoint_path, _dims_json, _kpis_json, _rows_json, _source):
        return json.dumps({"ok": True, "rows": 1, "imported": 1})

    def native_issues_list(_db_path, _endpoint_path=None, _status=None):
        return json.dumps(
            [
                {
                    "id": 1,
                    "endpoint_path": endpoint_path,
                    "kpi_field": "data.RSV",
                    "actual_value": 110.0,
                    "expected_value": 100.0,
                    "pct_change": 10.0,
                    "detection_method": "reconciliation",
                    "status": "active",
                }
            ]
        )

    monkeypatch.setattr(router_module, "config_show", native_config_show)
    monkeypatch.setattr(router_module, "references_export", native_references_export)
    monkeypatch.setattr(router_module, "get_endpoint_detail", native_get_detail)
    monkeypatch.setattr(router_module, "validate_reference_rows", native_validate)
    monkeypatch.setattr(router_module, "import_reference_rows", native_import)
    monkeypatch.setattr(router_module, "issues_list", native_issues_list)

    async def fake_analysis(_endpoint_path: str, _rows: list[dict[str, object]]):
        return {"status": "skipped", "requested_grains": len(_rows)}

    monkeypatch.setattr(middleware, "run_upload_analysis", fake_analysis)
    _configure_v2_sales_setup(client, encoded_sales_path)

    summary = client.get("/jin/api/v2/reports/summary")
    assert summary.status_code == 200
    assert "active_anomalies" in summary.json()

    endpoint_report = client.get(f"/jin/api/v2/reports/endpoint/{encoded_sales_path}")
    assert endpoint_report.status_code == 200
    assert endpoint_report.json()["anomaly_count"] >= 0

    def native_get_detail_error(_db_path, _endpoint_path, _history_limit, _reference_limit):
        raise RuntimeError("native detail error")

    monkeypatch.setattr(router_module, "get_endpoint_detail", native_get_detail_error)
    endpoint_report_fallback = client.get(f"/jin/api/v2/reports/endpoint/{encoded_sales_path}")
    assert endpoint_report_fallback.status_code == 200

    preview = client.post(
        f"/jin/api/v2/upload-preview/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV",amazon,YTD,100,10\n',
                "text/csv",
            )
        },
    )
    assert preview.status_code == 200
    assert preview.json()["rows_found"] == 1

    upload = client.post(
        f"/jin/api/v2/upload/{encoded_sales_path}",
        files={
            "file": (
                "reference.csv",
                b'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_data.RSV,tolerance_pct\n"/api/sales/{retailer}/{period}","retailer,period","data.RSV",amazon,YTD,100,10\n',
                "text/csv",
            )
        },
    )
    assert upload.status_code == 200
    assert upload.json()["imported"] == 1

    async def run_now_false(_job_id: str) -> bool:
        return False

    monkeypatch.setattr(middleware.scheduler, "run_now", run_now_false)
    unknown_check = client.post("/jin/api/v2/check/api%2Fmissing")
    assert unknown_check.status_code == 404

    known_check = client.post(f"/jin/api/v2/check/{encoded_sales_path}")
    assert known_check.status_code == 400

    middleware._runtime_endpoint_state(endpoint_path)["anomalies"] = [{"id": 901, "is_active": True}]

    def native_issues_update(_db_path, anomaly_id, action, _note, _owner, _reason, _until):
        return json.dumps({"ok": True, "id": int(anomaly_id), "status": action})

    monkeypatch.setattr(router_module, "issues_update", native_issues_update)
    resolved = client.post("/jin/api/v2/anomaly/901/status", json={"action": "resolved"})
    assert resolved.status_code == 200
    assert middleware.runtime_state[endpoint_path]["anomalies"][0]["is_active"] is False

    def native_active_anomalies(_db_path):
        return json.dumps(
            {
                "anomalies": [
                    {"id": 10, "status": "resolved", "incident_status": "resolved"},
                    {
                        "id": 11,
                        "status": "active",
                        "incident_status": "active",
                        "kpi_field": "data.RSV",
                        "actual_value": 111.0,
                        "expected_value": 100.0,
                        "pct_change": 11.0,
                        "detection_method": "reconciliation",
                    },
                ]
            }
        )

    monkeypatch.setattr(router_module, "issues_list", None)
    monkeypatch.setattr(router_module, "duckdb", None)
    monkeypatch.setattr(router_module, "get_active_anomalies", native_active_anomalies)
    anomalies = client.get("/jin/api/v2/anomalies")
    assert anomalies.status_code == 200
    assert anomalies.json()["anomalies"]
    assert all(item["id"] != 10 for item in anomalies.json()["anomalies"])


def test_middleware_catalog_and_connection_edge_paths(app, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    middleware = JinMiddleware(app, db_path=str(tmp_path / "middleware-edges.duckdb"))

    class BrokenPath:
        class Parent:
            @staticmethod
            def mkdir(*_args, **_kwargs):
                raise OSError("read-only")

        parent = Parent()

        @staticmethod
        def write_text(*_args, **_kwargs):
            raise OSError("read-only")

    middleware._save_license_projects_registry(BrokenPath(), ["project-a"])

    class BrokenActivePath:
        class Parent:
            @staticmethod
            def mkdir(*_args, **_kwargs):
                raise OSError("read-only")

        parent = Parent()

        @staticmethod
        def write_text(*_args, **_kwargs):
            raise OSError("read-only")

        @staticmethod
        def exists():
            return True

        @staticmethod
        def unlink():
            raise OSError("read-only")

    monkeypatch.setattr(middleware, "_active_project_path", lambda: BrokenActivePath())
    middleware._save_active_project_id("project-x")
    middleware._save_active_project_id(None)

    with pytest.raises(ValueError, match="project not found"):
        middleware.resolve_project("does-not-exist")

    current_id = middleware._project_catalog_id(middleware.project_name, middleware.project_root, middleware.db_path)
    calls = iter([[], []])
    monkeypatch.setattr(middleware, "_load_projects_catalog", lambda: next(calls))
    monkeypatch.setattr(middleware, "add_project_to_catalog", lambda *args, **kwargs: {"ok": True})
    with pytest.raises(ValueError, match="project not found"):
        middleware.set_project_monitor_policy(current_id, {})

    monkeypatch.setattr(
        middleware_module,
        "init_db",
        lambda _db_path: (_ for _ in ()).throw(RuntimeError("Assertion failed dict_offset")),
    )
    middleware._initialized = False
    middleware._init_db_if_needed()
    assert middleware._initialized is False

    closed = {"value": False}

    class BrokenConnection:
        @staticmethod
        def execute(*_args, **_kwargs):
            raise RuntimeError("stale")

        @staticmethod
        def close():
            closed["value"] = True

    middleware._test_conn = BrokenConnection()
    _conn, _lock = middleware._get_connection()
    assert closed["value"] is True

    cleared = middleware.clear_session_cookie_settings(None)
    assert cleared["max_age"] == 0


def test_uploader_and_license_edge_branches(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    # Direct and alias header matching in PO-format uploads.
    po_rows = [{"Retailer": "amazon", "Sales": "120", "tolerance_pct": "9"}]
    dims, kpis, normalized, _warnings = validate_upload_rows(
        po_rows,
        {"retailer", "data.amount"},
        endpoint="/api/sales/{retailer}/{period}",
        dimension_fields=["retailer"],
        kpi_fields=["data.amount"],
    )
    assert dims == ["retailer"]
    assert kpis == ["data.amount"]
    assert normalized[0]["expected"]["data.amount"] == 120.0

    internal_rows = [{"endpoint": "/api/sales", "dimension_fields": "retailer", "kpi_fields": "data.RSV"}]
    with pytest.raises(ValueError, match="Missing required columns"):
        validate_upload_rows(internal_rows, {"retailer", "data.RSV"})

    mismatch_rows = [
        {
            "endpoint": "/api/sales",
            "dimension_fields": "retailer",
            "kpi_fields": "data.RSV",
            "grain_retailer": "amazon",
            "expected_data.RSV": "100",
            "tolerance_pct": "10",
        }
    ]
    with pytest.raises(ValueError, match="Upload columns do not match template"):
        validate_upload_rows(
            mismatch_rows,
            {"retailer", "data.RSV"},
            expected_fields=["endpoint", "dimension_fields", "kpi_fields", "grain_retailer", "expected_data.RSV", "missing_col"],
        )

    assert _technical_default_for_field("api_version", {"api_version": "v4"}) == "v4"
    assert _technical_default_for_field("meta.api_version", {"api_version": "v5"}) == "v5"

    from jin.core.license import BaseLicenseProvider, LicenseClient

    class DelegatingProvider(BaseLicenseProvider):
        def verify_license(self, key: str, site_id: str):
            return super().verify_license(key, site_id)

    assert DelegatingProvider().verify_license("k", "site") is None

    usage_file = tmp_path / "usage.json"
    usage_file.write_text("{bad json")
    client = LicenseClient(storage_path=str(tmp_path / "license.json"), usage_path=str(usage_file))
    assert client.get_current_usage() == 0

    monkeypatch.setattr("builtins.open", lambda *args, **kwargs: (_ for _ in ()).throw(OSError("disk error")))
    client._save_local_license({"tier": "business"}, "tok")
    assert client.is_pro() is False


def test_router_status_merge_registry_and_project_error_branches(
    client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client.get("/api/sales/amazon/YTD?value=100")

    def native_status(_db_path):
        return json.dumps({"summary": {"total_endpoints": 1}, "endpoints": []})

    def native_merge(native_payload, registry_payload, _threshold):
        parsed = json.loads(native_payload)
        parsed["endpoints"] = json.loads(registry_payload)
        parsed["summary"] = {"total_endpoints": len(parsed["endpoints"]), "healthy": 1, "anomalies": 0, "unconfirmed": 0}
        return json.dumps(parsed)

    monkeypatch.setattr(router_module, "get_status", native_status)
    monkeypatch.setattr(router_module, "merge_status_with_registry", native_merge)

    merged = client.get("/jin/api/v2/status")
    assert merged.status_code == 200
    assert merged.json()["summary"]["total_endpoints"] >= 1
    assert any(item["endpoint_path"] == "/api/sales/{retailer}/{period}" for item in merged.json()["endpoints"])

    missing_project = client.post("/jin/api/v2/projects/activate", json={})
    assert missing_project.status_code == 400

    unknown_project = client.post("/jin/api/v2/projects/activate", json={"project_id": "missing"})
    assert unknown_project.status_code == 404

    apply_missing = client.post(
        "/jin/api/v2/projects/missing/check-plan/apply",
        content="not-json",
        headers={"content-type": "text/plain"},
    )
    assert apply_missing.status_code == 404

    bootstrap_missing = client.post(
        "/jin/api/v2/projects/missing/check-plan/bootstrap",
        content="not-json",
        headers={"content-type": "text/plain"},
    )
    assert bootstrap_missing.status_code == 404

    run_missing = client.post(
        "/jin/api/v2/projects/missing/checks/run",
        content="not-json",
        headers={"content-type": "text/plain"},
    )
    assert run_missing.status_code == 404


def test_router_metadata_native_first_and_manual_check_paths(
    client,
    encoded_sales_path: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    client.get("/api/sales/amazon/YTD?value=100")
    middleware = client.app.middleware_stack.app

    def native_detail_for_metadata(_db_path, _endpoint_path, _history_limit, _reference_limit):
        return json.dumps(
            {
                "endpoint": {
                    "fields": [{"name": "retailer"}, {"name": "period"}, {"name": "data.RSV"}],
                    "dimension_fields": ["retailer", "period"],
                    "kpi_fields": ["data.RSV"],
                },
                "schema_contract": {
                    "fields": [{"name": "retailer"}, {"name": "period"}, {"name": "data.RSV"}],
                    "dimension_fields": ["retailer", "period"],
                    "kpi_fields": ["data.RSV"],
                },
                "config": {"dimension_fields": ["retailer", "period"], "kpi_fields": ["data.RSV"]},
            }
        )

    monkeypatch.setattr(router_module, "get_endpoint_detail", native_detail_for_metadata)
    template_csv = client.get(f"/jin/template/{encoded_sales_path}.csv")
    assert template_csv.status_code == 200

    monkeypatch.setattr(router_module, "get_endpoint_detail", None)

    def raising_operational_metadata(_db_path, _endpoint_path):
        raise RuntimeError("native operational metadata failed")

    monkeypatch.setattr(router_module, "endpoint_operational_metadata", raising_operational_metadata)
    detail = client.get(f"/jin/api/v2/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    assert detail.json()["endpoint_path"] == endpoint_path

    async def run_now_false(_job_id: str) -> bool:
        return False

    monkeypatch.setattr(middleware.scheduler, "run_now", run_now_false)
    check_missing = client.post("/jin/api/v2/check/api%2Fdoes-not-exist")
    assert check_missing.status_code == 404

    _configure_v2_sales_setup(client, encoded_sales_path)
    check_existing = client.post(f"/jin/api/v2/check/{encoded_sales_path}")
    assert check_existing.status_code == 400


def test_manual_check_direct_fallback_persists_run_history(
    client,
    encoded_sales_path: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    endpoint_path = "/api/sales/{retailer}/{period}"
    client.get("/api/sales/amazon/YTD?value=100")
    middleware = client.app.middleware_stack.app
    record = middleware.endpoint_registry[endpoint_path]
    record.watch_config = {
        "default_params": {
            "path_params": {"retailer": "amazon", "period": "YTD"},
            "query_params": {"value": 123.0},
            "headers": {},
            "body": {},
        }
    }

    async def run_now_false(_job_id: str) -> bool:
        return False

    monkeypatch.setattr(middleware.scheduler, "run_now", run_now_false)

    _configure_v2_sales_setup(client, encoded_sales_path)
    started = client.post(f"/jin/api/v2/check/{encoded_sales_path}")
    assert started.status_code == 200
    payload = started.json()
    assert payload["method"] == "direct"
    assert payload["run_id"]
    assert payload["status"] == "success"

    runs = client.get(f"/jin/api/v2/check-runs/{encoded_sales_path}")
    assert runs.status_code == 200
    run_rows = runs.json()["runs"]
    assert run_rows
    assert run_rows[0]["run_id"] == payload["run_id"]
    assert run_rows[0]["trigger"] == "manual"
    assert run_rows[0]["status"] == "success"
    assert run_rows[0]["grains_processed"] >= 1

    detail = client.get(f"/jin/api/v2/endpoint/{encoded_sales_path}")
    assert detail.status_code == 200
    assert isinstance(detail.json()["monitoring_runs"], list)


def test_metrics_override_decorator_is_returned() -> None:
    decorator = override_metrics([])
    assert callable(decorator)
