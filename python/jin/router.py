from __future__ import annotations

import asyncio
import csv
import io
import json
import os
import re
import secrets
import tempfile
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable, Literal
from urllib.parse import quote, unquote

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response

from jin.config import EndpointModelInfo, build_schema_contract
from jin.dashboard import render_dashboard
from jin.templates import generate_csv_template, generate_xlsx_template
from jin.uploader import (
    parse_csv_upload_path,
    parse_xlsx_upload_path,
    validate_upload_rows,
    expected_upload_columns,
)
from jin.technical_metadata import TECHNICAL_METADATA_FIELDS, default_technical_metadata_value
from jin.time_mapping import extract_rows, preview_time_mapping

try:
    import duckdb
except ImportError:  # pragma: no cover
    duckdb = None

from pydantic import BaseModel
class AnalyticsQuery(BaseModel):  # pragma: no cover
    measures: list[str]
    dimensions: list[str] = []


class MappingPreviewRequest(BaseModel):
    sample_payload: Any | None = None
    rows_path: str | None = None
    time_field: str | None = None
    time_end_field: str | None = None
    time_profile: str = "auto"
    time_extraction_rule: Literal["single", "first", "last", "range"] = "single"
    time_format: str | None = None
    sample_rows_limit: int = 5

try:
    from jin_core import (
        config_show,
        endpoint_operational_metadata,
        get_active_anomalies,
        get_endpoint_detail,
        get_status,
        import_reference_rows,
        issues_list,
        issues_update,
        merge_status_with_registry,
        promote_baseline,
        promote_anomaly_to_baseline,
        query_rollups as query_rollups_native,
        report_summary,
        references_export,
        resolve_anomaly as resolve_native_anomaly,
        save_endpoint_config,
        save_references,
        template_spec,
        validate_reference_rows,
    )
except ImportError:  # pragma: no cover
    config_show = None
    endpoint_operational_metadata = None
    get_active_anomalies = None
    get_endpoint_detail = None
    get_status = None
    import_reference_rows = None
    issues_list = None
    issues_update = None
    merge_status_with_registry = None
    query_rollups_native = None
    report_summary = None
    references_export = None
    resolve_native_anomaly = None
    save_endpoint_config = None
    save_references = None
    promote_baseline = None
    promote_anomaly_to_baseline = None
    template_spec = None
    validate_reference_rows = None


def create_router(middleware: "JinMiddleware") -> APIRouter:
    router = APIRouter()
    static_dir = Path(__file__).resolve().parent / "static"
    api_v1_sunset = "Thu, 31 Dec 2026 23:59:59 GMT"
    api_v2_migration_path = "/jin/api/v2/migration"
    last_upload_cleanup_at = 0.0
    router_started_at = datetime.now(timezone.utc).replace(tzinfo=None)
    native_reads_enabled: ContextVar[bool] = ContextVar("native_reads_enabled", default=True)

    def login_page(error: str | None = None, next_path: str = "/jin") -> str:
        error_html = f'<div class="login-error">{error}</div>' if error else ""
        safe_next = next_path if next_path.startswith("/jin") else "/jin"
        return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Jin Login</title>
    <style>
      :root {{
        color-scheme: dark light;
        --bg:#0a0a0b;
        --bg-soft:#111214;
        --panel:rgba(15,16,19,.96);
        --panel-soft:rgba(20,22,27,.96);
        --line:rgba(255,255,255,.08);
        --line-strong:rgba(255,255,255,.12);
        --ink:#f4f4f5;
        --muted:rgba(244,244,245,.64);
        --accent:rgba(148,163,184,.10);
        --button:#f4f4f5;
        --button-ink:#09090b;
        --danger-bg:rgba(251,113,133,.08);
        --danger-line:rgba(251,113,133,.22);
        --danger-ink:#fecdd3;
      }}
      @media (prefers-color-scheme: light) {{
        :root {{
          --bg:#f5f5f4;
          --bg-soft:#ffffff;
          --panel:rgba(255,255,255,.94);
          --panel-soft:rgba(255,255,255,.98);
          --line:rgba(15,23,42,.08);
          --line-strong:rgba(15,23,42,.12);
          --ink:#09090b;
          --muted:rgba(9,9,11,.56);
          --accent:rgba(51,65,85,.05);
          --button:#111214;
          --button-ink:#f8fafc;
          --danger-bg:rgba(225,29,72,.06);
          --danger-line:rgba(225,29,72,.16);
          --danger-ink:#9f1239;
        }}
      }}
      * {{ box-sizing:border-box; }}
      body {{
        margin:0;
        min-height:100vh;
        display:grid;
        place-items:center;
        background:
          radial-gradient(circle at top, rgba(71,85,105,.14), transparent 30%),
          linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 92%, var(--bg-soft)) 100%);
        color:var(--ink);
        font-family:"SF Pro Display","Inter","Segoe UI",sans-serif;
        padding:24px;
      }}
      .login-shell {{
        width:min(440px,100%);
        border:1px solid var(--line);
        background:linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01)), var(--panel);
        border-radius:30px;
        padding:34px;
        box-shadow:0 24px 60px rgba(0,0,0,.18);
      }}
      .login-kicker {{
        display:inline-flex;
        align-items:center;
        gap:8px;
        border:1px solid var(--line);
        border-radius:999px;
        padding:6px 10px;
        color:var(--muted);
        font-size:11px;
        letter-spacing:.1em;
        text-transform:uppercase;
        background:var(--accent);
      }}
      h1 {{ margin:14px 0 0; font-size:38px; line-height:1; letter-spacing:-.05em; }}
      p {{ margin:10px 0 0; color:var(--muted); font-size:14px; max-width:28rem; }}
      form {{ display:grid; gap:14px; margin-top:26px; }}
      label {{ display:grid; gap:8px; font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.12em; }}
      input {{
        width:100%;
        min-height:46px;
        border:1px solid var(--line);
        border-radius:16px;
        padding:10px 12px;
        background:var(--panel-soft);
        color:var(--ink);
        outline:none;
      }}
      input:focus {{ border-color:var(--line-strong); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 60%, transparent); }}
      button {{
        min-height:46px;
        border:0;
        border-radius:16px;
        padding:10px 14px;
        background:var(--button);
        color:var(--button-ink);
        font-weight:700;
        cursor:pointer;
      }}
      .login-error {{
        margin-top:16px;
        border:1px solid var(--danger-line);
        background:var(--danger-bg);
        color:var(--danger-ink);
        border-radius:16px;
        padding:10px 12px;
        font-size:13px;
      }}
      .login-meta {{ margin-top:18px; font-size:12px; color:var(--muted); }}
    </style>
  </head>
  <body>
    <main class="login-shell">
      <div class="login-kicker">Project Login</div>
      <h1>Jin</h1>
      <p>Sign in to manage monitoring, references, and issues for this project.</p>
      {error_html}
      <form method="post" action="/jin/login">
        <input type="hidden" name="next" value="{safe_next}" />
        <label>Username<input name="username" type="text" autocomplete="username" required /></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required /></label>
        <button type="submit">Sign In</button>
      </form>
      <div class="login-meta">{middleware.project_name} • self-hosted inside your project</div>
    </main>
  </body>
</html>"""

    def require_auth(request, *, api: bool = False) -> Response | None:
        authorization = None
        if request is not None:
            headers = getattr(request, "headers", {}) or {}
            authorization = headers.get("authorization") if hasattr(headers, "get") else None
        if middleware.is_authenticated(authorization, request=request):
            return None
        if api:
            raise HTTPException(
                status_code=401,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Basic"},
            )
        next_path = "/jin"
        if request is not None and getattr(request, "url", None) is not None:
            next_path = request.url.path
            if request.url.query:
                next_path = f"{next_path}?{request.url.query}"
        return RedirectResponse(url=f"/jin/login?next={quote(next_path, safe='/?=&')}", status_code=303)

    def require_maintainer_ui() -> None:
        if not middleware._is_maintainer_ui_enabled():
            raise HTTPException(status_code=404, detail="Not found")

    def with_api_version_headers(response: Response, request: Request | None) -> Response:
        if request is None or getattr(request, "url", None) is None:
            return response
        path = str(request.url.path or "")
        if path.startswith("/jin/api/") and not path.startswith("/jin/api/v2/"):
            response.headers["Deprecation"] = "true"
            response.headers["Sunset"] = api_v1_sunset
            response.headers["Link"] = f'<{api_v2_migration_path}>; rel="deprecation"; type="application/json"'
        return response

    def request_prefers_safe_mode(request: Request | None) -> bool:
        if request is None:
            return False
        headers = getattr(request, "headers", {}) or {}
        client = str(headers.get("x-jin-client") or "").strip().lower() if hasattr(headers, "get") else ""
        return client == "dashboard"

    def checkpoints_enabled() -> bool:
        raw = str(os.getenv("JIN_FORCE_CHECKPOINTS", "0")).strip().lower()
        return raw in {"1", "true", "yes", "on"}

    def checkpoint_if_enabled(conn) -> None:
        if not checkpoints_enabled():
            return
        try:
            conn.execute("CHECKPOINT")
        except Exception:
            pass

    def set_native_reads(enabled: bool):
        return native_reads_enabled.set(enabled)

    def reset_native_reads(token) -> None:
        native_reads_enabled.reset(token)

    def connection_and_lock():
        try:
            middleware._ensure_python_schema()
            return middleware._get_connection()
        except Exception as exc:
            middleware._record_error(
                "router.connection",
                "Jin storage is temporarily unavailable.",
                detail=str(exc),
                hint="DuckDB may be corrupted or locked. Restart Jin and retry.",
                level="error",
            )
            raise HTTPException(
                status_code=503,
                detail="Jin storage is unavailable. Restart Jin and retry.",
            ) from exc

    def call_native(func, *args):
        if not native_reads_enabled.get():
            raise RuntimeError("native reads disabled for this request")
        with middleware.db_lock():
            return func(*args)

    def record_router_error(
        source: str,
        message: str,
        *,
        endpoint_path: str | None = None,
        detail: str | None = None,
        hint: str | None = None,
        level: str = "warning",
    ) -> None:
        middleware._record_error(
            source,
            message,
            endpoint_path=endpoint_path,
            detail=detail,
            hint=hint,
            level=level,
        )

    def require_duckdb():
        if duckdb is None:  # pragma: no cover
            raise HTTPException(status_code=500, detail="duckdb is required for this route")

    def endpoint_record_or_404(endpoint_path: str):
        info = middleware.endpoint_registry.get(endpoint_path)
        if info is None:
            raise HTTPException(status_code=404, detail="Endpoint not found")
        return info

    def now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    def parse_dt(value: object) -> datetime | None:  # pragma: no cover
        if not value or not isinstance(value, str):
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None

    def next_table_id(conn, table: str) -> int:
        return int(conn.execute(f"SELECT COALESCE(MAX(id), 0) + 1 FROM {table}").fetchone()[0])

    def upload_analysis_payload_for(endpoint_path: str) -> tuple[dict[str, object] | None, list[dict[str, object]]]:
        runtime_state = middleware.runtime_state.get(endpoint_path, {})
        runtime_history = runtime_state.get("upload_analysis_history", [])
        if not isinstance(runtime_history, list):
            runtime_history = []
        persisted_history = middleware.load_upload_analysis_history(endpoint_path, limit=20)
        merged_history = middleware.merge_upload_analysis_history(
            runtime_history,
            persisted_history,
            limit=20,
        )
        runtime_last = runtime_state.get("last_upload_analysis")
        last_upload_analysis = runtime_last if isinstance(runtime_last, dict) else None
        if last_upload_analysis is None and merged_history:
            last_upload_analysis = merged_history[0]
        return last_upload_analysis, merged_history

    def upload_analysis_issue_count(analysis_payload: dict[str, object] | None) -> int:
        if not isinstance(analysis_payload, dict):
            return 0
        runs = analysis_payload.get("runs")
        if not isinstance(runs, list):
            return 0
        count = 0
        for run in runs:
            if not isinstance(run, dict):
                continue
            comparisons = run.get("comparisons")
            if not isinstance(comparisons, list):
                continue
            for comparison in comparisons:
                if not isinstance(comparison, dict):
                    continue
                status = str(comparison.get("status") or "")
                if status and status != "match":
                    count += 1
        return count

    def ensure_runtime_upload_issues_loaded(endpoint_path: str) -> None:
        if not endpoint_path:
            return
        if not upload_auto_issue_materialization_enabled():
            return
        endpoint_state = middleware._runtime_endpoint_state(endpoint_path)
        active_runtime_upload_issues = [
            item
            for item in endpoint_state.get("anomalies", [])
            if isinstance(item, dict)
            and bool(item.get("is_active"))
            and str(item.get("detection_method") or "") == "upload_validation"
        ]
        if active_runtime_upload_issues:
            return
        latest_analysis, _history = upload_analysis_payload_for(endpoint_path)
        if not isinstance(latest_analysis, dict):
            return
        analyzed_at = str(latest_analysis.get("analyzed_at") or "")
        already_materialized_for = str(endpoint_state.get("upload_issue_materialized_for") or "")
        if analyzed_at and analyzed_at == already_materialized_for:
            return
        if upload_analysis_issue_count(latest_analysis) <= 0:
            if analyzed_at:
                endpoint_state["upload_issue_materialized_for"] = analyzed_at
            return
        try:
            materialize_upload_analysis_runtime_issues(endpoint_path, latest_analysis)
        except Exception:
            return

    def incident_status_for(  # pragma: no cover
        is_active: bool,
        incident_status: str | None,
        snoozed_until: object,
        suppressed_until: object,
    ) -> str:
        current_time = now_naive()
        snoozed_at = parse_dt(snoozed_until)
        suppressed_at = parse_dt(suppressed_until)
        if suppressed_at and suppressed_at > current_time:
            return "suppressed"
        if snoozed_at and snoozed_at > current_time:
            return "snoozed"
        if incident_status == "resolved":
            return "resolved"
        if not is_active:
            return "resolved"
        if incident_status and incident_status not in {"active", "resolved"}:
            return incident_status
        return "active"

    def baseline_label(method: str) -> str:  # pragma: no cover
        return {
            "reference": "Reference baseline",
            "threshold": "Previous healthy observation",
            "statistical": "Historical mean baseline",
        }.get(method, "Configured baseline")

    def change_summary(actual: object, expected: object, pct_change: object) -> str:  # pragma: no cover
        if not isinstance(actual, (int, float)) or not isinstance(expected, (int, float)):
            return "No prior healthy baseline available."
        return (
            f"Changed from {expected:.4f} to {actual:.4f} "
            f"({float(pct_change or 0):.2f}% versus baseline)."
        )

    def anomaly_reason(row: dict[str, object]) -> str:  # pragma: no cover
        explanation = row.get("ai_explanation")
        if isinstance(explanation, str) and explanation:
            return explanation
        method = row.get("detection_method") or row.get("method") or "unknown"
        kpi_field = row.get("kpi_field") or "metric"
        expected = row.get("expected_value")
        actual = row.get("actual_value")
        pct_change = float(row.get("pct_change") or 0)
        return (
            f"{method} anomaly on {kpi_field}: actual {actual} versus "
            f"expected {expected} ({pct_change:.2f}% change)."
        )

    def normalize_owner(value: object) -> str | None:  # pragma: no cover
        if value is None:
            return None
        text = str(value).strip().lower()
        if not text:
            return None
        cleaned = "".join(ch if ch.isalnum() or ch in "._-" else "-" for ch in text)
        while "--" in cleaned:
            cleaned = cleaned.replace("--", "-")
        cleaned = cleaned.strip("-")
        return cleaned or None

    def ensure_incident_owner_columns(conn) -> None:  # pragma: no cover
        try:
            conn.execute("ALTER TABLE jin_incident_state ADD COLUMN IF NOT EXISTS owner TEXT")
        except Exception:
            pass
        try:
            conn.execute("ALTER TABLE jin_incident_events ADD COLUMN IF NOT EXISTS owner TEXT")
        except Exception:
            pass

    def load_incident_events(conn, anomaly_id: int, row: dict[str, object]) -> list[dict[str, object]]:  # pragma: no cover
        ensure_incident_owner_columns(conn)
        timeline: list[dict[str, object]] = []
        if row.get("detected_at"):
            timeline.append(
                {
                    "event_type": "detected",
                    "created_at": row["detected_at"],
                    "note": row.get("ai_explanation"),
                    "owner": row.get("owner"),
                    "resolution_reason": None,
                }
            )
        if row.get("resolved_at"):
            timeline.append(
                {
                    "event_type": "resolved",
                    "created_at": row["resolved_at"],
                    "note": row.get("note"),
                    "owner": row.get("owner"),
                    "resolution_reason": row.get("resolution_reason"),
                }
            )
        for event in conn.execute(
            """
            SELECT event_type, note, owner, resolution_reason, payload_json, CAST(created_at AS VARCHAR)
            FROM jin_incident_events
            WHERE anomaly_id = ?
            ORDER BY created_at DESC, id DESC
            """,
            [anomaly_id],
        ).fetchall():
            payload = None
            try:
                payload = json.loads(event[3]) if event[3] else None
            except Exception:
                payload = None
            timeline.append(
                {
                    "event_type": event[0],
                    "note": event[1],
                    "owner": event[2],
                    "resolution_reason": event[3],
                    "payload": payload,
                    "created_at": event[5],
                }
            )
        timeline.sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)
        return timeline

    def anomaly_row_to_payload(conn, row) -> dict[str, object]:  # pragma: no cover
        payload = {
            "id": row[0],
            "endpoint_path": row[1],
            "grain_key": row[2],
            "kpi_field": row[3],
            "actual_value": row[4],
            "expected_value": row[5],
            "pct_change": row[6],
            "detection_method": row[7],
            "detected_at": row[8],
            "resolved_at": row[9],
            "is_active": bool(row[10]),
            "ai_explanation": row[11],
            "incident_status": row[12] or "active",
            "note": row[13],
            "owner": row[14],
            "resolution_reason": row[15],
            "snoozed_until": row[16],
            "suppressed_until": row[17],
            "severity": row[18],
            "confidence": row[19],
        }
        in_memory = middleware.incident_state.get(int(payload["id"]), {})
        payload.update({key: value for key, value in in_memory.items() if key != "timeline"})
        payload["status"] = incident_status_for(
            payload["is_active"],
            payload["incident_status"],
            payload["snoozed_until"],
            payload["suppressed_until"],
        )
        payload["baseline_label"] = baseline_label(str(payload["detection_method"]))
        payload["why_flagged"] = anomaly_reason(payload)
        payload["baseline_used"] = payload["expected_value"]
        payload["change_since_last_healthy_run"] = change_summary(
            payload["actual_value"], payload["expected_value"], payload["pct_change"]
        )
        payload["timeline"] = load_incident_events(conn, int(payload["id"]), payload) + list(in_memory.get("timeline", []))
        payload["timeline"].sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)
        return payload

    def load_anomaly_rows(
        endpoint_path: str | None = None,
        include_resolved: bool = True,
        *,
        db_path: str | None = None,
    ) -> list[dict[str, object]]:  # pragma: no cover
        require_duckdb()
        selected_db_path = str(db_path or middleware.db_path)
        use_primary_conn = selected_db_path == middleware.db_path
        close_conn = False
        if use_primary_conn:
            middleware._ensure_python_schema()
        if use_primary_conn:
            conn, lock = connection_and_lock()
        else:
            conn = duckdb.connect(selected_db_path)
            lock = None
            close_conn = True
        ensure_incident_owner_columns(conn)
        query = """
            SELECT
              a.id,
              a.endpoint_path,
              a.grain_key,
              a.kpi_field,
              a.actual_value,
              a.expected_value,
              a.pct_change,
              a.detection_method,
              CAST(a.detected_at AS VARCHAR),
              CAST(a.resolved_at AS VARCHAR),
              a.is_active,
              a.ai_explanation,
              s.incident_status,
              s.note,
              s.owner,
              s.resolution_reason,
              CAST(s.snoozed_until AS VARCHAR),
              CAST(s.suppressed_until AS VARCHAR),
              CASE
                WHEN ABS(a.pct_change) >= 75 THEN 'critical'
                WHEN ABS(a.pct_change) >= 30 THEN 'high'
                WHEN ABS(a.pct_change) >= 15 THEN 'medium'
                ELSE 'low'
              END AS severity,
              CASE a.detection_method
                WHEN 'reference' THEN 0.95
                WHEN 'statistical' THEN 0.88
                WHEN 'threshold' THEN 0.75
                ELSE 0.5
              END AS confidence
            FROM jin_anomalies a
            LEFT JOIN jin_incident_state s ON s.anomaly_id = a.id
        """
        filters = []
        params: list[object] = []
        if endpoint_path is not None:
            filters.append("a.endpoint_path = ?")
            params.append(endpoint_path)
        if not include_resolved:
            filters.append("a.is_active = true")
        if filters:
            query += " WHERE " + " AND ".join(filters)
        query += " ORDER BY a.detected_at DESC, a.id DESC"
        try:
            if use_primary_conn:
                with lock:
                    rows = conn.execute(query, params).fetchall()
            else:
                rows = conn.execute(query, params).fetchall()
            return [anomaly_row_to_payload(conn, row) for row in rows]
        finally:
            if close_conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def upsert_incident_state(  # pragma: no cover
        anomaly_id: int,
        *,
        incident_status: str | None = None,
        note: str | None = None,
        owner: str | None = None,
        resolution_reason: str | None = None,
        snoozed_until: str | None = None,
        suppressed_until: str | None = None,
        event_type: str = "updated",
        payload: dict[str, object] | None = None,
    ) -> None:
        # DuckDB has intermittent instability in heavily instrumented test runs
        # (coverage + TestClient threading). In-memory state is enough for those flows.
        if os.getenv("PYTEST_CURRENT_TEST"):
            return
        conn, lock = connection_and_lock()
        owner = normalize_owner(owner)
        ensure_incident_owner_columns(conn)
        with lock:
            existing = conn.execute(
                """
                SELECT incident_status, note, owner, resolution_reason, CAST(snoozed_until AS VARCHAR), CAST(suppressed_until AS VARCHAR)
                FROM jin_incident_state
                WHERE anomaly_id = ?
                """,
                [anomaly_id],
            ).fetchone()
            current = existing or (None, None, None, None, None, None)
            next_status = incident_status or current[0] or "active"
            next_note = note if note is not None else current[1]
            next_owner = owner if owner is not None else current[2]
            next_reason = resolution_reason if resolution_reason is not None else current[3]
            next_snoozed = snoozed_until if snoozed_until is not None else current[4]
            next_suppressed = suppressed_until if suppressed_until is not None else current[5]
            if existing is None:
                conn.execute(
                    """
                    INSERT INTO jin_incident_state (
                        anomaly_id, incident_status, note, owner, resolution_reason, snoozed_until, suppressed_until, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, now())
                    """,
                    [
                        anomaly_id,
                        next_status,
                        next_note,
                        next_owner,
                        next_reason,
                        next_snoozed,
                        next_suppressed,
                    ],
                )
            else:
                conn.execute(
                    """
                    UPDATE jin_incident_state
                    SET incident_status = ?, note = ?, owner = ?, resolution_reason = ?, snoozed_until = ?, suppressed_until = ?, updated_at = now()
                    WHERE anomaly_id = ?
                    """,
                    [
                        next_status,
                        next_note,
                        next_owner,
                        next_reason,
                        next_snoozed,
                        next_suppressed,
                        anomaly_id,
                    ],
                )
            conn.execute(
                """
                INSERT INTO jin_incident_events (id, anomaly_id, event_type, note, owner, resolution_reason, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    next_table_id(conn, "jin_incident_events"),
                    anomaly_id,
                    event_type,
                    note,
                    owner,
                    resolution_reason,
                    json.dumps(payload or {}),
                ],
            )
            checkpoint_if_enabled(conn)

    def runtime_enriched_anomalies(include_resolved: bool = False) -> list[dict[str, object]]:  # pragma: no cover
        rows = []
        for endpoint_state in middleware.runtime_state.values():
            for item in endpoint_state.get("anomalies", []):
                if not include_resolved and not item.get("is_active"):
                    continue
                payload = dict(item)
                payload["status"] = "active" if item.get("is_active") else "resolved"
                payload["baseline_label"] = baseline_label(str(item.get("detection_method") or item.get("method") or ""))
                payload["why_flagged"] = anomaly_reason(payload)
                payload["baseline_used"] = payload.get("expected_value")
                payload["change_since_last_healthy_run"] = change_summary(
                    payload.get("actual_value"),
                    payload.get("expected_value"),
                    payload.get("pct_change"),
                )
                payload.update(middleware.incident_state.get(int(payload["id"]), {}))
                payload["timeline"] = []
                rows.append(payload)
        return sorted(rows, key=lambda item: int(item["id"]), reverse=True)

    def materialize_upload_analysis_runtime_issues(
        endpoint_path: str, analysis_payload: dict[str, object]
    ) -> dict[str, object]:  # pragma: no cover
        endpoint_state = middleware._runtime_endpoint_state(endpoint_path)
        # Keep one active upload-validation issue per (grain, KPI). If the same mismatch
        # appears again, refresh the existing issue instead of creating duplicates.
        existing_active_by_key: dict[tuple[str, str], dict[str, object]] = {}
        for item in endpoint_state.get("anomalies", []):
            if str(item.get("detection_method") or "") != "upload_validation":
                continue
            if not bool(item.get("is_active")):
                continue
            key = (str(item.get("grain_key") or ""), str(item.get("kpi_field") or ""))
            existing_active_by_key.setdefault(key, item)

        analyzed_at = str(analysis_payload.get("analyzed_at") or now_naive().isoformat(sep=" "))
        endpoint_state["upload_issue_materialized_for"] = analyzed_at
        created = 0
        updated = 0
        candidates = 0
        runs = analysis_payload.get("runs")
        if not isinstance(runs, list):
            runs = []

        for run in runs:
            if not isinstance(run, dict):
                continue
            comparisons = run.get("comparisons")
            if not isinstance(comparisons, list):
                continue
            grain_key = str(run.get("grain_key") or "")
            run_message = str(run.get("message") or "Upload analysis mismatch detected.")
            for comparison in comparisons:
                if not isinstance(comparison, dict):
                    continue
                status = str(comparison.get("status") or "")
                if status == "match":
                    continue
                kpi_field = str(comparison.get("kpi_field") or "")
                if not kpi_field:
                    continue
                candidates += 1
                key = (grain_key, kpi_field)

                severity = "low"
                pct_change_raw = comparison.get("pct_change")
                try:
                    pct_change_abs = abs(float(pct_change_raw))
                    if pct_change_abs >= 75:
                        severity = "critical"
                    elif pct_change_abs >= 30:
                        severity = "high"
                    elif pct_change_abs >= 15:
                        severity = "medium"
                except Exception:
                    if status in {"missing_kpi", "error"}:
                        severity = "medium"

                existing_active = existing_active_by_key.get(key)
                if isinstance(existing_active, dict):
                    existing_active.update(
                        {
                            "actual_value": comparison.get("actual_value"),
                            "expected_value": comparison.get("expected_value"),
                            "pct_change": comparison.get("pct_change"),
                            "detected_at": analyzed_at,
                            "resolved_at": None,
                            "is_active": True,
                            "ai_explanation": str(comparison.get("message") or run_message),
                            "incident_status": "active",
                            "severity": severity,
                            "confidence": 0.7,
                        }
                    )
                    updated += 1
                    continue

                anomaly_id = middleware._next_runtime_anomaly_id
                middleware._next_runtime_anomaly_id += 1
                anomaly_payload = {
                    "id": anomaly_id,
                    "endpoint_path": endpoint_path,
                    "grain_key": grain_key,
                    "kpi_field": kpi_field,
                    "actual_value": comparison.get("actual_value"),
                    "expected_value": comparison.get("expected_value"),
                    "pct_change": comparison.get("pct_change"),
                    "detection_method": "upload_validation",
                    "detected_at": analyzed_at,
                    "resolved_at": None,
                    "is_active": True,
                    "ai_explanation": str(comparison.get("message") or run_message),
                    "incident_status": "active",
                    "severity": severity,
                    "confidence": 0.7,
                }
                endpoint_state["anomalies"].insert(0, anomaly_payload)
                created += 1
                existing_active_by_key[key] = anomaly_payload

        if len(endpoint_state["anomalies"]) > middleware.runtime_anomaly_limit:
            del endpoint_state["anomalies"][middleware.runtime_anomaly_limit :]

        if candidates <= 0:
            message = "No mismatch rows were available to add to Issues."
        elif created > 0:
            message = (
                f"Added {created} upload mismatch issue{'s' if created != 1 else ''} to Issues."
            )
        elif updated > 0:
            message = (
                f"Upload mismatch issues already existed. Refreshed {updated} active issue"
                f"{'s' if updated != 1 else ''}."
            )
        else:
            message = "Upload mismatches are already tracked in Issues."

        return {
            "ok": True,
            "endpoint_path": endpoint_path,
            "created": created,
            "updated": updated,
            "candidates": candidates,
            "analyzed_at": analyzed_at,
            "message": message,
        }

    def upload_auto_issue_materialization_enabled() -> bool:  # pragma: no cover
        raw = str(os.getenv("JIN_UPLOAD_AUTO_CREATE_ISSUES", "1")).strip().lower()
        return raw not in {"0", "false", "no", "off"}

    def sync_upload_analysis_runtime_issues(
        endpoint_path: str, analysis_payload: dict[str, object]
    ) -> dict[str, object]:  # pragma: no cover
        if not upload_auto_issue_materialization_enabled():
            return {
                "ok": True,
                "endpoint_path": endpoint_path,
                "created": 0,
                "updated": 0,
                "candidates": 0,
                "analyzed_at": str(analysis_payload.get("analyzed_at") or now_naive().isoformat(sep=" ")),
                "auto_enabled": False,
                "message": "Automatic issue creation from upload mismatches is disabled.",
            }
        synced = materialize_upload_analysis_runtime_issues(endpoint_path, analysis_payload)
        synced["auto_enabled"] = True
        return synced

    def apply_anomaly_action(  # pragma: no cover
        anomaly_id: int,
        *,
        action: str,
        note: str | None = None,
        owner: str | None = None,
        resolution_reason: str | None = None,
        until: str | None = None,
        snooze_minutes: int = 0,
    ) -> dict[str, object]:
        owner = normalize_owner(owner)
        snoozed_until = None
        suppressed_until = None
        if action == "snoozed" and not until and snooze_minutes > 0:
            snoozed_until = (now_naive() + timedelta(minutes=snooze_minutes)).isoformat(sep=" ")
        elif action == "suppressed" and not until and snooze_minutes > 0:
            suppressed_until = (now_naive() + timedelta(minutes=snooze_minutes)).isoformat(sep=" ")
        elif action == "snoozed":
            snoozed_until = until
        elif action == "suppressed":
            suppressed_until = until
        if action == "resolved":
            if duckdb is not None:
                conn, lock = connection_and_lock()
                with lock:
                    try:
                        conn.execute(
                            "UPDATE jin_anomalies SET is_active = false, resolved_at = now() WHERE id = ?",
                            [anomaly_id],
                        )
                    except Exception as exc:
                        record_router_error(
                            "router.resolve_anomaly",
                            "Could not mark anomaly inactive in DuckDB; continuing with incident-state resolution.",
                            detail=str(exc),
                            hint="Check anomaly table/index consistency in the local DuckDB file.",
                        )
                    checkpoint_if_enabled(conn)
            result = {"ok": True, "id": anomaly_id}
            for endpoint_state in middleware.runtime_state.values():
                for item in endpoint_state.get("anomalies", []):
                    if item["id"] == anomaly_id:
                        item["is_active"] = False
            upsert_incident_state(
                anomaly_id,
                incident_status="resolved",
                note=note,
                owner=owner,
                resolution_reason=resolution_reason,
                event_type="resolved",
                payload={"action": action},
            )
            middleware.incident_state[anomaly_id] = {
                "incident_status": "resolved",
                "status": "resolved",
                "note": note,
                "owner": owner,
                "resolution_reason": resolution_reason,
                "snoozed_until": None,
                "suppressed_until": None,
                "timeline": [
                    {
                        "event_type": "resolved",
                        "created_at": now_naive().isoformat(sep=" "),
                        "note": note,
                        "owner": owner,
                        "resolution_reason": resolution_reason,
                    }
                ],
            }
            return result
        upsert_incident_state(
            anomaly_id,
            incident_status=action,
            note=note,
            owner=owner,
            resolution_reason=resolution_reason,
            snoozed_until=snoozed_until if action == "snoozed" else None,
            suppressed_until=suppressed_until if action == "suppressed" else None,
            event_type=action,
            payload={"action": action, "until": until, "snooze_minutes": snooze_minutes},
        )
        middleware.incident_state[anomaly_id] = {
            "incident_status": action,
            "status": action,
            "note": note,
            "owner": owner,
            "resolution_reason": resolution_reason,
            "snoozed_until": snoozed_until if action == "snoozed" else None,
            "suppressed_until": suppressed_until if action == "suppressed" else None,
            "timeline": [
                {
                    "event_type": action,
                    "created_at": now_naive().isoformat(sep=" "),
                    "note": note,
                    "owner": owner,
                    "resolution_reason": resolution_reason,
                }
            ],
        }
        return {"ok": True, "id": anomaly_id, "status": action}

    def force_anomaly_resolved(anomaly_id: int) -> None:
        """Best-effort safety net to keep a resolved issue out of active feeds."""
        if duckdb is not None:
            conn, lock = connection_and_lock()
            with lock:
                try:
                    conn.execute(
                        "UPDATE jin_anomalies SET is_active = false, resolved_at = now() WHERE id = ?",
                        [anomaly_id],
                    )
                except Exception as exc:
                    record_router_error(
                        "router.resolve_anomaly",
                        "Could not force anomaly inactive after resolution; continuing with runtime-state cleanup.",
                        detail=str(exc),
                        hint="Check anomaly table/index consistency in the local DuckDB file.",
                    )
                checkpoint_if_enabled(conn)
        for endpoint_state in middleware.runtime_state.values():
            for item in endpoint_state.get("anomalies", []):
                if item["id"] == anomaly_id:
                    item["is_active"] = False

    def load_endpoint_metadata(endpoint_path: str) -> dict[str, object]:
        record = endpoint_record_or_404(endpoint_path)
        response_model_present = record.response_model is not None
        metadata: dict[str, object] = {
            "fields": record.fields,
            "dimension_fields": record.dimension_fields,
            "kpi_fields": record.kpi_fields,
            "response_model_present": response_model_present,
            "schema_contract": {
                "path": record.path,
                "method": record.method,
                "field_count": len(record.fields),
                "fields": record.fields,
                "dimension_fields": record.dimension_fields,
                "kpi_fields": record.kpi_fields,
                "response_model_present": response_model_present,
            },
        }
        if config_show is not None:
            try:
                payload = json.loads(call_native(config_show, middleware.db_path, endpoint_path))
                schema_contract = payload.get("schema_contract")
                config_payload = payload.get("config") or {}
                if isinstance(schema_contract, dict):
                    metadata["schema_contract"] = schema_contract
                    metadata["fields"] = schema_contract.get("fields", metadata["fields"])
                    metadata["dimension_fields"] = schema_contract.get(
                        "dimension_fields", metadata["dimension_fields"]
                    )
                    metadata["kpi_fields"] = schema_contract.get("kpi_fields", metadata["kpi_fields"])
                if config_payload.get("dimension_fields"):
                    metadata["dimension_fields"] = config_payload["dimension_fields"]
                if config_payload.get("kpi_fields"):
                    metadata["kpi_fields"] = config_payload["kpi_fields"]
            except Exception:
                pass
        row = None
        if duckdb is None:  # pragma: no cover
            return metadata
        try:
            conn, lock = connection_and_lock()
            with lock:
                row = conn.execute(
                    """
                    SELECT pydantic_schema, dimension_fields, kpi_fields
                    FROM jin_endpoints
                    WHERE endpoint_path = ?
                    """,
                    [endpoint_path],
                ).fetchone()
        except Exception:
            row = None
        if row:
            if row[0]:  # pragma: no branch
                try:
                    schema_payload = json.loads(row[0])
                    if isinstance(schema_payload, dict):
                        metadata["schema_contract"] = schema_payload
                        metadata["fields"] = schema_payload.get("fields", metadata["fields"])
                        metadata["dimension_fields"] = schema_payload.get(
                            "dimension_fields", metadata["dimension_fields"]
                        )
                        metadata["kpi_fields"] = schema_payload.get("kpi_fields", metadata["kpi_fields"])
                    else:
                        metadata["fields"] = schema_payload
                except Exception:
                    pass
            if row[1]:
                try:
                    metadata["dimension_fields"] = json.loads(row[1])
                except Exception:
                    pass
            if row[2]:
                try:
                    metadata["kpi_fields"] = json.loads(row[2])
                except Exception:
                    pass
        direct_overrides = middleware.override_state.get(endpoint_path, {})
        if direct_overrides.get("dimension_fields"):
            metadata["dimension_fields"] = direct_overrides["dimension_fields"]
        if direct_overrides.get("kpi_fields"):
            metadata["kpi_fields"] = direct_overrides["kpi_fields"]
        overrides = middleware._load_overrides(endpoint_path)
        if overrides.get("dimension_fields"):
            metadata["dimension_fields"] = overrides["dimension_fields"]
        if overrides.get("kpi_fields"):
            metadata["kpi_fields"] = overrides["kpi_fields"]
        schema_contract = metadata.get("schema_contract")
        metadata["schema_contract"] = {
            **(schema_contract if isinstance(schema_contract, dict) else {}),
            "path": endpoint_path,
            "method": record.method,
            "fields": metadata["fields"],
            "dimension_fields": metadata["dimension_fields"],
            "kpi_fields": metadata["kpi_fields"],
            "field_count": len(metadata["fields"]),
        }
        return metadata

    def endpoint_metadata_native_first(endpoint_path: str) -> dict[str, object]:
        # Keep metadata reads on lightweight config/schema paths only.
        #
        # We intentionally avoid native `get_endpoint_detail` here because upload preview
        # and upload validation only need field metadata, and full-detail reads can touch
        # larger historical/reference string blocks that are more likely to trigger DuckDB
        # internal assertion failures on partially corrupted files.
        return load_endpoint_metadata(endpoint_path)

    def endpoint_metadata_runtime_only(endpoint_path: str) -> dict[str, object]:
        """Return endpoint metadata without touching DuckDB/native detail readers.

        This path is used by upload preview/upload so operators can still run
        "Check file" even when the on-disk DuckDB file has a corrupted dictionary
        page and read-heavy metadata queries are unstable.
        """
        record = endpoint_record_or_404(endpoint_path)
        response_model_present = record.response_model is not None
        fields = record.fields
        dimension_fields = list(record.dimension_fields or [])
        kpi_fields = list(record.kpi_fields or [])
        direct_overrides = middleware.override_state.get(endpoint_path, {})
        if isinstance(direct_overrides, dict):
            if isinstance(direct_overrides.get("dimension_fields"), list):
                dimension_fields = list(direct_overrides["dimension_fields"])
            if isinstance(direct_overrides.get("kpi_fields"), list):
                kpi_fields = list(direct_overrides["kpi_fields"])
        saved_overrides = middleware._load_overrides(endpoint_path)
        if isinstance(saved_overrides, dict):
            if isinstance(saved_overrides.get("dimension_fields"), list):
                dimension_fields = list(saved_overrides["dimension_fields"])
            if isinstance(saved_overrides.get("kpi_fields"), list):
                kpi_fields = list(saved_overrides["kpi_fields"])
        return {
            "fields": fields,
            "dimension_fields": dimension_fields,
            "kpi_fields": kpi_fields,
            "response_model_present": response_model_present,
            "schema_contract": {
                "path": endpoint_path,
                "method": record.method,
                "fields": fields,
                "dimension_fields": dimension_fields,
                "kpi_fields": kpi_fields,
                "field_count": len(fields),
                "response_model_present": response_model_present,
            },
        }

    def _ensure_config_mapping_columns(conn: Any) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jin_config (
                endpoint_path VARCHAR PRIMARY KEY,
                dimension_overrides VARCHAR,
                kpi_overrides VARCHAR,
                tolerance_relaxed DOUBLE DEFAULT 20.0,
                tolerance_normal DOUBLE DEFAULT 10.0,
                tolerance_strict DOUBLE DEFAULT 5.0,
                active_tolerance VARCHAR DEFAULT 'normal',
                tolerance_pct DOUBLE DEFAULT 10.0,
                confirmed BOOLEAN DEFAULT false,
                rows_path VARCHAR,
                time_end_field VARCHAR,
                time_profile VARCHAR DEFAULT 'auto',
                time_extraction_rule VARCHAR DEFAULT 'single',
                time_format VARCHAR,
                time_field VARCHAR,
                time_granularity VARCHAR DEFAULT 'minute',
                time_pin INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT now()
            )
            """
        )
        statements = [
            "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS rows_path VARCHAR",
            "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_end_field VARCHAR",
            "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_profile VARCHAR DEFAULT 'auto'",
            "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_extraction_rule VARCHAR DEFAULT 'single'",
            "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_format VARCHAR",
            "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_pin INTEGER DEFAULT 0",
        ]
        for statement in statements:
            conn.execute(statement)

    def _ensure_fallback_storage_tables(conn: Any) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jin_endpoints (
                endpoint_path VARCHAR,
                http_method VARCHAR,
                pydantic_schema VARCHAR,
                dimension_fields VARCHAR,
                kpi_fields VARCHAR,
                config_source VARCHAR DEFAULT 'auto',
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (endpoint_path, http_method)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jin_rollups (
                endpoint_path VARCHAR NOT NULL,
                metric_name VARCHAR NOT NULL,
                grain_key VARCHAR NOT NULL,
                time_bucket TIMESTAMP NOT NULL,
                value DOUBLE NOT NULL,
                samples BIGINT DEFAULT 1 NOT NULL,
                PRIMARY KEY (endpoint_path, metric_name, grain_key, time_bucket)
            )
            """
        )

    def _load_config_mapping_overrides(endpoint_path: str) -> dict[str, Any]:
        if duckdb is None:  # pragma: no cover
            return {}
        try:
            middleware._ensure_python_schema()
            with middleware.db_lock():
                with duckdb.connect(middleware.db_path) as conn:
                    _ensure_config_mapping_columns(conn)
                    row = conn.execute(
                        """
                        SELECT rows_path, time_end_field, time_profile, time_extraction_rule, time_format, time_pin
                        FROM jin_config
                        WHERE endpoint_path = ?
                        """,
                        [endpoint_path],
                    ).fetchone()
        except Exception:
            return {}
        if not row:
            return {}
        values = list(row) if isinstance(row, (list, tuple)) else [row]
        if len(values) < 6:
            values.extend([None] * (6 - len(values)))
        return {
            "rows_path": values[0],
            "time_end_field": values[1],
            "time_profile": values[2] or "auto",
            "time_extraction_rule": values[3] or "single",
            "time_format": values[4],
            "time_pin": bool(values[5]) if values[5] is not None else False,
        }

    def _persist_config_mapping_overrides(endpoint_path: str, payload: dict[str, Any]) -> None:
        if duckdb is None:  # pragma: no cover
            return
        middleware._ensure_python_schema()
        with middleware.db_lock():
            with duckdb.connect(middleware.db_path) as conn:
                _ensure_config_mapping_columns(conn)
                exists = conn.execute(
                    "SELECT 1 FROM jin_config WHERE endpoint_path = ? LIMIT 1",
                    [endpoint_path],
                ).fetchone()
                values = [
                    payload.get("rows_path"),
                    payload.get("time_end_field"),
                    payload.get("time_profile", "auto"),
                    payload.get("time_extraction_rule", "single"),
                    payload.get("time_format"),
                    1 if payload.get("time_pin", False) else 0,
                    endpoint_path,
                ]
                if exists:
                    conn.execute(
                        """
                        UPDATE jin_config
                        SET rows_path = ?,
                            time_end_field = ?,
                            time_profile = ?,
                            time_extraction_rule = ?,
                            time_format = ?,
                            time_pin = ?,
                            updated_at = now()
                        WHERE endpoint_path = ?
                        """,
                        values,
                    )
                else:
                    conn.execute(
                        """
                        INSERT INTO jin_config (
                            endpoint_path,
                            rows_path,
                            time_end_field,
                            time_profile,
                            time_extraction_rule,
                            time_format,
                            time_pin,
                            updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, now())
                        """,
                        [
                            endpoint_path,
                            payload.get("rows_path"),
                            payload.get("time_end_field"),
                            payload.get("time_profile", "auto"),
                            payload.get("time_extraction_rule", "single"),
                            payload.get("time_format"),
                            1 if payload.get("time_pin", False) else 0,
                        ],
                    )
                try:
                    conn.execute("CHECKPOINT")
                except Exception:
                    pass

    def _is_v2_api_request(request: Request | None) -> bool:
        if request is None:
            return False
        try:
            path = str(request.url.path or "")
        except Exception:
            return False
        return "/api/v2/" in path

    def _looks_like_time_example(value: object) -> bool:
        if value is None:
            return False
        if isinstance(value, (int, float)):
            number = float(value)
            # Unix epoch seconds/ms heuristic.
            return number >= 1000000000
        text = str(value).strip()
        if not text:
            return False
        lower = text.lower()
        if lower in {"ytd", "mtd", "qtd", "wtd"}:
            return True
        if re.match(r"^\d{4}[-/]\d{2}[-/]\d{2}", text):
            return True
        if re.match(r"^\d{4}-w\d{1,2}$", lower):
            return True
        if re.match(r"^\d{4}(q[1-4]|-q[1-4])$", lower):
            return True
        if re.match(r"^\d{4}-\d{2}$", text):
            return True
        if re.match(r"^\d{10,13}$", text):
            return True
        return "t" in lower and ":" in lower and "-" in lower

    def _time_candidates_from_fields(fields: object) -> list[str]:
        rows = fields if isinstance(fields, list) else []
        candidates: list[str] = []
        seen: set[str] = set()
        for row in rows:
            if not isinstance(row, dict):
                continue
            name = str(row.get("name") or "").strip()
            if not name:
                continue
            leaf_name = name.replace("[]", "").split(".")[-1]
            if leaf_name in TECHNICAL_METADATA_FIELDS:
                continue
            lower = name.lower()
            annotation = str(row.get("annotation") or row.get("type") or "").lower()
            example = row.get("example")
            keyword_hit = any(
                token in lower
                for token in (
                    "time",
                    "date",
                    "timestamp",
                    "created_at",
                    "updated_at",
                    "period",
                    "week",
                    "month",
                    "year",
                    "day",
                )
            )
            annotation_hit = annotation in {"date", "datetime"}
            sample_hit = _looks_like_time_example(example)
            if not (keyword_hit or annotation_hit or sample_hit):
                continue
            if name in seen:
                continue
            seen.add(name)
            candidates.append(name)
        return candidates

    def _setup_time_requirements(endpoint_path: str) -> dict[str, object]:
        metadata = endpoint_metadata_runtime_only(endpoint_path)
        fields = metadata.get("fields")
        candidates = _time_candidates_from_fields(fields)
        return {
            "time_required": bool(candidates),
            "time_candidates": candidates,
        }

    def _setup_snapshot(endpoint_path: str) -> dict[str, Any]:
        record = endpoint_record_or_404(endpoint_path)
        overrides = middleware._load_overrides(endpoint_path) or {}
        time_requirements = _setup_time_requirements(endpoint_path)
        dimension_fields = overrides.get("dimension_fields")
        kpi_fields = overrides.get("kpi_fields")
        return {
            "response_model_present": record.response_model is not None,
            "dimension_fields": dimension_fields if isinstance(dimension_fields, list) else [],
            "kpi_fields": kpi_fields if isinstance(kpi_fields, list) else [],
            "time_field": str(overrides.get("time_field") or "").strip() or None,
            "confirmed": bool(overrides.get("confirmed", False)),
            "rows_path": overrides.get("rows_path"),
            "time_profile": overrides.get("time_profile") or "auto",
            "time_extraction_rule": overrides.get("time_extraction_rule") or "single",
            "time_required": bool(time_requirements.get("time_required", True)),
            "time_candidates": time_requirements.get("time_candidates") or [],
        }

    def _setup_blockers(snapshot: dict[str, Any]) -> list[str]:
        blockers: list[str] = []
        if not bool(snapshot.get("response_model_present", True)):
            blockers.append("define a Pydantic response model first")
        if not list(snapshot.get("dimension_fields") or []):
            blockers.append("pick at least one Segment field")
        if not list(snapshot.get("kpi_fields") or []):
            blockers.append("pick at least one Metric field")
        time_required = bool(snapshot.get("time_required", True))
        if time_required and not str(snapshot.get("time_field") or "").strip():
            blockers.append("pick one Time field")
        if not bool(snapshot.get("confirmed", False)):
            blockers.append("save configuration")
        return blockers

    def _require_v2_setup_ready(
        endpoint_path: str,
        request: Request | None,
        *,
        action_text: str,
    ) -> JSONResponse | None:
        if not _is_v2_api_request(request):
            return None
        snapshot = _setup_snapshot(endpoint_path)
        blockers = _setup_blockers(snapshot)
        if not blockers:
            return None
        message = f"Before {action_text}, complete setup in Configuration: {', '.join(blockers)}."
        return JSONResponse(
            {
                "ok": False,
                "endpoint_path": endpoint_path,
                "error": message,
                "setup_blockers": blockers,
                "setup": snapshot,
                "next_step": "Open Configuration, set Segment + Metric + Time, save setup, then retry.",
            },
            status_code=409,
        )

    def flatten_runtime_sample(row: Any) -> dict[str, Any]:
        if not isinstance(row, dict):
            return {}
        flat = dict(row)
        for key in ("dimension_json", "kpi_json"):
            payload = row.get(key)
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except Exception:
                    payload = {}
            if isinstance(payload, dict):
                flat.update(payload)
        return flat

    def runtime_mapping_rows(endpoint_path: str) -> list[dict[str, Any]]:
        endpoint_state = middleware.runtime_state.get(endpoint_path, {})
        history = endpoint_state.get("history", [])
        recent = endpoint_state.get("recent_history", [])
        source = history if isinstance(history, list) and history else recent if isinstance(recent, list) else []
        rows = [flatten_runtime_sample(item) for item in source if isinstance(item, dict)]
        return [row for row in rows if row]

    def _normalize_upload_token(value: str) -> str:
        return re.sub(r"[^a-z0-9]", "", str(value or "").lower())

    def _field_leaf(field_name: str) -> str:
        return str(field_name or "").replace("[]", "").split(".")[-1]

    def infer_roles_from_upload_rows(
        rows: list[dict[str, Any]],
        metadata_fields: list[dict[str, Any]],
        current_dimensions: list[str],
        current_kpis: list[str],
    ) -> tuple[list[str], list[str], list[str]]:
        """Infer dimensions/KPIs from upload headers when role config is unavailable."""
        if (current_dimensions and current_kpis) or not rows:
            return list(current_dimensions or []), list(current_kpis or []), []
        first_row = rows[0] if rows else {}
        if not isinstance(first_row, dict):
            return list(current_dimensions or []), list(current_kpis or []), []
        internal_format = {"endpoint", "dimension_fields", "kpi_fields"}.issubset(first_row.keys())
        if internal_format:
            return list(current_dimensions or []), list(current_kpis or []), []

        fields_catalog: list[tuple[str, str]] = []
        seen = set()
        for item in metadata_fields or []:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            if not name or name in seen:
                continue
            seen.add(name)
            fields_catalog.append((name, _normalize_upload_token(name)))

        reserved_headers = {"tolerance_pct", "endpoint", "dimension_fields", "kpi_fields"}
        header_to_field: dict[str, str] = {}
        header_role_hints: dict[str, str] = {}
        for header in first_row.keys():
            if not header:
                continue
            header_text = str(header)
            if header_text in reserved_headers:
                continue
            candidate_name = ""
            role_hint = ""
            if header_text.startswith("grain_"):
                candidate_name = header_text[len("grain_") :]
                role_hint = "dimension"
            elif header_text.startswith("expected_"):
                candidate_name = header_text[len("expected_") :]
                role_hint = "kpi"
            if candidate_name and any(name == candidate_name for name, _ in fields_catalog):
                header_to_field[header_text] = candidate_name
                if role_hint:
                    header_role_hints[header_text] = role_hint
                continue

            norm_header = _normalize_upload_token(header_text)
            if not norm_header:
                continue
            best_name = ""
            best_score = -1
            for field_name, norm_field in fields_catalog:
                if not norm_field:
                    continue
                leaf_norm = _normalize_upload_token(_field_leaf(field_name))
                score = -1
                if norm_header == norm_field:
                    score = 4
                elif leaf_norm and norm_header == leaf_norm:
                    score = 3
                elif norm_header in norm_field or norm_field in norm_header:
                    score = 2
                elif leaf_norm and (norm_header in leaf_norm or leaf_norm in norm_header):
                    score = 1
                if score > best_score:
                    best_score = score
                    best_name = field_name
            if best_name and best_score >= 1:
                header_to_field[header_text] = best_name
                if role_hint:
                    header_role_hints[header_text] = role_hint
                continue

            if candidate_name:
                header_to_field[header_text] = candidate_name
                if role_hint:
                    header_role_hints[header_text] = role_hint
                continue

            if not fields_catalog:
                header_to_field[header_text] = header_text.strip()
                if role_hint:
                    header_role_hints[header_text] = role_hint

        matched_fields = list(dict.fromkeys(header_to_field.values()))
        if not matched_fields:
            return list(current_dimensions or []), list(current_kpis or []), []

        def numeric_ratio(header_name: str) -> float:
            values = []
            for row in rows:
                if not isinstance(row, dict):
                    continue
                value = row.get(header_name)
                if value is None:
                    continue
                text = str(value).strip()
                if text == "":
                    continue
                values.append(text)
            if not values:
                return 0.0
            numeric = 0
            for text in values:
                try:
                    float(text)
                    numeric += 1
                except Exception:
                    continue
            return numeric / max(len(values), 1)

        field_to_header: dict[str, str] = {}
        for header_name, field_name in header_to_field.items():
            field_to_header.setdefault(field_name, header_name)
        inferred_dimensions = list(current_dimensions or [])
        inferred_kpis = list(current_kpis or [])
        dim_set = set(inferred_dimensions)
        kpi_set = set(inferred_kpis)

        for field_name in matched_fields:
            if field_name in dim_set or field_name in kpi_set:
                continue
            mapped_header = field_to_header.get(field_name, "")
            hint = header_role_hints.get(mapped_header, "")
            if hint == "dimension":
                dim_set.add(field_name)
                continue
            if hint == "kpi":
                kpi_set.add(field_name)
                continue
            if field_name in TECHNICAL_METADATA_FIELDS or _field_leaf(field_name) in TECHNICAL_METADATA_FIELDS:
                dim_set.add(field_name)
                continue
            ratio = numeric_ratio(mapped_header)
            if ratio >= 0.8:
                kpi_set.add(field_name)
            else:
                dim_set.add(field_name)

        if not kpi_set:
            for field_name in matched_fields:
                if field_name in TECHNICAL_METADATA_FIELDS or _field_leaf(field_name) in TECHNICAL_METADATA_FIELDS:
                    continue
                if field_name in dim_set and len(matched_fields) > 1:
                    continue
                kpi_set.add(field_name)
                break
        if not dim_set:
            for field_name in matched_fields:
                if field_name in kpi_set and len(matched_fields) > 1:
                    continue
                dim_set.add(field_name)
                break

        inferred_dimensions = list(dim_set)
        inferred_kpis = list(kpi_set)
        warnings: list[str] = []
        if inferred_dimensions and inferred_kpis:
            if not fields_catalog:
                warnings.append(
                    "Endpoint schema fields were unavailable; upload headers were used to infer Segment/Metric roles."
                )
            warnings.append(
                "Field roles were auto-inferred from uploaded headers because saved Segment/Metric configuration was unavailable."
            )
        return inferred_dimensions, inferred_kpis, warnings

    def build_trend_summary(history: list[dict[str, object]], kpi_fields: list[str]) -> list[dict[str, object]]:
        summary: list[dict[str, object]] = []
        for kpi_field in kpi_fields:
            series = [
                row.get("kpi_json", {}).get(kpi_field)
                for row in history
                if isinstance(row.get("kpi_json"), dict) and row.get("kpi_json", {}).get(kpi_field) is not None
            ]
            numeric_series = [value for value in series if isinstance(value, (int, float))]
            if not numeric_series:
                continue
            latest = numeric_series[0]
            earliest = numeric_series[-1]
            delta_pct = 0.0 if earliest == 0 else round(((latest - earliest) / earliest) * 100, 2)
            summary.append(
                {
                    "kpi_field": kpi_field,
                    "latest": latest,
                    "min": min(numeric_series),
                    "max": max(numeric_series),
                    "samples": len(numeric_series),
                    "delta_pct": delta_pct,
                }
            )
        return summary

    def load_endpoint_operational_metadata(endpoint_path: str) -> dict[str, object]:
        metadata = {
            "last_upload_at": None,
            "last_upload_source": None,
            "upload_count": 0,
            "config_updated_at": None,
            "observation_count": 0,
            "last_observed_at": None,
            "latest_incident_at": None,
            "recent_uploads": [],
        }
        if endpoint_operational_metadata is not None:
            try:
                payload_str = call_native(endpoint_operational_metadata, middleware.db_path, endpoint_path)
                payload = json.loads(payload_str)
                if isinstance(payload, dict):
                    metadata.update(payload)
            except Exception as exc:
                record_router_error(
                    "router.endpoint_operational_metadata",
                    "Falling back to Python operational metadata after native metadata read error.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    hint="Check the native extension and endpoint-level observation/reference tables.",
                )

        if duckdb is None:  # pragma: no cover
            runtime_state = middleware.runtime_state.get(endpoint_path, {})
            metadata["last_observed_at"] = runtime_state.get("last_checked")
            return metadata
        try:
            conn, lock = connection_and_lock()
        except Exception as exc:
            record_router_error(
                "router.endpoint_operational_metadata",
                "Falling back to runtime operational metadata after DB connection error.",
                endpoint_path=endpoint_path,
                detail=str(exc),
                hint="Check DuckDB file locks or use one active process per project DB.",
                level="warning",
            )
            runtime_state = middleware.runtime_state.get(endpoint_path, {})
            metadata["last_observed_at"] = runtime_state.get("last_checked")
            return metadata
        with lock:
            try:
                upload_row = conn.execute(
                    """
                    SELECT CAST(MAX(uploaded_at) AS VARCHAR), COUNT(*)
                    FROM jin_reference
                    WHERE endpoint_path = ?
                    """,
                    [endpoint_path],
                ).fetchone()
                if upload_row:
                    metadata["last_upload_at"] = upload_row[0]
                    metadata["upload_count"] = int(upload_row[1] or 0)
                latest_upload_source = conn.execute(
                    """
                    SELECT upload_source
                    FROM jin_reference
                    WHERE endpoint_path = ?
                    ORDER BY uploaded_at DESC, id DESC
                    LIMIT 1
                    """,
                    [endpoint_path],
                ).fetchone()
                if latest_upload_source:
                    metadata["last_upload_source"] = latest_upload_source[0]
                config_row = conn.execute(
                    """
                    SELECT CAST(updated_at AS VARCHAR)
                    FROM jin_config
                    WHERE endpoint_path = ?
                    """,
                    [endpoint_path],
                ).fetchone()
                if config_row:
                    metadata["config_updated_at"] = config_row[0]
                observation_row = conn.execute(
                    """
                    SELECT COUNT(*), CAST(MAX(observed_at) AS VARCHAR)
                    FROM jin_observations
                    WHERE endpoint_path = ?
                    """,
                    [endpoint_path],
                ).fetchone()
                if observation_row:
                    metadata["observation_count"] = int(observation_row[0] or 0)
                    metadata["last_observed_at"] = observation_row[1]
                incident_row = conn.execute(
                    """
                    SELECT CAST(MAX(detected_at) AS VARCHAR)
                    FROM jin_anomalies
                    WHERE endpoint_path = ?
                    """,
                    [endpoint_path],
                ).fetchone()
                if incident_row:
                    metadata["latest_incident_at"] = incident_row[0]
                recent_upload_rows = conn.execute(
                    """
                    SELECT
                      grain_key,
                      kpi_field,
                      expected_value,
                      tolerance_pct,
                      upload_source,
                      CAST(uploaded_at AS VARCHAR)
                    FROM jin_reference
                    WHERE endpoint_path = ?
                    ORDER BY uploaded_at DESC, id DESC
                    LIMIT 8
                    """,
                    [endpoint_path],
                ).fetchall()
                metadata["recent_uploads"] = [
                    {
                        "grain_key": row[0],
                        "kpi_field": row[1],
                        "expected_value": row[2],
                        "tolerance_pct": row[3],
                        "upload_source": row[4],
                        "uploaded_at": row[5],
                    }
                    for row in recent_upload_rows
                ]
            except Exception:
                pass
        runtime_state = middleware.runtime_state.get(endpoint_path, {})
        metadata["last_observed_at"] = metadata["last_observed_at"] or runtime_state.get("last_checked")
        return metadata

    def load_runtime_status() -> dict[str, list[dict[str, object]]]:
        endpoints = []
        for path, record in middleware.endpoint_registry.items():
            metadata = load_endpoint_metadata(path)
            runtime_state = middleware.runtime_state.get(path, {})
            active_anomalies = sum(1 for item in runtime_state.get("anomalies", []) if item.get("is_active"))
            grain_count = len(runtime_state.get("grains", set()))
            latest_history = runtime_state.get("recent_history", [])
            current_kpis = []
            if latest_history:
                latest = latest_history[0]
                current_kpis = [
                    {
                        "grain_key": latest.get("grain_key"),
                        "kpi_field": field,
                        "actual_value": value,
                        "expected_value": None,
                        "pct_change": 0,
                    }
                    for field, value in (latest.get("kpi_json") or {}).items()
                ]
            active_rows = [item for item in runtime_state.get("anomalies", []) if item.get("is_active")]
            if active_rows:
                current_kpis = [
                    {
                        "grain_key": item.get("grain_key"),
                        "kpi_field": item.get("kpi_field"),
                        "actual_value": item.get("actual_value"),
                        "expected_value": item.get("expected_value"),
                        "pct_change": item.get("pct_change"),
                    }
                    for item in active_rows[:4]
                ]
            defaults = {
                "endpoint_path": path,
                "http_method": record.method,
                "dimension_fields": metadata["dimension_fields"],
                "kpi_fields": metadata["kpi_fields"],
                "time_field": None,
                "time_required": bool(_time_candidates_from_fields(metadata["fields"])),
                "time_candidates": _time_candidates_from_fields(metadata["fields"]),
                "grain_count": grain_count,
                "active_anomalies": active_anomalies,
                "status": "unconfirmed" if metadata["kpi_fields"] else "healthy",
                "confirmed": False,
                "tolerance_pct": middleware.global_threshold,
                "tolerance_relaxed": 20.0,
                "tolerance_normal": middleware.global_threshold,
                "tolerance_strict": 5.0,
                "active_tolerance": "normal",
                "config_source": "auto",
                "fields": metadata["fields"],
                "last_checked": runtime_state.get("last_checked"),
                "current_kpis": current_kpis,
            }
            overrides = middleware._load_overrides(path)
            if overrides:
                defaults["dimension_fields"] = overrides.get("dimension_fields") or defaults["dimension_fields"]
                defaults["kpi_fields"] = overrides.get("kpi_fields") or defaults["kpi_fields"]
                defaults["tolerance_pct"] = overrides.get("tolerance_pct") or defaults["tolerance_pct"]
                defaults["confirmed"] = overrides.get("confirmed", defaults["confirmed"])
                defaults["time_field"] = overrides.get("time_field") or defaults["time_field"]
            if defaults["active_anomalies"]:
                defaults["status"] = "anomaly"
            elif defaults["grain_count"]:
                defaults["status"] = "healthy" if defaults["confirmed"] else "warning"
            defaults.update(load_endpoint_operational_metadata(path))
            endpoints.append(defaults)
        endpoints.sort(key=lambda item: (item["endpoint_path"], item["http_method"]))
        return {
            "summary": {
                "total_endpoints": len(endpoints),
                "healthy": sum(1 for item in endpoints if item["status"] == "healthy"),
                "anomalies": sum(int(item["active_anomalies"]) for item in endpoints),
                "unconfirmed": sum(1 for item in endpoints if not item["confirmed"]),
            },
            "endpoints": endpoints,
            "project": middleware.dashboard_context(),
            "recent_errors": middleware.dashboard_context()["recent_errors"],
        }

    def merge_status_payload(payload: dict[str, object]) -> dict[str, object]:
        runtime_endpoints = {
            item["endpoint_path"]: item
            for item in payload.get("endpoints", [])
            if isinstance(item, dict) and "endpoint_path" in item
        }
        merged = []
        for path, record in middleware.endpoint_registry.items():
            metadata = load_endpoint_metadata(path)
            base = {
                "endpoint_path": path,
                "http_method": record.method,
                "dimension_fields": metadata["dimension_fields"],
                "kpi_fields": metadata["kpi_fields"],
                "time_field": None,
                "time_required": bool(_time_candidates_from_fields(metadata["fields"])),
                "time_candidates": _time_candidates_from_fields(metadata["fields"]),
                "grain_count": 0,
                "active_anomalies": 0,
                "status": "unconfirmed" if metadata["kpi_fields"] else "healthy",
                "confirmed": False,
                "tolerance_pct": middleware.global_threshold,
                "tolerance_relaxed": 20.0,
                "tolerance_normal": middleware.global_threshold,
                "tolerance_strict": 5.0,
                "active_tolerance": "normal",
                "config_source": "auto",
                "fields": metadata["fields"],
                "last_checked": None,
                "current_kpis": [],
            }
            base.update(runtime_endpoints.get(path, {}))
            base["fields"] = metadata["fields"]
            base["dimension_fields"] = metadata["dimension_fields"]
            base["kpi_fields"] = metadata["kpi_fields"]
            overrides = middleware._load_overrides(path)
            if overrides:
                base["dimension_fields"] = overrides.get("dimension_fields") or base["dimension_fields"]
                base["kpi_fields"] = overrides.get("kpi_fields") or base["kpi_fields"]
                base["confirmed"] = overrides.get("confirmed", base["confirmed"])
                base["time_field"] = overrides.get("time_field") or base.get("time_field")
            base.update(load_endpoint_operational_metadata(path))
            merged.append(base)
        merged.sort(key=lambda item: (item["endpoint_path"], item["http_method"]))
        summary = {
            "total_endpoints": len(merged),
            "healthy": sum(1 for item in merged if item["status"] == "healthy"),
            "anomalies": sum(int(item["active_anomalies"]) for item in merged),
            "unconfirmed": sum(1 for item in merged if not item["confirmed"]),
        }
        return {
            "summary": summary,
            "endpoints": merged,
            "project": middleware.dashboard_context(),
            "recent_errors": middleware.dashboard_context()["recent_errors"],
        }

    def status_payload_native_or_runtime(*, prefer_runtime: bool = False) -> dict[str, object]:
        if prefer_runtime:
            return load_runtime_status()
        if get_status is not None:
            try:
                native_payload = call_native(get_status, middleware.db_path)
                if merge_status_with_registry is not None:
                    registry_payload = json.dumps(
                        [
                            {
                                "endpoint_path": path,
                                "http_method": record.method,
                                "dimension_fields": record.dimension_fields,
                                "kpi_fields": record.kpi_fields,
                                "fields": record.fields,
                                "schema_contract": build_schema_contract(
                                    EndpointModelInfo(
                                        method=record.method,
                                        path=record.path,
                                        fields=record.fields,
                                        dimension_fields=record.dimension_fields,
                                        kpi_fields=record.kpi_fields,
                                    )
                                ),
                            }
                            for path, record in middleware.endpoint_registry.items()
                        ]
                    )
                    merged_payload = json.loads(
                        call_native(
                            merge_status_with_registry,
                            native_payload,
                            registry_payload,
                            middleware.global_threshold,
                        )
                    )
                    return merge_status_payload(merged_payload)
                return merge_status_payload(json.loads(native_payload))
            except Exception as exc:
                record_router_error(
                    "router.status",
                    "Falling back to runtime status after native status retrieval failed.",
                    detail=str(exc),
                    hint="Check the native extension and DuckDB state for this project.",
                )
        return load_runtime_status()

    def resolve_project_or_404(project_id: str | None = None) -> dict[str, object]:
        try:
            return middleware.resolve_project(project_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    def current_project_id() -> str:
        return middleware._project_catalog_id(middleware.project_name, middleware.project_root, middleware.db_path)

    def is_current_project(project: dict[str, object]) -> bool:
        if str(project.get("id") or "") == current_project_id():
            return True
        project_db_path = str(project.get("db_path") or "").strip()
        runtime_db_path = str(middleware.db_path or "").strip()
        if not project_db_path or not runtime_db_path:
            return False
        try:
            return Path(project_db_path).expanduser().resolve() == Path(runtime_db_path).expanduser().resolve()
        except Exception:
            return project_db_path == runtime_db_path

    def normalize_status_summary(
        summary: dict[str, object] | None,
        endpoints: list[dict[str, object]] | None,
    ) -> dict[str, object]:
        payload = dict(summary) if isinstance(summary, dict) else {}
        endpoint_rows = endpoints if isinstance(endpoints, list) else []
        total_endpoints = int(payload.get("total_endpoints") or len(endpoint_rows))
        healthy = payload.get("healthy")
        anomalies = payload.get("anomalies")
        unconfirmed = payload.get("unconfirmed")
        if healthy is None:
            healthy = sum(1 for item in endpoint_rows if isinstance(item, dict) and item.get("status") == "healthy")
        if anomalies is None:
            anomalies = sum(
                int(item.get("active_anomalies") or 0)
                for item in endpoint_rows
                if isinstance(item, dict)
            )
        if unconfirmed is None:
            unconfirmed = sum(
                1 for item in endpoint_rows if isinstance(item, dict) and not item.get("confirmed", False)
            )
        return {
            "total_endpoints": int(total_endpoints),
            "healthy": int(healthy or 0),
            "anomalies": int(anomalies or 0),
            "unconfirmed": int(unconfirmed or 0),
        }

    def project_context_for_status(project: dict[str, object], summary: dict[str, object]) -> dict[str, object]:
        if is_current_project(project):
            return middleware.dashboard_context()
        current_context = middleware.dashboard_context()
        anomaly_count = int(summary.get("anomalies", 0) or 0)
        trust_score = round(max(0.0, 100.0 - (anomaly_count * 2.5)), 1)
        return {
            **current_context,
            "name": str(project.get("name") or middleware.project_name),
            "root": str(project.get("root") or middleware.project_root),
            "db_path": str(project.get("db_path") or middleware.db_path),
            "trust_score": trust_score,
            "recent_errors": [],
        }

    def status_payload_for_project(project_id: str | None = None, *, prefer_runtime: bool = False) -> dict[str, object]:
        if project_id is None:
            return status_payload_native_or_runtime(prefer_runtime=prefer_runtime)
        project = resolve_project_or_404(project_id)
        if is_current_project(project):
            return status_payload_native_or_runtime(prefer_runtime=prefer_runtime)

        db_path = str(project.get("db_path") or "").strip()
        if not db_path:
            raise HTTPException(status_code=400, detail="project db_path is required")

        native_payload: dict[str, object] = {}
        if get_status is not None:
            try:
                payload_raw = call_native(get_status, db_path)
                parsed = json.loads(payload_raw)
                if isinstance(parsed, dict):
                    native_payload = parsed
            except Exception as exc:
                record_router_error(
                    "router.status.project",
                    "Could not load status for selected project.",
                    detail=str(exc),
                    hint="Check that the selected project's DuckDB file is accessible.",
                    level="warning",
                )
        endpoint_rows = native_payload.get("endpoints")
        endpoints = [row for row in endpoint_rows if isinstance(row, dict)] if isinstance(endpoint_rows, list) else []
        summary = normalize_status_summary(native_payload.get("summary"), endpoints)
        return {
            "summary": summary,
            "endpoints": endpoints,
            "project": project_context_for_status(project, summary),
            "recent_errors": [],
        }

    def baseline_coverage_summary(
        endpoint_path: str | None = None,
        *,
        db_path: str | None = None,
        endpoint_count_hint: int | None = None,
    ) -> dict[str, object]:
        summary: dict[str, object] = {
            "total_reference_rows": 0,
            "endpoints_with_baseline": 0,
            "coverage_pct": 0.0,
        }
        if duckdb is None:  # pragma: no cover
            return summary

        target_db_path = str(db_path or middleware.db_path)
        use_primary_conn = target_db_path == middleware.db_path
        conn = None
        lock = None
        close_conn = False
        try:
            if use_primary_conn:
                middleware._ensure_python_schema()
                conn, lock = connection_and_lock()
            else:
                conn = duckdb.connect(target_db_path)
                close_conn = True
            if endpoint_path is None:
                if use_primary_conn:
                    with lock:
                        total_reference_rows = conn.execute("SELECT COUNT(*) FROM jin_reference").fetchone()
                        endpoint_count = conn.execute(
                            "SELECT COUNT(DISTINCT endpoint_path) FROM jin_reference"
                        ).fetchone()
                else:
                    total_reference_rows = conn.execute("SELECT COUNT(*) FROM jin_reference").fetchone()
                    endpoint_count = conn.execute(
                        "SELECT COUNT(DISTINCT endpoint_path) FROM jin_reference"
                    ).fetchone()
                summary["total_reference_rows"] = int(total_reference_rows[0] or 0) if total_reference_rows else 0
                summary["endpoints_with_baseline"] = int(endpoint_count[0] or 0) if endpoint_count else 0
                total_endpoints = (
                    len(middleware.endpoint_registry)
                    if use_primary_conn
                    else max(int(endpoint_count_hint or 0), summary["endpoints_with_baseline"])
                )
                summary["coverage_pct"] = (
                    round((summary["endpoints_with_baseline"] / total_endpoints) * 100, 2)
                    if total_endpoints
                    else 100.0
                )
                return summary
            if use_primary_conn:
                with lock:
                    endpoint_rows = conn.execute(
                        """
                        SELECT
                          COUNT(*) AS total_reference_rows,
                          COUNT(DISTINCT grain_key) AS grains_with_baseline,
                          COUNT(DISTINCT kpi_field) AS kpis_with_baseline
                        FROM jin_reference
                        WHERE endpoint_path = ?
                        """,
                        [endpoint_path],
                    ).fetchone()
            else:
                endpoint_rows = conn.execute(
                    """
                    SELECT
                      COUNT(*) AS total_reference_rows,
                      COUNT(DISTINCT grain_key) AS grains_with_baseline,
                      COUNT(DISTINCT kpi_field) AS kpis_with_baseline
                    FROM jin_reference
                    WHERE endpoint_path = ?
                    """,
                    [endpoint_path],
                ).fetchone()
        except Exception:
            return summary
        finally:
            if close_conn and conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

        return {
            "endpoint_path": endpoint_path,
            "total_reference_rows": int(endpoint_rows[0] or 0) if endpoint_rows else 0,
            "grains_with_baseline": int(endpoint_rows[1] or 0) if endpoint_rows else 0,
            "kpis_with_baseline": int(endpoint_rows[2] or 0) if endpoint_rows else 0,
        }

    def project_health_payload(
        project_id: str | None = None,
        *,
        status_payload: dict[str, object] | None = None,
    ) -> dict[str, object]:
        if project_id is None:
            project = middleware.resolve_project(current_project_id())
            computed_status_payload = status_payload or status_payload_native_or_runtime()
        else:
            project = resolve_project_or_404(project_id)
            computed_status_payload = status_payload or status_payload_for_project(project_id)
        is_current = is_current_project(project)
        summary = (
            computed_status_payload.get("summary", {})
            if isinstance(computed_status_payload, dict)
            else {}
        )
        scheduler_jobs = middleware.scheduler_snapshot() if is_current else []
        scheduler_summary = {
            "total_jobs": len(scheduler_jobs),
            "paused_jobs": sum(1 for item in scheduler_jobs if item.get("paused")),
            "failing_jobs": sum(1 for item in scheduler_jobs if item.get("last_status") == "error"),
            "skipped_jobs": sum(1 for item in scheduler_jobs if item.get("last_status") == "skipped"),
        }
        baseline_summary = baseline_coverage_summary(
            db_path=str(project.get("db_path") or ""),
            endpoint_count_hint=int(summary.get("total_endpoints", 0) or 0),
        )
        recent_errors = middleware.dashboard_context().get("recent_errors", []) if is_current else []
        open_errors = sum(1 for item in recent_errors if item.get("status") != "archived")
        anomaly_count = int(summary.get("anomalies", 0) or 0)

        health_status = "healthy"
        if anomaly_count > 0 or scheduler_summary["failing_jobs"] > 0 or open_errors > 0:
            health_status = "degraded"
        checks = [
            {
                "name": "monitoring",
                "status": "pass" if scheduler_summary["failing_jobs"] == 0 else "fail",
                "detail": f"{scheduler_summary['total_jobs']} jobs, {scheduler_summary['failing_jobs']} failing",
            },
            {
                "name": "baseline_coverage",
                "status": "pass" if float(baseline_summary.get("coverage_pct", 0.0)) >= 70.0 else "warn",
                "detail": f"{baseline_summary.get('endpoints_with_baseline', 0)} endpoints with baseline",
            },
            {
                "name": "active_anomalies",
                "status": "pass" if anomaly_count == 0 else "warn",
                "detail": f"{anomaly_count} active anomalies",
            },
            {
                "name": "operator_errors",
                "status": "pass" if open_errors == 0 else "warn",
                "detail": f"{open_errors} open recent errors",
            },
        ]
        return {
            "generated_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "),
            "status": health_status,
            "summary": summary,
            "baseline": baseline_summary,
            "scheduler": scheduler_summary,
            "checks": checks,
            "project": project_context_for_status(project, normalize_status_summary(summary, computed_status_payload.get("endpoints"))),
        }

    def active_issue_rows_for_project(
        project: dict[str, object],
        *,
        endpoint_path: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, object]]:
        selected_db_path = str(project.get("db_path") or middleware.db_path)
        current_project = is_current_project(project)
        rows: list[dict[str, object]] = []

        if issues_list is not None:
            try:
                issue_rows = json.loads(call_native(issues_list, selected_db_path, endpoint_path, "active"))
                if isinstance(issue_rows, list):
                    rows = [item for item in issue_rows if isinstance(item, dict)]
            except Exception:
                rows = []
        if not rows:
            try:
                rows = load_anomaly_rows(endpoint_path, include_resolved=False, db_path=selected_db_path)
            except Exception:
                rows = []

        normalized_rows: list[dict[str, object]] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            payload = dict(row)
            payload["status"] = incident_status_for(
                bool(payload.get("is_active", True)),
                str(payload.get("incident_status") or payload.get("status") or "active"),
                payload.get("snoozed_until"),
                payload.get("suppressed_until"),
            )
            if payload.get("status") == "resolved":
                continue
            if endpoint_path and str(payload.get("endpoint_path") or "") != endpoint_path:
                continue
            normalized_rows.append(payload)

        if not current_project:
            normalized_rows.sort(
                key=lambda item: str(item.get("detected_at") or item.get("resolved_at") or ""),
                reverse=True,
            )
            return normalized_rows[: max(int(limit), 1)]

        if endpoint_path is not None:
            ensure_runtime_upload_issues_loaded(endpoint_path)
        else:
            for path in middleware.endpoint_registry.keys():
                ensure_runtime_upload_issues_loaded(path)

        runtime_rows = [
            item
            for item in runtime_enriched_anomalies(True)
            if item.get("status") != "resolved"
            and (endpoint_path is None or str(item.get("endpoint_path") or "") == endpoint_path)
            and str(item.get("detection_method") or "") == "upload_validation"
        ]
        if not runtime_rows:
            normalized_rows.sort(
                key=lambda item: str(item.get("detected_at") or item.get("resolved_at") or ""),
                reverse=True,
            )
            return normalized_rows[: max(int(limit), 1)]

        seen = {
            (
                str(item.get("endpoint_path") or ""),
                str(item.get("grain_key") or ""),
                str(item.get("kpi_field") or ""),
                str(item.get("detected_at") or ""),
                str(item.get("detection_method") or ""),
            )
            for item in normalized_rows
        }
        merged = list(normalized_rows)
        for item in runtime_rows:
            key = (
                str(item.get("endpoint_path") or ""),
                str(item.get("grain_key") or ""),
                str(item.get("kpi_field") or ""),
                str(item.get("detected_at") or ""),
                str(item.get("detection_method") or ""),
            )
            if key in seen:
                continue
            merged.append(item)
            seen.add(key)
        merged.sort(
            key=lambda item: str(item.get("detected_at") or item.get("resolved_at") or ""),
            reverse=True,
        )
        return merged[: max(int(limit), 1)]

    def annotate_monitoring_runs_with_active_issues(
        project: dict[str, object],
        endpoint_path: str,
        runs: list[dict[str, object]],
        *,
        upload_analysis: dict[str, object] | None = None,
    ) -> list[dict[str, object]]:
        if not runs:
            return []
        active_issues = active_issue_rows_for_project(project, endpoint_path=endpoint_path, limit=500)
        active_count = len(active_issues)
        first_detected_at = None
        status_reason = "active_issues"
        if active_count <= 0:
            analysis_count = upload_analysis_issue_count(upload_analysis)
            if analysis_count <= 0:
                return [dict(item) for item in runs if isinstance(item, dict)]
            active_count = analysis_count
            first_detected_at = parse_dt((upload_analysis or {}).get("analyzed_at"))
            status_reason = "upload_mismatch"
        issue_detected_times = [
            parse_dt(item.get("detected_at"))
            for item in active_issues
            if isinstance(item, dict)
        ]
        if first_detected_at is None:
            parsed_times = [value for value in issue_detected_times if value is not None]
            first_detected_at = min(parsed_times) if parsed_times else None
        annotated: list[dict[str, object]] = []
        for item in runs:
            if not isinstance(item, dict):
                continue
            row = dict(item)
            started_at = parse_dt(row.get("started_at")) or parse_dt(row.get("finished_at"))
            issue_applies = (
                first_detected_at is None
                or started_at is None
                or started_at >= first_detected_at
            )
            anomalies = int(row.get("anomalies_detected") or 0)
            row["open_issues"] = active_count
            if issue_applies and anomalies < active_count:
                row["anomalies_detected"] = active_count
                if str(row.get("status") or "").lower() == "success":
                    row["status"] = "degraded"
                    row["status_reason"] = status_reason
            annotated.append(row)
        return annotated

    def list_project_check_runs(
        project: dict[str, object],
        *,
        limit: int = 200,
        days: int | None = None,
    ) -> list[dict[str, object]]:
        selected_db_path = str(project.get("db_path") or middleware.db_path)
        max_rows = max(int(limit), 1)
        current_project = is_current_project(project)
        rows: list[dict[str, object]] = []

        if current_project:
            for endpoint_path in sorted(middleware.endpoint_registry.keys()):
                rows.extend(middleware.list_check_runs(endpoint_path, limit=max_rows))
        else:
            if duckdb is None:  # pragma: no cover
                return []
            conn = None
            try:
                conn = duckdb.connect(selected_db_path)
                raw_rows = conn.execute(
                    """
                    SELECT
                        run_id,
                        endpoint_path,
                        job_id,
                        trigger,
                        source,
                        status,
                        CAST(started_at AS VARCHAR),
                        CAST(finished_at AS VARCHAR),
                        duration_ms,
                        grains_processed,
                        anomalies_detected,
                        error
                    FROM jin_check_runs
                    ORDER BY COALESCE(started_at, created_at) DESC, id DESC
                    LIMIT ?
                    """,
                    [max_rows],
                ).fetchall()
            except Exception:
                raw_rows = []
            finally:
                if conn is not None:
                    try:
                        conn.close()
                    except Exception:
                        pass
            rows = [
                {
                    "run_id": row[0],
                    "endpoint_path": row[1],
                    "job_id": row[2],
                    "trigger": row[3] or "scheduler",
                    "source": row[4] or "watch",
                    "status": row[5] or "unknown",
                    "started_at": row[6],
                    "finished_at": row[7],
                    "duration_ms": row[8],
                    "grains_processed": row[9] or 0,
                    "anomalies_detected": row[10] or 0,
                    "error": row[11],
                }
                for row in raw_rows
            ]

        window_days = int(days) if days is not None else None
        if window_days is not None and window_days > 0:
            cutoff = now_naive() - timedelta(days=window_days)
            filtered: list[dict[str, object]] = []
            for row in rows:
                started_at = parse_dt(row.get("started_at"))
                if started_at is None:
                    continue
                if started_at < cutoff:
                    continue
                filtered.append(row)
            rows = filtered

        rows.sort(key=lambda item: str(item.get("started_at") or ""), reverse=True)
        deduped: list[dict[str, object]] = []
        seen_run_ids: set[str] = set()
        for row in rows:
            run_id = str(row.get("run_id") or "")
            if run_id and run_id in seen_run_ids:
                continue
            if run_id:
                seen_run_ids.add(run_id)
            deduped.append(row)
        return deduped[:max_rows]

    def executive_markdown_report(payload: dict[str, object]) -> str:
        summary = payload.get("summary", {}) if isinstance(payload, dict) else {}
        scheduler = payload.get("scheduler", {}) if isinstance(payload, dict) else {}
        baseline = payload.get("baseline", {}) if isinstance(payload, dict) else {}
        active_anomalies = int(summary.get("anomalies", 0) or 0)
        lines = [
            f"# Jin Executive Summary ({payload.get('generated_at')})",
            "",
            f"- Project: {payload.get('project', {}).get('name', 'unknown')}",
            f"- Overall status: {payload.get('status', 'unknown')}",
            f"- Endpoints monitored: {summary.get('total_endpoints', 0)}",
            f"- Healthy endpoints: {summary.get('healthy', 0)}",
            f"- Active anomalies: {active_anomalies}",
            f"- Unconfirmed endpoints: {summary.get('unconfirmed', 0)}",
            f"- Baseline coverage: {baseline.get('coverage_pct', 0.0)}%",
            f"- Scheduler jobs: {scheduler.get('total_jobs', 0)} total / {scheduler.get('failing_jobs', 0)} failing",
            "",
            "## Checks",
        ]
        for check in payload.get("checks", []):
            if isinstance(check, dict):
                lines.append(f"- {check.get('name')}: {check.get('status')} ({check.get('detail')})")
        return "\n".join(lines)

    def executive_digest_markdown_report(payload: dict[str, object]) -> str:
        totals = payload.get("totals", {}) if isinstance(payload, dict) else {}
        lines = [
            f"# Jin Executive Digest ({payload.get('generated_at')})",
            "",
            f"- Window: last {payload.get('window_days', 7)} day(s)",
            f"- Total bundle runs: {totals.get('runs', 0)}",
            f"- Success runs: {totals.get('success', 0)}",
            f"- Degraded runs: {totals.get('degraded', 0)}",
            f"- Not executable runs: {totals.get('not_executable', 0)}",
            f"- Total requested endpoints: {totals.get('requested', 0)}",
            f"- Total executed endpoints: {totals.get('executed', 0)}",
            f"- Total execution errors: {totals.get('errors', 0)}",
            "",
            "## By Project",
        ]
        projects = payload.get("projects", [])
        if isinstance(projects, list) and projects:
            for row in projects:
                if not isinstance(row, dict):
                    continue
                lines.append(
                    f"- {row.get('project_name', 'unknown')}: runs={row.get('runs', 0)}, "
                    f"success={row.get('success', 0)}, degraded={row.get('degraded', 0)}, "
                    f"errors={row.get('errors', 0)}, last_run={row.get('last_run_at')}"
                )
        else:
            lines.append("- No bundle runs found in this window.")

        lines.append("")
        lines.append("## Recent Runs")
        recent_runs = payload.get("recent_runs", [])
        if isinstance(recent_runs, list) and recent_runs:
            for row in recent_runs[:10]:
                if not isinstance(row, dict):
                    continue
                lines.append(
                    f"- {row.get('project_name', 'unknown')} / {row.get('run_id', 'unknown')}: "
                    f"{row.get('status')} (requested={row.get('requested', 0)}, "
                    f"executed={row.get('executed', 0)}, errors={row.get('errors', 0)})"
                )
        else:
            lines.append("- No recent runs to display.")
        return "\n".join(lines)

    def endpoint_markdown_report(payload: dict[str, object]) -> str:
        endpoint_path = payload.get("endpoint_path", "unknown")
        lines = [
            f"# Jin Endpoint Report: {endpoint_path}",
            "",
            f"- Generated at: {payload.get('generated_at')}",
            f"- HTTP method: {payload.get('http_method', 'GET')}",
            f"- Baseline rows: {payload.get('baseline', {}).get('total_reference_rows', 0)}",
            f"- Baseline grains: {payload.get('baseline', {}).get('grains_with_baseline', 0)}",
            f"- Active anomalies: {payload.get('anomaly_count', 0)}",
            "",
            "## KPI Snapshot",
        ]
        current_kpis = payload.get("current_kpis", [])
        for item in current_kpis:
            if isinstance(item, dict):
                lines.append(
                    f"- {item.get('kpi_field')}: actual {item.get('actual_value')} baseline {item.get('expected_value')}"
                )
        if not current_kpis:
            lines.append("- No KPI snapshot available yet.")
        return "\n".join(lines)

    def bundle_markdown_report(payload: dict[str, object]) -> str:
        lines = [
            f"# Jin Bundle Run Report ({payload.get('run_id', 'unknown')})",
            "",
            f"- Project: {payload.get('project_name', 'unknown')}",
            f"- Started at: {payload.get('started_at')}",
            f"- Finished at: {payload.get('finished_at')}",
            f"- Status: {payload.get('status')}",
            f"- Requested endpoints: {payload.get('requested', 0)}",
            f"- Executed endpoints: {payload.get('executed', 0)}",
            f"- Successes: {payload.get('success', 0)}",
            f"- Errors: {payload.get('errors', 0)}",
            f"- Not scheduled: {payload.get('not_scheduled', 0)}",
            "",
            "## Endpoint Results",
        ]
        for row in payload.get("results", []):
            if isinstance(row, dict):
                lines.append(
                    f"- {row.get('endpoint_path')}: {row.get('status')} "
                    f"(job_id={row.get('job_id')}, error={row.get('error')})"
                )
        return "\n".join(lines)

    @router.get("/login", response_class=HTMLResponse)
    async def login(
        request: Request = None,
        next: str = "/jin",
        logged_out: bool = False,
    ) -> Response:
        if middleware.is_authenticated(request=request) and not logged_out:
            return RedirectResponse(url="/jin", status_code=303)
        banner = None
        if logged_out:
            banner = "You are signed out."
        elif not middleware.is_auth_enabled():
            banner = "Dashboard login is not configured for this project."
        return HTMLResponse(login_page(banner, next_path=next), headers={"Cache-Control": "no-store"})

    @router.post("/login", response_class=HTMLResponse)
    async def login_submit(request: Request) -> Response:
        form = await request.form()
        username = str(form.get("username") or "")
        password = str(form.get("password") or "")
        next_path = str(form.get("next") or "/jin")
        if not middleware.authenticate_credentials(username, password):
            return HTMLResponse(login_page("Invalid username or password.", next_path=next_path), status_code=401)
        response = RedirectResponse(
            url=next_path if next_path.startswith("/jin") else "/jin",
            status_code=303,
        )
        response.set_cookie(
            value=middleware.create_session_token(username),
            **middleware.session_cookie_settings(request),
        )
        response.headers["Cache-Control"] = "no-store"
        return response

    @router.get("/logout")
    @router.post("/logout")
    async def logout(request: Request) -> Response:
        response = RedirectResponse(url="/jin/login?logged_out=1", status_code=303)
        cookie_settings = middleware.session_cookie_settings(request)
        clear_paths = [str(cookie_settings.get("path") or "/jin"), "/"]
        seen_paths: set[str] = set()
        for path in clear_paths:
            if path in seen_paths:
                continue
            seen_paths.add(path)
            response.delete_cookie(
                middleware.auth_session_cookie,
                path=path,
                samesite=cookie_settings["samesite"],
                secure=cookie_settings["secure"],
            )
        response.headers["Cache-Control"] = "no-store"
        return response

    @router.get("", response_class=HTMLResponse)
    async def dashboard(request: Request = None) -> Response:
        auth_response = require_auth(request)
        if auth_response is not None:
            return auth_response
        return HTMLResponse(
            render_dashboard(middleware._is_maintainer_ui_enabled()),
            headers={"Cache-Control": "no-store"},
        )

    @router.get("/po", response_class=HTMLResponse)
    @router.get("/po/docs", response_class=HTMLResponse)
    async def po_dashboard(request: Request = None) -> Response:
        require_maintainer_ui()
        auth_response = require_auth(request)
        if auth_response is not None:
            return auth_response
        return RedirectResponse(url="/jin?y_view=playbook", status_code=303)

    @router.get("/assets/{asset_name}")
    async def dashboard_asset(asset_name: str, request: Request = None) -> Response:
        auth_response = require_auth(request)
        if auth_response is not None:
            return auth_response
        media_types = {
            "dashboard.css": "text/css; charset=utf-8",
            "dashboard.js": "application/javascript; charset=utf-8",
        }
        if asset_name not in media_types:
            raise HTTPException(status_code=404, detail="Asset not found")
        asset_path = static_dir / "generated" / asset_name
        if not asset_path.exists():
            raise HTTPException(status_code=404, detail="Asset not found")
        response = FileResponse(asset_path, media_type=media_types[asset_name])
        response.headers["Cache-Control"] = "no-store"
        return response

    @router.get("/api/status")
    @router.get("/api/v2/status")
    async def status(request: Request = None, project_id: str | None = None) -> JSONResponse:
        require_auth(request, api=True)
        safe_mode = request_prefers_safe_mode(request)
        token = set_native_reads(False) if safe_mode else None
        try:
            return with_api_version_headers(
                JSONResponse(status_payload_for_project(project_id, prefer_runtime=safe_mode)),
                request,
            )
        except HTTPException:
            raise
        except Exception as exc:
            record_router_error(
                "router.status",
                "Falling back to runtime status after native status retrieval failed.",
                detail=str(exc),
                hint="Check the native extension and DuckDB state for this project.",
            )
            return with_api_version_headers(JSONResponse(load_runtime_status()), request)
        finally:
            if token is not None:
                reset_native_reads(token)

    @router.get("/api/health")
    @router.get("/api/health-check")
    @router.get("/api/v2/health")
    @router.get("/api/v2/health-check")
    async def health_check(request: Request = None, project_id: str | None = None) -> JSONResponse:
        require_auth(request, api=True)
        return with_api_version_headers(JSONResponse(project_health_payload(project_id)), request)

    @router.post("/api/register")
    @router.post("/api/projects/register")
    @router.post("/api/v2/projects/register")
    async def register(request: Request) -> JSONResponse:
        require_maintainer_ui()
        if middleware.is_auth_enabled():
            require_auth(request, api=True)
        payload = await request.json()
        try:
            result = middleware.register_operator(
                project_name=payload.get("project_name"),
                username=payload.get("username"),
                password=payload.get("password"),
                disable_auth=bool(payload.get("disable_auth", False)),
                write_env=bool(payload.get("write_env", False)),
                monitor_policy=payload.get("monitor_policy") if isinstance(payload, dict) else None,
                bootstrap_monitoring=bool(payload.get("bootstrap_monitoring", True)),
                overwrite_existing_schedule=payload.get("overwrite_existing_schedule")
                if isinstance(payload, dict)
                else None,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        response = JSONResponse({"ok": True, **result})
        if (
            result.get("auth_enabled")
            and isinstance(payload, dict)
            and isinstance(payload.get("username"), str)
            and isinstance(payload.get("password"), str)
        ):
            session_username = str(payload.get("username") or "").strip()
            session_password = str(payload.get("password") or "")
            if (
                session_username
                and session_password
                and middleware.authenticate_credentials(session_username, session_password)
            ):
                response.set_cookie(
                    value=middleware.create_session_token(session_username),
                    **middleware.session_cookie_settings(request),
                )
        return with_api_version_headers(response, request)

    @router.get("/api/projects")
    @router.get("/api/v2/projects")
    async def list_projects(request: Request = None, include_archived: bool = False) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        try:
            middleware.add_project_to_catalog(middleware.project_name, source="runtime")
        except ValueError:
            pass
        projects = middleware.list_projects_catalog(include_archived=include_archived)
        active = middleware.resolve_project()
        return with_api_version_headers(
            JSONResponse(
            {
                "projects": projects,
                "active_project": str(active.get("name") or middleware.project_name),
                "active_project_id": active.get("id"),
                "count": len(projects),
            }
            ),
            request,
        )

    @router.post("/api/projects")
    @router.post("/api/v2/projects")
    async def add_project(request: Request) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        payload = await request.json()
        try:
            project = middleware.add_project_to_catalog(
                str(payload.get("name") or ""),
                root=payload.get("root"),
                db_path=payload.get("db_path"),
                source="api",
            )
            monitor_policy_payload = None
            if isinstance(payload, dict) and isinstance(payload.get("monitor_policy"), dict):
                monitor_policy_payload = middleware.set_project_monitor_policy(
                    str(project.get("id") or ""),
                    payload.get("monitor_policy"),
                )["monitor_policy"]
            else:
                monitor_policy_payload = middleware.project_monitor_policy(str(project.get("id") or ""))
            monitor_bootstrap = None
            if bool(payload.get("bootstrap_monitoring", True)):
                overwrite_existing_schedule = bool(
                    payload.get(
                        "overwrite_existing_schedule",
                        isinstance(payload.get("monitor_policy"), dict),
                    )
                )
                monitor_bootstrap = middleware.apply_project_monitor_policy(
                    str(project.get("id") or ""),
                    overwrite_existing_schedule=overwrite_existing_schedule,
                )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return with_api_version_headers(
            JSONResponse(
            {
                "ok": True,
                "project": project,
                "monitor_policy": monitor_policy_payload,
                "monitor_bootstrap": monitor_bootstrap,
            }
            ),
            request,
        )

    @router.get("/api/projects/active")
    @router.get("/api/projects/current")
    @router.get("/api/v2/projects/current")
    async def active_project(request: Request = None) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        project = middleware.resolve_project()
        return with_api_version_headers(JSONResponse({"project": project}), request)

    @router.post("/api/projects/select")
    @router.post("/api/projects/activate")
    @router.post("/api/v2/projects/activate")
    async def select_project(request: Request) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        payload = await request.json()
        project_id = str(payload.get("project_id") or "").strip()
        if not project_id:
            raise HTTPException(status_code=400, detail="project_id is required")
        try:
            selected = middleware.set_active_project(project_id)
        except ValueError as exc:
            message = str(exc)
            status_code = 404 if message == "project not found" else 400
            raise HTTPException(status_code=status_code, detail=message) from exc
        return with_api_version_headers(JSONResponse({"ok": True, "project": selected}), request)

    @router.post("/api/projects/{project_id}/archive")
    @router.post("/api/v2/projects/{project_id}/archive")
    async def archive_project(project_id: str, request: Request = None) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        try:
            project = middleware.archive_project_in_catalog(project_id)
        except ValueError as exc:
            message = str(exc)
            status_code = 404 if message == "project not found" else 400
            raise HTTPException(status_code=status_code, detail=message) from exc
        active = middleware.resolve_project()
        projects = middleware.list_projects_catalog(include_archived=True)
        return with_api_version_headers(
            JSONResponse(
                {
                    "ok": True,
                    "project": project,
                    "projects": projects,
                    "active_project_id": active.get("id"),
                }
            ),
            request,
        )

    @router.post("/api/projects/{project_id}/restore")
    @router.post("/api/v2/projects/{project_id}/restore")
    async def restore_project(project_id: str, request: Request = None) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        try:
            project = middleware.restore_project_in_catalog(project_id)
        except ValueError as exc:
            message = str(exc)
            status_code = 404 if message == "project not found" else 400
            raise HTTPException(status_code=status_code, detail=message) from exc
        active = middleware.resolve_project()
        projects = middleware.list_projects_catalog(include_archived=True)
        return with_api_version_headers(
            JSONResponse(
                {
                    "ok": True,
                    "project": project,
                    "projects": projects,
                    "active_project_id": active.get("id"),
                }
            ),
            request,
        )

    @router.delete("/api/projects/{project_id}")
    @router.delete("/api/v2/projects/{project_id}")
    async def delete_project(project_id: str, request: Request = None, force: bool = False) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        try:
            deleted = middleware.delete_project_from_catalog(project_id, force=force)
        except ValueError as exc:
            message = str(exc)
            status_code = 404 if message == "project not found" else 400
            raise HTTPException(status_code=status_code, detail=message) from exc
        active = middleware.resolve_project()
        projects = middleware.list_projects_catalog(include_archived=True)
        return with_api_version_headers(
            JSONResponse(
                {
                    "ok": True,
                    "deleted_project": deleted,
                    "projects": projects,
                    "active_project_id": active.get("id"),
                }
            ),
            request,
        )

    @router.get("/api/projects/{project_id}/monitor-policy")
    @router.get("/api/projects/{project_id}/check-plan")
    @router.get("/api/v2/projects/{project_id}/check-plan")
    async def get_project_monitor_policy(project_id: str, request: Request = None) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        project = resolve_project_or_404(project_id)
        try:
            policy = middleware.project_monitor_policy(project_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return with_api_version_headers(JSONResponse({"project": project, "monitor_policy": policy}), request)

    @router.post("/api/projects/{project_id}/monitor-policy")
    @router.post("/api/projects/{project_id}/check-plan")
    @router.post("/api/v2/projects/{project_id}/check-plan")
    async def set_project_monitor_policy(project_id: str, request: Request) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        payload = await request.json()
        try:
            result = middleware.set_project_monitor_policy(project_id, payload if isinstance(payload, dict) else {})
        except ValueError as exc:
            detail = str(exc)
            if detail == "project not found":
                raise HTTPException(status_code=404, detail=detail) from exc
            raise HTTPException(status_code=400, detail=detail) from exc
        return with_api_version_headers(JSONResponse({"ok": True, **result}), request)

    @router.post("/api/projects/{project_id}/monitor-policy/apply")
    @router.post("/api/projects/{project_id}/check-plan/apply")
    @router.post("/api/v2/projects/{project_id}/check-plan/apply")
    async def apply_project_monitor_policy(project_id: str, request: Request) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        payload: dict[str, object] = {}
        try:
            raw = await request.json()
            if isinstance(raw, dict):
                payload = raw
        except Exception:
            payload = {}
        endpoint_rows = payload.get("endpoint_paths")
        endpoint_paths = endpoint_rows if isinstance(endpoint_rows, list) else None
        overwrite_existing_schedule = bool(payload.get("overwrite_existing_schedule", True))
        try:
            result = middleware.apply_project_monitor_policy(
                project_id,
                endpoint_paths=endpoint_paths,
                overwrite_existing_schedule=overwrite_existing_schedule,
            )
        except ValueError as exc:
            detail = str(exc)
            if detail == "project not found":
                raise HTTPException(status_code=404, detail=detail) from exc
            raise HTTPException(status_code=400, detail=detail) from exc
        return with_api_version_headers(JSONResponse({"ok": True, **result}), request)

    @router.post("/api/projects/{project_id}/monitor-bootstrap")
    @router.post("/api/projects/{project_id}/check-plan/bootstrap")
    @router.post("/api/v2/projects/{project_id}/check-plan/bootstrap")
    async def bootstrap_project_monitoring(project_id: str, request: Request) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        payload: dict[str, object] = {}
        try:
            raw = await request.json()
            if isinstance(raw, dict):
                payload = raw
        except Exception:
            payload = {}
        endpoint_rows = payload.get("endpoint_paths")
        endpoint_paths = endpoint_rows if isinstance(endpoint_rows, list) else None
        overwrite_existing_schedule = bool(payload.get("overwrite_existing_schedule", False))
        try:
            result = middleware.apply_project_monitor_policy(
                project_id,
                endpoint_paths=endpoint_paths,
                overwrite_existing_schedule=overwrite_existing_schedule,
            )
        except ValueError as exc:
            detail = str(exc)
            if detail == "project not found":
                raise HTTPException(status_code=404, detail=detail) from exc
            raise HTTPException(status_code=400, detail=detail) from exc
        return with_api_version_headers(JSONResponse({"ok": True, "mode": "bootstrap", **result}), request)

    @router.post("/api/projects/{project_id}/run-bundle")
    @router.post("/api/projects/{project_id}/checks/run")
    @router.post("/api/v2/projects/{project_id}/checks/run")
    async def run_project_bundle(project_id: str, request: Request) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        payload: dict[str, object] = {}
        try:
            raw = await request.json()
            if isinstance(raw, dict):
                payload = raw
        except Exception:
            payload = {}

        endpoint_rows = payload.get("endpoint_paths")
        if isinstance(endpoint_rows, list):
            endpoint_paths = [
                str(item).strip()
                for item in endpoint_rows
                if isinstance(item, str) and str(item).strip()
            ]
        else:
            endpoint_paths = None
        try:
            artifact = await middleware.run_project_bundle(
                project_id,
                endpoint_paths=endpoint_paths,
                trigger="manual",
            )
        except ValueError as exc:
            detail = str(exc)
            if detail == "project not found":
                raise HTTPException(status_code=404, detail=detail) from exc
            raise HTTPException(status_code=400, detail=detail) from exc
        return with_api_version_headers(JSONResponse(artifact), request)

    @router.get("/api/projects/{project_id}/run-bundle/history")
    async def run_project_bundle_history(
        project_id: str,
        request: Request = None,
        limit: int = 20,
    ) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        project = resolve_project_or_404(project_id)
        rows = middleware.list_bundle_runs(str(project.get("id") or ""), limit=max(limit, 1))
        return with_api_version_headers(
            JSONResponse(
            {
                "project": project,
                "count": len(rows),
                "runs": rows,
                "source": "bundle_runs",
            }
            ),
            request,
        )

    @router.get("/api/projects/{project_id}/checks/history")
    @router.get("/api/v2/projects/{project_id}/checks/history")
    async def project_checks_history(
        project_id: str,
        request: Request = None,
        limit: int = 20,
    ) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        project = resolve_project_or_404(project_id)
        bundle_rows = middleware.list_bundle_runs(str(project.get("id") or ""), limit=max(limit, 1))
        check_rows = list_project_check_runs(project, limit=max(limit, 1))

        merged: list[dict[str, object]] = []
        seen_keys: set[tuple[str, str]] = set()
        for row in [*bundle_rows, *check_rows]:
            if not isinstance(row, dict):
                continue
            run_id = str(row.get("run_id") or "")
            started_at = str(row.get("started_at") or "")
            key = (run_id, started_at)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            merged.append(row)
        merged.sort(key=lambda item: str(item.get("started_at") or ""), reverse=True)
        merged = merged[: max(limit, 1)]

        source = "bundle_runs" if merged and all(
            str(item.get("run_id") or "").startswith("bundle-") for item in merged
        ) else "mixed"
        if not merged and check_rows:
            source = "check_runs"
        elif not merged and bundle_rows:
            source = "bundle_runs"
        elif merged and all(str(item.get("run_id") or "").startswith("check-") for item in merged):
            source = "check_runs"

        return with_api_version_headers(
            JSONResponse(
                {
                    "project": project,
                    "count": len(merged),
                    "runs": merged,
                    "source": source,
                    "bundle_runs_count": len(bundle_rows),
                    "check_runs_count": len(check_rows),
                }
            ),
            request,
        )

    @router.get("/api/projects/{project_id}/run-bundle/{run_id}")
    @router.get("/api/projects/{project_id}/checks/{run_id}")
    @router.get("/api/v2/projects/{project_id}/checks/{run_id}")
    async def run_project_bundle_detail(project_id: str, run_id: str, request: Request = None) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        project = resolve_project_or_404(project_id)
        rows = middleware.list_bundle_runs(str(project.get("id") or ""), limit=200)
        row = next((item for item in rows if str(item.get("run_id") or "") == str(run_id)), None)
        if row is None:
            raise HTTPException(status_code=404, detail="Bundle run not found")
        return with_api_version_headers(JSONResponse({"project": project, "run": row}), request)

    @router.get("/api/projects/{project_id}/run-bundle/{run_id}/report")
    @router.get("/api/projects/{project_id}/checks/{run_id}/report")
    @router.get("/api/v2/projects/{project_id}/checks/{run_id}/report")
    async def run_project_bundle_report(
        project_id: str,
        run_id: str,
        request: Request = None,
        format: str = "json",
    ) -> Response:
        require_maintainer_ui()
        require_auth(request, api=True)
        project = resolve_project_or_404(project_id)
        rows = middleware.list_bundle_runs(str(project.get("id") or ""), limit=200)
        row = next((item for item in rows if str(item.get("run_id") or "") == str(run_id)), None)
        if row is None:
            raise HTTPException(status_code=404, detail="Bundle run not found")
        report_format = str(format or "json").strip().lower()
        if report_format == "markdown":
            markdown = row.get("report_markdown") or bundle_markdown_report(row)
            return with_api_version_headers(Response(str(markdown), media_type="text/markdown; charset=utf-8"), request)
        return with_api_version_headers(JSONResponse({"project": project, "run": row}), request)

    @router.get("/api/projects/monitor")
    @router.get("/api/portfolio/health")
    @router.get("/api/v2/portfolio/health")
    async def monitor_projects(request: Request = None) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        snapshots: list[dict[str, object]] = []
        total_projects = 0
        active_projects = 0
        healthy_projects = 0
        degraded_projects = 0
        projects_with_baseline = 0
        projects_without_baseline = 0
        total_anomalies = 0
        total_unconfirmed = 0
        risk_scores: list[float] = []
        top_risk_project: dict[str, object] | None = None

        def project_risk_snapshot(
            project_id: str,
            project_name: str | None,
            health_payload: dict[str, object],
        ) -> dict[str, object]:
            summary = health_payload.get("summary", {}) if isinstance(health_payload, dict) else {}
            baseline = health_payload.get("baseline", {}) if isinstance(health_payload, dict) else {}
            scheduler = health_payload.get("scheduler", {}) if isinstance(health_payload, dict) else {}
            status = str(health_payload.get("status") or "unknown")
            anomaly_count = int(summary.get("anomalies", 0) or 0)
            unconfirmed_count = int(summary.get("unconfirmed", 0) or 0)
            coverage_pct = float(baseline.get("coverage_pct", 0.0) or 0.0)
            failing_jobs = int(scheduler.get("failing_jobs", 0) or 0)
            skipped_jobs = int(scheduler.get("skipped_jobs", 0) or 0)
            risk_score = 0.0
            risk_reasons: list[str] = []

            if anomaly_count:
                anomaly_risk = min(40.0, float(anomaly_count) * 12.0)
                risk_score += anomaly_risk
                risk_reasons.append(f"{anomaly_count} active anomal{'ies' if anomaly_count != 1 else 'y'}")
            if unconfirmed_count:
                unconfirmed_risk = min(20.0, float(unconfirmed_count) * 8.0)
                risk_score += unconfirmed_risk
                risk_reasons.append(f"{unconfirmed_count} unconfirmed result{'s' if unconfirmed_count != 1 else ''}")
            if coverage_pct < 70.0:
                coverage_risk = min(20.0, (70.0 - coverage_pct) * 0.6)
                risk_score += coverage_risk
                risk_reasons.append(f"baseline coverage {coverage_pct:.0f}%")
            if failing_jobs:
                job_risk = min(20.0, float(failing_jobs) * 10.0)
                risk_score += job_risk
                risk_reasons.append(f"{failing_jobs} failing watch job{'s' if failing_jobs != 1 else ''}")
            if skipped_jobs:
                risk_score += min(5.0, float(skipped_jobs) * 2.0)
            if status == "degraded":
                risk_score += 8.0
            elif status not in {"healthy", "unknown"}:
                risk_score += 4.0

            risk_score = round(min(100.0, risk_score), 1)
            risk_label = "stable"
            if risk_score >= 70.0:
                risk_label = "critical"
            elif risk_score >= 40.0:
                risk_label = "watch"
            elif status == "degraded":
                risk_label = "watch"

            return {
                "id": project_id,
                "name": project_name,
                "status": status,
                "risk_score": risk_score,
                "risk_label": risk_label,
                "risk_reasons": risk_reasons[:3],
                "coverage_pct": round(coverage_pct, 1),
                "anomalies": anomaly_count,
                "unconfirmed": unconfirmed_count,
            }

        for project in middleware.list_projects_catalog():
            project_id = str(project.get("id") or "")
            status_payload = status_payload_for_project(project_id)
            health_payload = project_health_payload(project_id, status_payload=status_payload)
            risk_snapshot = project_risk_snapshot(project_id, str(project.get("name") or ""), health_payload)
            total_projects += 1
            if bool(project.get("active")):
                active_projects += 1
            if str(health_payload.get("status") or "unknown") == "healthy":
                healthy_projects += 1
            else:
                degraded_projects += 1
            baseline_snapshot = health_payload.get("baseline", {})
            if isinstance(baseline_snapshot, dict) and float(baseline_snapshot.get("coverage_pct", 0.0) or 0.0) >= 70.0:
                projects_with_baseline += 1
            else:
                projects_without_baseline += 1
            summary_snapshot = health_payload.get("summary", {})
            if isinstance(summary_snapshot, dict):
                total_anomalies += int(summary_snapshot.get("anomalies", 0) or 0)
                total_unconfirmed += int(summary_snapshot.get("unconfirmed", 0) or 0)
            risk_scores.append(float(risk_snapshot.get("risk_score", 0.0) or 0.0))
            if top_risk_project is None or float(risk_snapshot.get("risk_score", 0.0) or 0.0) > float(top_risk_project.get("risk_score", 0.0) or 0.0):
                top_risk_project = dict(risk_snapshot)
            snapshots.append(
                {
                    "id": project_id,
                    "name": project.get("name"),
                    "root": project.get("root"),
                    "db_path": project.get("db_path"),
                    "active": bool(project.get("active")),
                    "status": health_payload.get("status"),
                    "risk_score": risk_snapshot.get("risk_score"),
                    "risk_label": risk_snapshot.get("risk_label"),
                    "risk_reasons": risk_snapshot.get("risk_reasons"),
                    "trust_score": max(0.0, 100.0 - float(risk_snapshot.get("risk_score", 0.0) or 0.0)),
                    "summary": health_payload.get("summary"),
                    "baseline": health_payload.get("baseline"),
                    "generated_at": health_payload.get("generated_at"),
                }
            )
        snapshots.sort(key=lambda item: (
            0 if item.get("active") else 1,
            float(item.get("risk_score", 0.0) or 0.0) * -1,
            str(item.get("name") or ""),
        ))
        average_risk_score = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0.0
        return with_api_version_headers(
            JSONResponse(
            {
                "generated_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "),
                "count": len(snapshots),
                "summary": {
                    "total_projects": total_projects,
                    "active_projects": active_projects,
                    "healthy_projects": healthy_projects,
                    "degraded_projects": degraded_projects,
                    "projects_with_baseline": projects_with_baseline,
                    "projects_without_baseline": projects_without_baseline,
                    "total_anomalies": total_anomalies,
                    "total_unconfirmed": total_unconfirmed,
                    "average_risk_score": average_risk_score,
                    "top_risk_project": top_risk_project,
                },
                "projects": snapshots,
            }
            ),
            request,
        )

    @router.post("/api/projects/{project_id}/baseline/promote")
    @router.post("/api/projects/{project_id}/baseline/refresh")
    @router.post("/api/v2/projects/{project_id}/baseline/refresh")
    async def promote_project_baseline(project_id: str, request: Request) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        project = resolve_project_or_404(project_id)
        db_path = str(project.get("db_path") or "").strip()
        if not db_path:
            raise HTTPException(status_code=400, detail="project db_path is required")
        if promote_baseline is None:
            return with_api_version_headers(
                JSONResponse(
                {
                    "ok": False,
                    "project": project,
                    "requested": 0,
                    "promoted": 0,
                    "results": [],
                    "message": "Native baseline promotion is unavailable in this runtime.",
                }
                ),
                request,
            )

        payload: dict[str, object] = {}
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        provided_endpoints = payload.get("endpoints") if isinstance(payload, dict) else None
        if isinstance(provided_endpoints, list):
            endpoint_paths = [
                str(item).strip()
                for item in provided_endpoints
                if isinstance(item, str) and str(item).strip()
            ]
        else:
            status_payload = status_payload_for_project(project_id)
            endpoint_rows = status_payload.get("endpoints", [])
            endpoint_paths = [
                str(item.get("endpoint_path")).strip()
                for item in endpoint_rows
                if isinstance(item, dict) and isinstance(item.get("endpoint_path"), str) and str(item.get("endpoint_path")).strip()
            ]

        results: list[dict[str, object]] = []
        promoted = 0
        for endpoint_path in endpoint_paths:
            try:
                native_result = json.loads(call_native(promote_baseline, db_path, endpoint_path))
                ok = bool(native_result.get("ok", True)) if isinstance(native_result, dict) else True
                if ok:
                    promoted += 1
                results.append(
                    {
                        "endpoint_path": endpoint_path,
                        "ok": ok,
                        "result": native_result if isinstance(native_result, dict) else {},
                    }
                )
            except Exception as exc:
                results.append({"endpoint_path": endpoint_path, "ok": False, "error": str(exc)})

        return with_api_version_headers(
            JSONResponse(
            {
                "ok": True,
                "project": project,
                "requested": len(endpoint_paths),
                "promoted": promoted,
                "results": results,
            }
            ),
            request,
        )

    @router.get("/api/watch-config/{path:path}")
    async def get_watch_config(path: str, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        record = endpoint_record_or_404(endpoint_path)
        return JSONResponse(
            {
                "endpoint_path": endpoint_path,
                "watch_config": record.watch_config or {},
                "supported_schedules": [
                    "every 2h",
                    "daily 09:00",
                    "weekly mon,fri 14:30",
                ],
                "supported_baseline_modes": ["fixed", "refresh_before_run"],
            }
        )

    @router.post("/api/watch-config/{path:path}")
    async def save_watch_config(path: str, request: Request) -> JSONResponse:
        require_auth(request, api=True)
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        endpoint_record_or_404(endpoint_path)
        payload = await request.json()
        try:
            watch_config = middleware.upsert_watch_config(endpoint_path, payload)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return JSONResponse({"ok": True, "endpoint_path": endpoint_path, "watch_config": watch_config})

    @router.get("/api/report/summary")
    @router.get("/api/reports/summary")
    @router.get("/api/v2/reports/summary")
    async def report_summary_api(
        request: Request = None,
        format: str = "json",
        project_id: str | None = None,
    ) -> Response:
        require_auth(request, api=True)
        project = middleware.resolve_project(current_project_id()) if project_id is None else resolve_project_or_404(project_id)
        health_payload = project_health_payload(project_id)
        selected_db_path = str(project.get("db_path") or middleware.db_path)
        active_anomalies = active_issue_rows_for_project(project, limit=20)
        report_payload: dict[str, object] = {
            "generated_at": health_payload["generated_at"],
            "project": health_payload["project"],
            "health": health_payload,
            "summary": health_payload["summary"],
            "scheduler": health_payload["scheduler"],
            "baseline": health_payload["baseline"],
            "active_anomalies": active_anomalies,
        }
        if report_summary is not None:
            try:
                report_payload["native_summary"] = json.loads(
                    call_native(report_summary, selected_db_path, str(project.get("name") or middleware.project_name))
                )
            except Exception:
                report_payload["native_summary"] = {}
        report_format = str(format or "json").strip().lower()
        if report_format == "markdown":
            return with_api_version_headers(
                Response(executive_markdown_report(health_payload), media_type="text/markdown; charset=utf-8"),
                request,
            )
        return with_api_version_headers(JSONResponse(jsonable_encoder(report_payload)), request)

    @router.get("/api/report/executive-digest")
    @router.get("/api/reports/leadership-digest")
    @router.get("/api/v2/reports/leadership-digest")
    async def report_executive_digest_api(
        request: Request = None,
        format: str = "json",
        days: int = 7,
        limit: int = 200,
        project_id: str | None = None,
    ) -> Response:
        require_maintainer_ui()
        require_auth(request, api=True)
        selected_project = (
            middleware.resolve_project(current_project_id())
            if project_id is None
            else resolve_project_or_404(project_id)
        )
        digest_payload = middleware.bundle_digest_payload(
            days=max(int(days), 1),
            project_ids=[project_id] if project_id else None,
            limit=max(min(int(limit), 500), 1),
        )
        digest_payload["project"] = selected_project
        active_issues = active_issue_rows_for_project(selected_project, limit=20)
        digest_payload["top_issues"] = active_issues
        digest_payload["open_issues"] = len(active_issues)

        totals = dict(digest_payload.get("totals") or {})
        if int(totals.get("runs") or 0) == 0:
            check_runs = list_project_check_runs(
                selected_project,
                limit=max(min(int(limit), 500), 1),
                days=max(int(days), 1),
            )
            success_runs = sum(
                1
                for row in check_runs
                if str(row.get("status") or "") == "success"
                and int(row.get("anomalies_detected") or 0) <= 0
            )
            degraded_runs = sum(
                1
                for row in check_runs
                if str(row.get("status") or "") == "success"
                and int(row.get("anomalies_detected") or 0) > 0
            )
            error_runs = sum(1 for row in check_runs if str(row.get("status") or "") == "error")
            runs_total = len(check_runs)
            if active_issues and degraded_runs <= 0:
                degraded_runs = 1
            totals.update(
                {
                    "runs": runs_total,
                    "success": success_runs,
                    "degraded": degraded_runs,
                    "not_scheduled": 0,
                    "not_executable": 0,
                    "requested": runs_total,
                    "executed": runs_total,
                    "errors": error_runs,
                }
            )
            digest_payload["totals"] = totals
            digest_payload["count"] = runs_total
            digest_payload["recent_runs"] = [
                {
                    "run_id": row.get("run_id"),
                    "project_id": selected_project.get("id"),
                    "project_name": selected_project.get("name"),
                    "status": row.get("status"),
                    "started_at": row.get("started_at"),
                    "finished_at": row.get("finished_at"),
                    "requested": 1,
                    "executed": 1,
                    "errors": 1 if str(row.get("status") or "") == "error" else 0,
                    "not_scheduled": 0,
                    "not_executable": 0,
                    "results": [
                        {
                            "endpoint_path": row.get("endpoint_path"),
                            "status": row.get("status"),
                            "error": row.get("error"),
                        }
                    ],
                }
                for row in check_runs
            ]
        if active_issues and int((digest_payload.get("totals") or {}).get("degraded") or 0) <= 0:
            totals = dict(digest_payload.get("totals") or {})
            totals["degraded"] = 1
            totals["runs"] = max(int(totals.get("runs") or 0), 1)
            digest_payload["totals"] = totals
        digest_payload["report_ready"] = bool(
            len(active_issues) == 0 and int((digest_payload.get("totals") or {}).get("errors") or 0) == 0
        )
        digest_payload["recommendation"] = (
            "Open Issues and resolve high-priority drift before sharing this digest."
            if active_issues
            else "No active issues detected in this window."
        )
        report_format = str(format or "json").strip().lower()
        if report_format == "markdown":
            return with_api_version_headers(
                Response(executive_digest_markdown_report(digest_payload), media_type="text/markdown; charset=utf-8"),
                request,
            )
        return with_api_version_headers(JSONResponse(jsonable_encoder(digest_payload)), request)

    @router.get("/api/report/endpoint/{path:path}")
    @router.get("/api/reports/endpoint/{path:path}")
    @router.get("/api/v2/reports/endpoint/{path:path}")
    async def endpoint_report_api(
        path: str,
        request: Request = None,
        format: str = "json",
        project_id: str | None = None,
    ) -> Response:
        require_auth(request, api=True)
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        project = middleware.resolve_project(current_project_id()) if project_id is None else resolve_project_or_404(project_id)
        selected_db_path = str(project.get("db_path") or middleware.db_path)
        current = is_current_project(project)
        record = endpoint_record_or_404(endpoint_path) if current else None
        if get_endpoint_detail is not None:
            try:
                detail_payload = json.loads(
                    call_native(
                        get_endpoint_detail,
                        selected_db_path,
                        endpoint_path,
                        250,
                        250,
                    )
                )
                endpoint_payload = detail_payload.get("endpoint") or {}
                current_kpis = detail_payload.get("current_kpis") or []
                anomaly_count = len(detail_payload.get("anomalies") or [])
            except Exception:
                endpoint_payload = {}
                current_kpis = []
                anomaly_count = 0
        else:
            endpoint_payload = {}
            current_kpis = []
            anomaly_count = 0
        endpoint_active_anomalies = active_issue_rows_for_project(
            project,
            endpoint_path=endpoint_path,
            limit=20,
        )
        anomaly_count = max(anomaly_count, len(endpoint_active_anomalies))
        payload = {
            "generated_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "),
            "endpoint_path": endpoint_path,
            "http_method": endpoint_payload.get("http_method", record.method if record is not None else "GET"),
            "baseline": baseline_coverage_summary(endpoint_path, db_path=selected_db_path),
            "anomaly_count": anomaly_count,
            "current_kpis": current_kpis,
            "top_anomalies": endpoint_active_anomalies,
        }
        report_format = str(format or "json").strip().lower()
        if report_format == "markdown":
            return with_api_version_headers(
                Response(endpoint_markdown_report(payload), media_type="text/markdown; charset=utf-8"),
                request,
            )
        return with_api_version_headers(JSONResponse(jsonable_encoder(payload)), request)

    @router.get("/api/v2/migration")
    async def api_v2_migration(request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        return JSONResponse(
            {
                "api_version": "v2",
                "migration": {
                    "legacy_prefix": "/jin/api",
                    "preferred_prefix": "/jin/api/v2",
                    "sunset": api_v1_sunset,
                    "doc_path": "docs/vision.md",
                },
            }
        )

    @router.get("/api/po/playbook")
    @router.get("/api/v2/po/playbook")
    async def po_playbook(request: Request = None) -> JSONResponse:
        require_maintainer_ui()
        require_auth(request, api=True)
        safe_mode = request_prefers_safe_mode(request)
        token = set_native_reads(False) if safe_mode else None
        try:
            status_payload = status_payload_for_project(prefer_runtime=safe_mode)
        finally:
            if token is not None:
                reset_native_reads(token)
        summary = status_payload.get("summary", {}) if isinstance(status_payload, dict) else {}
        project = status_payload.get("project", {}) if isinstance(status_payload, dict) else {}
        payload = {
            "generated_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "),
            "persona": "product-operator",
            "project": {
                "name": project.get("name"),
                "root": project.get("root"),
                "db_path": project.get("db_path"),
            },
            "stats": {
                "apis_tracked": summary.get("total_endpoints", 0),
                "healthy": summary.get("healthy", 0),
                "anomalies": summary.get("anomalies", 0),
                "unconfirmed": summary.get("unconfirmed", 0),
            },
            "workflows": [
                {
                    "id": "configure-upload",
                    "title": "Configure + Upload Baseline",
                    "outcome": "Set expected values and tolerance for each data product grain.",
                    "ui_action": "po_open_api_validation",
                },
                {
                    "id": "monitor-and-regression",
                    "title": "Run Checks + Regression Guard",
                    "outcome": "Trigger checks now, compare drift, and catch regressions quickly.",
                    "ui_action": "po_run_checks",
                },
                {
                    "id": "refresh-baseline",
                    "title": "Refresh Baseline",
                    "outcome": "Promote healthy latest observations when targets should move.",
                    "ui_action": "po_refresh_baseline",
                },
                {
                    "id": "health-and-reporting",
                    "title": "Health + Leadership Reporting",
                    "outcome": "Run health snapshots and export leadership-ready report updates.",
                    "ui_action": "po_generate_report",
                },
            ],
            "route_catalog": [
                {"method": "POST", "path": "/jin/api/v2/projects/register", "purpose": "Register operator/project"},
                {"method": "GET", "path": "/jin/api/v2/projects", "purpose": "List projects"},
                {"method": "POST", "path": "/jin/api/v2/projects/{project_id}/archive", "purpose": "Archive a project from active operations"},
                {"method": "POST", "path": "/jin/api/v2/projects/{project_id}/restore", "purpose": "Restore an archived project"},
                {"method": "DELETE", "path": "/jin/api/v2/projects/{project_id}", "purpose": "Delete an archived project"},
                {"method": "POST", "path": "/jin/api/v2/projects/{project_id}/check-plan", "purpose": "Set monitoring plan"},
                {"method": "POST", "path": "/jin/api/v2/projects/{project_id}/checks/run", "purpose": "Run project checks"},
                {"method": "POST", "path": "/jin/api/v2/projects/{project_id}/baseline/refresh", "purpose": "Refresh project baseline"},
                {"method": "GET", "path": "/jin/api/v2/health", "purpose": "Project health snapshot"},
                {"method": "GET", "path": "/jin/api/v2/portfolio/health", "purpose": "Cross-project health monitor"},
                {"method": "GET", "path": "/jin/api/v2/reports/leadership-digest", "purpose": "Leadership digest"},
                {"method": "POST", "path": "/jin/api/v2/upload/{path}", "purpose": "Upload baseline references for endpoint"},
                {"method": "POST", "path": "/jin/api/v2/upload-async/{path}", "purpose": "Start async baseline upload with progress"},
                {"method": "GET", "path": "/jin/api/v2/upload-async/{job_id}", "purpose": "Check async upload job status"},
                {"method": "POST", "path": "/jin/api/v2/check/{path}", "purpose": "Trigger endpoint check"},
                {"method": "GET|POST", "path": "/jin/api/v2/query", "purpose": "Query trend rollups"},
            ],
        }
        return with_api_version_headers(JSONResponse(payload), request)

    @router.post("/api/errors/{error_id}/status")
    @router.post("/api/v2/errors/{error_id}/status")
    async def update_error_status(error_id: int, request: Request) -> JSONResponse:
        require_auth(request, api=True)
        payload = await request.json()
        action = str(payload.get("action") or "").strip().lower()
        if action not in {"acknowledged", "archived", "reopened"}:
            raise HTTPException(status_code=400, detail="Unsupported error action")
        updated = middleware.update_error_status(error_id, action)
        if updated is None:
            raise HTTPException(status_code=404, detail="Error record not found")
        return JSONResponse({"ok": True, "error": updated})

    @router.post("/api/license/activate")
    @router.post("/api/v2/license/activate")
    async def api_license_activate(request: Request):
        require_maintainer_ui()
        require_auth(request, api=True)
        data = await request.json()
        key = data.get("key")
        if not key:
            raise HTTPException(status_code=400, detail="License key is required")
        
        result = middleware.license_client.activate(key, middleware.site_id)
        if result.get("success"):
            return JSONResponse(result)
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Activation failed"))

    @router.get("/api/endpoint/{path:path}")
    @router.get("/api/v2/endpoint/{path:path}")
    async def endpoint_detail(
        path: str,
        request: Request = None,
        history_limit: int | None = None,
        reference_limit: int | None = None,
    ) -> JSONResponse:
        require_auth(request, api=True)
        require_duckdb()
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        record = endpoint_record_or_404(endpoint_path)
        response_model_present = record.response_model is not None
        fallback_schema_contract = {
            "path": endpoint_path,
            "method": record.method,
            "field_count": len(record.fields),
            "fields": record.fields,
            "dimension_fields": record.dimension_fields,
            "kpi_fields": record.kpi_fields,
            "response_model_present": response_model_present,
        }
        runtime_state = middleware.runtime_state.get(endpoint_path, {})
        last_upload_analysis, upload_analysis_history = upload_analysis_payload_for(endpoint_path)
        if get_endpoint_detail is not None:
            try:
                payload = json.loads(
                    call_native(
                        get_endpoint_detail,
                        middleware.db_path,
                        endpoint_path,
                        history_limit,
                        reference_limit,
                    )
                )
                endpoint = payload.get("endpoint")
                if endpoint is not None:
                    history = payload.get("history", [])
                    schema_contract = endpoint.get("schema_contract") or payload.get("schema_contract") or {}
                    fields = schema_contract.get("fields", record.fields) if isinstance(schema_contract, dict) else record.fields
                    time_candidates = _time_candidates_from_fields(fields)
                    time_required = bool(time_candidates)
                    dimension_fields = endpoint.get("dimension_fields", record.dimension_fields)
                    kpi_fields = endpoint.get("kpi_fields", record.kpi_fields)
                    anomaly_history = []
                    if issues_list is not None:
                        try:
                            anomaly_history = json.loads(call_native(issues_list, middleware.db_path, endpoint_path, None))
                        except Exception:
                            anomaly_history = []
                    if not anomaly_history:
                        anomaly_history = load_anomaly_rows(endpoint_path)
                    anomalies = payload.get("anomalies", [])
                    for item in anomalies:
                        item.setdefault("baseline_label", baseline_label(str(item.get("detection_method") or item.get("method") or "")))
                        item.setdefault("why_flagged", anomaly_reason(item))
                        item.setdefault("baseline_used", item.get("expected_value"))
                        item.setdefault(
                            "change_since_last_healthy_run",
                            change_summary(
                                item.get("actual_value"),
                                item.get("expected_value"),
                                item.get("pct_change"),
                            ),
                        )
                    config_payload = payload.get(
                        "config",
                        {
                            "dimension_fields": record.dimension_fields,
                            "kpi_fields": record.kpi_fields,
                            "tolerance_pct": middleware.global_threshold,
                            "tolerance_relaxed": 20.0,
                            "tolerance_normal": middleware.global_threshold,
                            "tolerance_strict": 5.0,
                            "active_tolerance": "normal",
                            "confirmed": False,
                        },
                    )
                    if not isinstance(config_payload, dict):
                        config_payload = {}
                    config_payload.setdefault("time_required", time_required)
                    config_payload.setdefault("time_candidates", time_candidates)
                    project = middleware.resolve_project(current_project_id())
                    monitoring_runs = annotate_monitoring_runs_with_active_issues(
                        project,
                        endpoint_path,
                        middleware.list_check_runs(endpoint_path, limit=20),
                        upload_analysis=last_upload_analysis,
                    )
                    return JSONResponse(
                        {
                            "endpoint_path": endpoint_path,
                            "http_method": endpoint.get("http_method", record.method),
                            "response_model_present": response_model_present,
                            "dimension_fields": dimension_fields,
                            "kpi_fields": kpi_fields,
                            "fields": fields,
                            "schema_contract": schema_contract,
                            "config": config_payload,
                            "history": history,
                            "anomalies": anomalies,
                            "anomaly_history": anomaly_history,
                            "references": payload.get("references", []),
                            "recent_history": payload.get("recent_history", []),
                            "trend_summary": payload.get("trend_summary", build_trend_summary(history, kpi_fields)),
                            "current_kpis": payload.get("current_kpis", []),
                            "operator_metadata": payload.get(
                                "operator_metadata",
                                load_endpoint_operational_metadata(endpoint_path),
                            ),
                            "upload_activity": payload.get(
                                "upload_activity",
                                load_endpoint_operational_metadata(endpoint_path)["recent_uploads"],
                            ),
                            "monitoring_runs": monitoring_runs,
                            "last_upload_analysis": last_upload_analysis,
                            "upload_analysis_history": upload_analysis_history,
                        }
                    )
            except Exception as exc:
                record_router_error(
                    "router.endpoint_detail",
                    "Falling back to runtime endpoint detail after native detail retrieval failed.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    hint="Check stored history/config rows for malformed payloads.",
                )
                pass
        middleware._ensure_python_schema()
        middleware._reset_cached_connection()
        db_unavailable = False
        conn = None
        lock = None
        try:
            conn, lock = connection_and_lock()
        except HTTPException as exc:
            cause_text = str(getattr(exc, "__cause__", "") or "")
            if exc.status_code == 503 and ("exploded" in cause_text or "exploded" in str(exc.detail)):
                raise
            db_unavailable = True
        use_native_fallback = duckdb is not None and isinstance(conn, duckdb.DuckDBPyConnection)
        native_config_payload = None
        native_references_payload = None
        if use_native_fallback and config_show is not None:
            try:
                native_config_payload = json.loads(call_native(config_show, middleware.db_path, endpoint_path))
            except Exception:
                native_config_payload = None
        if use_native_fallback and references_export is not None:
            try:
                native_references_payload = json.loads(call_native(references_export, middleware.db_path, endpoint_path))
            except Exception:
                native_references_payload = None

        endpoint = None
        references = None
        config = None
        if not db_unavailable and (native_config_payload is None or native_references_payload is None):
            try:
                with lock:
                    _ensure_fallback_storage_tables(conn)
                    try:
                        _ensure_config_mapping_columns(conn)
                    except Exception as exc:
                        record_router_error(
                            "router.endpoint_detail",
                            "Config mapping bootstrap skipped while reading a legacy DuckDB config row.",
                            endpoint_path=endpoint_path,
                            detail=str(exc),
                            hint="Legacy config rows can still be read without the newer mapping columns.",
                        )
                    endpoint = conn.execute(
                        "SELECT endpoint_path, http_method, dimension_fields, kpi_fields FROM jin_endpoints WHERE endpoint_path = ?",
                        [endpoint_path],
                    ).fetchone()
                    references = conn.execute(
                        """
                        SELECT grain_key, kpi_field, expected_value, tolerance_pct, upload_source
                        FROM jin_reference
                        WHERE endpoint_path = ?
                        ORDER BY uploaded_at DESC
                        """,
                        [endpoint_path],
                    ).fetchall()
                    try:
                        config = conn.execute(
                            """
                            SELECT dimension_overrides, kpi_overrides, tolerance_pct, confirmed,
                                   tolerance_relaxed, tolerance_normal, tolerance_strict, active_tolerance,
                                   time_field, time_granularity,
                                   rows_path, time_end_field, time_profile, time_extraction_rule, time_format, time_pin
                            FROM jin_config
                            WHERE endpoint_path = ?
                            """,
                            [endpoint_path],
                        ).fetchone()
                    except Exception:
                        legacy = conn.execute(
                            """
                            SELECT dimension_overrides, kpi_overrides, tolerance_pct, confirmed, time_field, time_granularity
                            FROM jin_config
                            WHERE endpoint_path = ?
                            """,
                            [endpoint_path],
                        ).fetchone()
                        config = (
                            (
                                legacy[0],
                                legacy[1],
                                legacy[2],
                                legacy[3],
                                20.0,
                                legacy[2] if legacy else middleware.global_threshold,
                                5.0,
                                "normal",
                                legacy[4] if len(legacy) > 4 else None,
                                legacy[5] if len(legacy) > 5 else "minute",
                                None,
                                None,
                                "auto",
                                "single",
                                None,
                                False,
                            )
                            if legacy
                            else None
                        )
            except Exception as exc:
                record_router_error(
                    "router.endpoint_detail",
                    "Falling back to runtime endpoint detail after legacy DuckDB reads failed.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    hint="Check the local DuckDB anomaly table for schema drift or locks.",
                )
                db_unavailable = True
        mapping_overrides = _load_config_mapping_overrides(endpoint_path)
        if native_config_payload is not None:
            fallback_config = native_config_payload.get("config", {})
            if db_unavailable:
                schema_contract = native_config_payload.get("schema_contract") or fallback_schema_contract
            else:
                try:
                    schema_contract = native_config_payload.get("schema_contract") or load_endpoint_metadata(endpoint_path)["schema_contract"]
                except HTTPException as exc:
                    if exc.status_code == 503:
                        schema_contract = native_config_payload.get("schema_contract") or fallback_schema_contract
                    else:
                        raise
            http_method = native_config_payload.get("http_method", record.method)
            dimension_fields = fallback_config.get("dimension_fields") or record.dimension_fields
            kpi_fields = fallback_config.get("kpi_fields") or record.kpi_fields
        else:
            if db_unavailable:
                schema_contract = fallback_schema_contract
            else:
                try:
                    schema_contract = load_endpoint_metadata(endpoint_path)["schema_contract"]
                except HTTPException as exc:
                    if exc.status_code == 503:
                        schema_contract = fallback_schema_contract
                        db_unavailable = True
                    else:
                        raise
            http_method = endpoint[1] if endpoint else record.method
            dimension_fields = json.loads(endpoint[2]) if endpoint and endpoint[2] else record.dimension_fields
            kpi_fields = json.loads(endpoint[3]) if endpoint and endpoint[3] else record.kpi_fields
        time_candidates = _time_candidates_from_fields(record.fields)
        time_required = bool(time_candidates)
        config_payload = {
            **(
                native_config_payload.get("config", {})
                if native_config_payload is not None
                else {
                    "dimension_fields": json.loads(config[0]) if config and config[0] and isinstance(config[0], str) else record.dimension_fields,
                    "kpi_fields": json.loads(config[1]) if config and config[1] and isinstance(config[1], str) else record.kpi_fields,
                    "tolerance_pct": config[2] if config else middleware.global_threshold,
                    "tolerance_relaxed": config[4] if config else 20.0,
                    "tolerance_normal": config[5] if config else middleware.global_threshold,
                    "tolerance_strict": config[6] if config else 5.0,
                    "active_tolerance": config[7] if config else "normal",
                    "confirmed": bool(config[3]) if config else False,
                    "time_field": config[8] if config else None,
                    "time_granularity": config[9] if config else "minute",
                    "rows_path": config[10] if config else None,
                    "time_end_field": config[11] if config else None,
                    "time_profile": config[12] if config else "auto",
                    "time_extraction_rule": config[13] if config else "single",
                    "time_format": config[14] if config else None,
                    "time_pin": bool(config[15]) if config and len(config) > 15 else False,
                }
            ),
            **mapping_overrides,
        }
        if not isinstance(config_payload, dict):
            config_payload = {}
        config_payload.setdefault("time_required", time_required)
        config_payload.setdefault("time_candidates", time_candidates)
        project = middleware.resolve_project(current_project_id())
        monitoring_runs = annotate_monitoring_runs_with_active_issues(
            project,
            endpoint_path,
            middleware.list_check_runs(endpoint_path, limit=20),
            upload_analysis=last_upload_analysis,
        )
        return JSONResponse(
            {
                "endpoint_path": endpoint_path,
                "http_method": http_method,
                "response_model_present": response_model_present,
                "dimension_fields": dimension_fields,
                "kpi_fields": kpi_fields,
                "fields": record.fields,
                "schema_contract": schema_contract,
                "config": config_payload,
                "history": runtime_state.get("history", []),
                "anomalies": [
                    item for item in runtime_enriched_anomalies() if item["endpoint_path"] == endpoint_path
                ],
                "anomaly_history": [item for item in runtime_enriched_anomalies(True) if item["endpoint_path"] == endpoint_path],
                "references": native_references_payload if native_references_payload is not None else [
                    {
                        "grain_key": row[0],
                        "kpi_field": row[1],
                        "expected_value": row[2],
                        "tolerance_pct": row[3],
                        "upload_source": row[4],
                    }
                    for row in (references or [])
                ],
                "recent_history": runtime_state.get("recent_history", []),
                "trend_summary": build_trend_summary(
                    runtime_state.get("history", []),
                    kpi_fields,
                ),
                "current_kpis": [],
                "operator_metadata": load_endpoint_operational_metadata(endpoint_path),
                "upload_activity": load_endpoint_operational_metadata(endpoint_path)["recent_uploads"],
                "monitoring_runs": monitoring_runs,
                "last_upload_analysis": last_upload_analysis,
                "upload_analysis_history": upload_analysis_history,
            }
        )

    @router.post("/api/config-mapping/test/{path:path}")
    @router.post("/api/v2/config-mapping/test/{path:path}")
    async def preview_config_mapping(path: str, request: Request) -> JSONResponse:
        require_auth(request, api=True)
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        record = endpoint_record_or_404(endpoint_path)
        if record.response_model is None:
            snapshot = _setup_snapshot(endpoint_path)
            blockers = _setup_blockers(snapshot)
            message = (
                "Define a Pydantic response model first. Jin needs the model to discover fields before setup can be saved."
            )
            return JSONResponse(
                {
                    "ok": False,
                    "endpoint_path": endpoint_path,
                    "error": message,
                    "setup_blockers": blockers,
                    "setup": snapshot,
                    "next_step": "Add response_model to this FastAPI route, then come back to Configuration.",
                },
                status_code=409,
            )
        raw_payload = await request.json()
        if not isinstance(raw_payload, dict):
            raw_payload = {}
        payload = MappingPreviewRequest.model_validate(raw_payload)
        saved_overrides = middleware._load_overrides(endpoint_path)

        sample_source = "request_payload"
        sample_payload = payload.sample_payload
        if sample_payload is None:
            runtime_rows = runtime_mapping_rows(endpoint_path)
            if runtime_rows:
                sample_source = "runtime_history"
                sample_payload = runtime_rows
            else:
                metadata = endpoint_metadata_runtime_only(endpoint_path)
                schema_contract = metadata.get("schema_contract", {})
                example_rows = schema_contract.get("example_rows") if isinstance(schema_contract, dict) else None
                if isinstance(example_rows, list) and example_rows:
                    sample_source = "schema_example_rows"
                    sample_payload = example_rows
                else:
                    sample_source = "none"
                    sample_payload = []

        resolved_rows_path = (
            payload.rows_path
            if "rows_path" in raw_payload
            else saved_overrides.get("rows_path") or record.array_field_path
        )
        effective_time_field = (
            payload.time_field
            if "time_field" in raw_payload
            else saved_overrides.get("time_field")
        )
        effective_time_end_field = (
            payload.time_end_field
            if "time_end_field" in raw_payload
            else saved_overrides.get("time_end_field")
        )
        effective_time_profile = (
            payload.time_profile
            if "time_profile" in raw_payload
            else saved_overrides.get("time_profile") or payload.time_profile or "auto"
        )
        effective_time_extraction_rule = (
            payload.time_extraction_rule
            if "time_extraction_rule" in raw_payload
            else saved_overrides.get("time_extraction_rule") or payload.time_extraction_rule or "single"
        )
        effective_time_format = (
            payload.time_format
            if "time_format" in raw_payload
            else saved_overrides.get("time_format")
        )
        rows, extraction_source = extract_rows(
            sample_payload,
            rows_path=resolved_rows_path,
            default_array_path=record.array_field_path,
        )
        preview = preview_time_mapping(
            rows=rows,
            time_field=effective_time_field,
            time_end_field=effective_time_end_field,
            time_profile=effective_time_profile,
            time_extraction_rule=effective_time_extraction_rule,
            time_format=effective_time_format,
            sample_rows_limit=payload.sample_rows_limit,
        )

        summary = preview.get("summary", {})
        warnings = list(summary.get("warnings") or [])
        if sample_source == "schema_example_rows" and payload.rows_path:
            warnings.append(
                "rows_path was provided, but schema examples are flattened rows; verify mapping with a real JSON payload sample."
            )
        if sample_source == "none":
            warnings.append("No sample payload or runtime history was available for this endpoint.")
        summary["warnings"] = sorted(set(str(item) for item in warnings if item))

        return JSONResponse(
            {
                "ok": True,
                "endpoint_path": endpoint_path,
                "sample_source": sample_source,
                "row_extraction_source": extraction_source,
                "mapping": {
                    "rows_path": resolved_rows_path,
                    "time_field": effective_time_field,
                    "time_end_field": effective_time_end_field,
                    "time_profile": effective_time_profile,
                    "time_extraction_rule": effective_time_extraction_rule,
                    "time_format": effective_time_format,
                    "sample_rows_limit": payload.sample_rows_limit,
                },
                **preview,
            }
        )

    @router.post("/api/config/{path:path}")
    @router.post("/api/v2/config/{path:path}")
    async def save_config(path: str, request: Request) -> JSONResponse:
        require_auth(request, api=True)
        require_duckdb()
        middleware._ensure_python_schema()
        middleware._reset_cached_connection()
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        record = endpoint_record_or_404(endpoint_path)
        setup_snapshot = _setup_snapshot(endpoint_path)
        if not bool(setup_snapshot.get("response_model_present", True)):
            message = (
                "Define a Pydantic response model first. Jin needs the model to discover fields before setup can be saved."
            )
            return JSONResponse(
                {
                    "ok": False,
                    "endpoint_path": endpoint_path,
                    "error": message,
                    "setup_blockers": _setup_blockers(setup_snapshot),
                    "setup": setup_snapshot,
                    "next_step": "Add response_model to this FastAPI route, then come back to Configuration.",
                },
                status_code=409,
            )
        payload = await request.json()
        if not isinstance(payload, dict):
            payload = {}
        watch_overrides = payload.get("watch_overrides")
        if isinstance(watch_overrides, dict):
            watch_payload: dict[str, Any] = {"default_params": watch_overrides}
            for key in ("schedule", "threshold", "baseline_mode"):
                value = payload.get(key)
                if value not in (None, ""):
                    watch_payload[key] = value
            try:
                middleware.upsert_watch_config(endpoint_path, watch_payload)
                record = endpoint_record_or_404(endpoint_path)
            except Exception as exc:
                record_router_error(
                    "router.save_config.watch_overrides",
                    "Could not apply watch defaults from setup payload.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    hint="Check path/query/body JSON shape in watch overrides.",
                    level="warning",
                )
        native_response: dict[str, object] | None = None
        middleware.override_state[endpoint_path] = {
            "dimension_fields": payload.get("dimension_fields", record.dimension_fields),
            "kpi_fields": payload.get("kpi_fields", record.kpi_fields),
            "tolerance_pct": payload.get("tolerance_pct", middleware.global_threshold),
            "tolerance_relaxed": payload.get("tolerance_relaxed", 20.0),
            "tolerance_normal": payload.get("tolerance_normal", payload.get("tolerance_pct", middleware.global_threshold)),
            "tolerance_strict": payload.get("tolerance_strict", 5.0),
            "active_tolerance": payload.get("active_tolerance", "normal"),
            "confirmed": payload.get("confirmed", True),
            "rows_path": payload.get("rows_path"),
            "time_field": payload.get("time_field"),
            "time_end_field": payload.get("time_end_field"),
            "time_granularity": payload.get("time_granularity", "minute"),
            "time_profile": payload.get("time_profile", "auto"),
            "time_extraction_rule": payload.get("time_extraction_rule", "single"),
            "time_format": payload.get("time_format"),
            "time_pin": 1 if payload.get("time_pin", False) else 0,
        }
        if save_endpoint_config is not None:
            try:
                native_response = json.loads(
                    call_native(
                        save_endpoint_config,
                        middleware.db_path,
                        endpoint_path,
                        record.method,
                        json.dumps(record.dimension_fields),
                        json.dumps(record.kpi_fields),
                        json.dumps(payload),
                    )
                )
                try:
                    _persist_config_mapping_overrides(endpoint_path, payload)
                except Exception as exc:
                    record_router_error(
                        "router.save_config",
                        "Saved base config, but supplemental time mapping fields could not be persisted.",
                        endpoint_path=endpoint_path,
                        detail=str(exc),
                        hint="Check jin_config schema migrations for mapping columns.",
                        level="warning",
                    )
                return JSONResponse(native_response)
            except Exception as exc:
                record_router_error(
                    "router.save_config",
                    "Native config save failed; using Python persistence path instead.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    hint="Validate config field names and native extension compatibility.",
                )
                native_response = None
        middleware._reset_cached_connection()
        conn, lock = connection_and_lock()
        with lock:
            try:
                _ensure_config_mapping_columns(conn)
                _ensure_fallback_storage_tables(conn)
                conn.execute(
                    """
                    INSERT OR REPLACE INTO jin_config (
                        endpoint_path, dimension_overrides, kpi_overrides,
                        tolerance_relaxed, tolerance_normal, tolerance_strict, active_tolerance,
                        tolerance_pct, confirmed, time_field, time_granularity,
                        rows_path, time_end_field, time_profile, time_extraction_rule, time_format, time_pin,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
                    """,
                    [
                        endpoint_path,
                        json.dumps(payload.get("dimension_fields", [])),
                        json.dumps(payload.get("kpi_fields", [])),
                        payload.get("tolerance_relaxed", 20.0),
                        payload.get("tolerance_normal", payload.get("tolerance_pct", 10.0)),
                        payload.get("tolerance_strict", 5.0),
                        payload.get("active_tolerance", "normal"),
                        payload.get("tolerance_pct", 10.0),
                        payload.get("confirmed", True),
                        payload.get("time_field"),
                        payload.get("time_granularity", "minute"),
                        payload.get("rows_path"),
                        payload.get("time_end_field"),
                        payload.get("time_profile", "auto"),
                        payload.get("time_extraction_rule", "single"),
                        payload.get("time_format"),
                        1 if payload.get("time_pin", False) else 0,
                    ],
                )
            except Exception:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO jin_config (
                        endpoint_path, dimension_overrides, kpi_overrides, tolerance_pct, confirmed, time_field, time_granularity, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, now())
                    """,
                    [
                        endpoint_path,
                        json.dumps(payload.get("dimension_fields", [])),
                        json.dumps(payload.get("kpi_fields", [])),
                        payload.get("tolerance_pct", 10.0),
                        payload.get("confirmed", True),
                        payload.get("time_field"),
                        payload.get("time_granularity", "minute"),
                    ],
                )
                conn.execute("CHECKPOINT")
                try:
                    _persist_config_mapping_overrides(endpoint_path, payload)
                except Exception as exc:
                    record_router_error(
                        "router.save_config",
                        "Saved legacy config row, but supplemental time mapping fields could not be persisted.",
                        endpoint_path=endpoint_path,
                        detail=str(exc),
                        hint="Check jin_config schema migrations for mapping columns.",
                        level="warning",
                    )
            conn.execute(
                """
                UPDATE jin_endpoints
                SET dimension_fields = ?, kpi_fields = ?, config_source = 'ui'
                WHERE endpoint_path = ?
                """,
                [
                    json.dumps(payload.get("dimension_fields", record.dimension_fields)),
                    json.dumps(payload.get("kpi_fields", record.kpi_fields)),
                    endpoint_path,
                ],
            )
            for item in payload.get("references", []):
                conn.execute(
                    """
                    INSERT INTO jin_reference (
                        id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
                    )
                    SELECT COALESCE(MAX(id), 0) + 1, ?, ?, ?, ?, ?, 'ui'
                    FROM jin_reference
                    """,
                    [
                        endpoint_path,
                        item["grain_key"],
                        item["kpi_field"],
                        item["expected_value"],
                        item.get("tolerance_pct", payload.get("tolerance_pct", 10.0)),
                    ],
                )
                conn.execute("CHECKPOINT")
                try:
                    conn.close()
                except Exception:
                    pass
                if hasattr(middleware, "_test_conn"):
                    middleware._test_conn = None
        return JSONResponse(native_response or {"ok": True})


    @router.post("/api/reference/{path:path}")
    @router.post("/api/v2/reference/{path:path}")
    async def save_reference(path: str, request: Request) -> JSONResponse:
        require_auth(request, api=True)
        require_duckdb()
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        endpoint_record_or_404(endpoint_path)
        payload = await request.json()
        if save_references is not None:
            try:
                return JSONResponse(json.loads(call_native(save_references, middleware.db_path, endpoint_path, json.dumps(payload), "ui")))
            except Exception as exc:
                record_router_error(
                    "router.save_references",
                    "Native reference save failed; using Python persistence path instead.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    hint="Check reference grain keys and KPI field names.",
                )
                pass
        conn, lock = connection_and_lock()
        with lock:
            for item in payload.get("references", []):
                conn.execute(
                    """
                    INSERT INTO jin_reference (
                        id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
                    )
                    SELECT COALESCE(MAX(id), 0) + 1, ?, ?, ?, ?, ?, ?
                    FROM jin_reference
                    """,
                    [
                        endpoint_path,
                        item["grain_key"],
                        item["kpi_field"],
                        item["expected_value"],
                        item.get("tolerance_pct", 10.0),
                        "ui",
                    ],
                )
            conn.execute("CHECKPOINT")
            conn.execute("CHECKPOINT")
            try:
                conn.close()
            except Exception:
                pass
            if hasattr(middleware, "_test_conn"):
                middleware._test_conn = None
        return JSONResponse({"ok": True, "count": len(payload.get("references", []))})

    @router.get("/api/v1/query")
    @router.post("/api/v1/query")
    @router.get("/api/v2/query")
    @router.post("/api/v2/query")
    async def analytics_query(
        request: Request,
        endpoint_path: str | None = None,
        grain_key: str | None = None,
        measures: str | None = None,
    ) -> JSONResponse:  # pragma: no cover
        require_auth(request, api=True)
        require_duckdb()
        middleware._ensure_python_schema()
        middleware._reset_cached_connection()

        # Parse measures from either POST body or GET query param
        measure_list: list[str] = []
        if request.method == "POST":
            try:
                body = await request.json()
                measure_list = body.get("measures", [])
            except Exception:
                pass
        elif measures:
            measure_list = [m.strip() for m in measures.split(",") if m.strip()]

        # Prefer the native rollup query (reads from the Rust connection pool,
        # same writer that populates jin_rollups) to avoid stale-read issues
        # that arise from dual DuckDB connections to the same file.
        if query_rollups_native is not None and measure_list:
            try:
                # Note: Native query only supports measures list right now.
                # If we have endpoint/grain filters, we'll fall back to Python DuckDB path
                # unless we want to update the native signature too. 
                # For now, let's use fallback if we have extra filters.
                if not endpoint_path and not grain_key:
                    result = json.loads(
                        query_rollups_native(middleware.db_path, json.dumps(measure_list))
                    )
                    return JSONResponse(result)
            except Exception:
                pass

        # Fallback: Python DuckDB connection (or when using endpoint/grain filters)
        conn, lock = connection_and_lock()
        with lock:
            try:
                _ensure_fallback_storage_tables(conn)
                where_clauses = []
                params = []
                
                if measure_list:
                    placeholders = ", ".join(["?"] * len(measure_list))
                    where_clauses.append(f"metric_name IN ({placeholders})")
                    params.extend(measure_list)
                
                if endpoint_path:
                    where_clauses.append("endpoint_path = ?")
                    params.append(endpoint_path)
                
                if grain_key:
                    where_clauses.append("grain_key = ?")
                    params.append(grain_key)
                
                where_sql = ""
                if where_clauses:
                    where_sql = "WHERE " + " AND ".join(where_clauses)

                sql = f"""
                SELECT
                    time_bucket,
                    metric_name,
                    grain_key,
                    SUM(value) as value,
                    SUM(samples) as samples
                FROM jin_rollups
                {where_sql}
                GROUP BY time_bucket, metric_name, grain_key
                ORDER BY time_bucket DESC
                LIMIT 1000
                """
                cursor = conn.cursor()
                cursor.execute(sql, params)
                columns = [desc[0] for desc in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                for row in results:
                    if hasattr(row["time_bucket"], "isoformat"):
                        row["time_bucket"] = row["time_bucket"].isoformat()
                return JSONResponse({"data": results, "results": results}) # Support both keys for frontend vs test expectations
            except Exception as exc:
                return JSONResponse({"error": str(exc)}, status_code=400)

    class UploadProcessingError(Exception):
        def __init__(self, payload: dict[str, Any], status_code: int = 400):
            super().__init__(str(payload.get("error") or "Upload failed."))
            self.payload = payload
            self.status_code = status_code

    upload_job_tasks: dict[str, asyncio.Task[Any]] = {}
    upload_followup_tasks: dict[str, asyncio.Task[Any]] = {}

    def _ensure_upload_job_schema(conn: Any) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jin_upload_jobs (
                job_id VARCHAR PRIMARY KEY,
                endpoint_path VARCHAR NOT NULL,
                status VARCHAR NOT NULL,
                stage VARCHAR NOT NULL,
                progress_pct DOUBLE NOT NULL,
                message VARCHAR,
                filename VARCHAR,
                file_size_bytes BIGINT,
                rows_in_file BIGINT,
                columns_in_file BIGINT,
                is_large_upload BOOLEAN,
                result_json VARCHAR,
                error VARCHAR,
                followup_status VARCHAR,
                followup_message VARCHAR,
                followup_started_at TIMESTAMP,
                followup_finished_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now()
            )
            """
        )
        conn.execute("ALTER TABLE jin_upload_jobs ADD COLUMN IF NOT EXISTS followup_status VARCHAR")
        conn.execute("ALTER TABLE jin_upload_jobs ADD COLUMN IF NOT EXISTS followup_message VARCHAR")
        conn.execute("ALTER TABLE jin_upload_jobs ADD COLUMN IF NOT EXISTS followup_started_at TIMESTAMP")
        conn.execute("ALTER TABLE jin_upload_jobs ADD COLUMN IF NOT EXISTS followup_finished_at TIMESTAMP")

    def _cleanup_upload_jobs_if_needed(*, force: bool = False) -> None:
        nonlocal last_upload_cleanup_at
        now_epoch = datetime.now(timezone.utc).timestamp()
        try:
            interval_seconds = max(int(os.getenv("JIN_UPLOAD_CLEANUP_INTERVAL_SECONDS", "900")), 0)
        except ValueError:
            interval_seconds = 900
        if not force and (now_epoch - last_upload_cleanup_at) < interval_seconds:
            return
        try:
            ttl_hours = max(int(os.getenv("JIN_UPLOAD_JOB_TTL_HOURS", "168")), 1)
        except ValueError:
            ttl_hours = 168
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=ttl_hours)
        try:
            conn, lock = connection_and_lock()
            with lock:
                _ensure_upload_job_schema(conn)
                conn.execute(
                    """
                    DELETE FROM jin_upload_jobs
                    WHERE updated_at < ?
                      AND status IN ('completed', 'failed')
                      AND COALESCE(followup_status, 'not_requested') NOT IN ('queued', 'running')
                    """,
                    [cutoff],
                )
        except Exception:
            pass
        temp_dir = Path(tempfile.gettempdir())
        for candidate in temp_dir.glob("jin-upload-*"):
            try:
                if not candidate.is_file():
                    continue
                modified = datetime.fromtimestamp(candidate.stat().st_mtime, tz=timezone.utc).replace(tzinfo=None)
                if modified < cutoff:
                    candidate.unlink(missing_ok=True)
            except Exception:
                continue
        last_upload_cleanup_at = now_epoch

    def _read_upload_job(job_id: str) -> dict[str, Any] | None:
        _cleanup_upload_jobs_if_needed()
        conn, lock = connection_and_lock()
        with lock:
            _ensure_upload_job_schema(conn)
            row = conn.execute(
                """
                SELECT
                    job_id,
                    endpoint_path,
                    status,
                    stage,
                    progress_pct,
                    message,
                    filename,
                    file_size_bytes,
                    rows_in_file,
                    columns_in_file,
                    is_large_upload,
                    result_json,
                    error,
                    followup_status,
                    followup_message,
                    CAST(followup_started_at AS VARCHAR),
                    CAST(followup_finished_at AS VARCHAR),
                    CAST(created_at AS VARCHAR),
                    CAST(updated_at AS VARCHAR)
                FROM jin_upload_jobs
                WHERE job_id = ?
                LIMIT 1
                """,
                [job_id],
            ).fetchone()
        if not row:
            return None
        result_payload: dict[str, Any] | None = None
        raw_result = row[11]
        if isinstance(raw_result, str) and raw_result:
            try:
                parsed = json.loads(raw_result)
                if isinstance(parsed, dict):
                    result_payload = parsed
            except Exception:
                result_payload = None
        payload = {
            "ok": True,
            "job_id": row[0],
            "endpoint_path": row[1],
            "status": row[2],
            "stage": row[3],
            "progress_pct": float(row[4] or 0.0),
            "message": row[5] or "",
            "filename": row[6] or "",
            "file_size_bytes": int(row[7] or 0),
            "rows_in_file": int(row[8] or 0),
            "columns_in_file": int(row[9] or 0),
            "is_large_upload": bool(row[10]) if row[10] is not None else False,
            "result": result_payload,
            "error": row[12],
            "followup_status": row[13] or "not_requested",
            "followup_message": row[14] or "",
            "followup_started_at": row[15],
            "followup_finished_at": row[16],
            "created_at": row[17],
            "updated_at": row[18],
        }
        payload["done"] = payload["status"] in {"completed", "failed"}
        return payload

    def _read_latest_upload_job(endpoint_path: str) -> dict[str, Any] | None:
        _cleanup_upload_jobs_if_needed()
        conn, lock = connection_and_lock()
        with lock:
            _ensure_upload_job_schema(conn)
            row = conn.execute(
                """
                SELECT job_id
                FROM jin_upload_jobs
                WHERE endpoint_path = ?
                ORDER BY updated_at DESC, created_at DESC
                LIMIT 1
                """,
                [endpoint_path],
            ).fetchone()
        if not row:
            return None
        return _read_upload_job(str(row[0]))

    def _create_upload_job(
        job_id: str,
        endpoint_path: str,
        *,
        filename: str,
        file_size_bytes: int,
    ) -> None:
        _cleanup_upload_jobs_if_needed()
        conn, lock = connection_and_lock()
        with lock:
            _ensure_upload_job_schema(conn)
            conn.execute(
                """
                INSERT OR REPLACE INTO jin_upload_jobs (
                    job_id,
                    endpoint_path,
                    status,
                    stage,
                    progress_pct,
                    message,
                    filename,
                    file_size_bytes,
                    rows_in_file,
                    columns_in_file,
                    is_large_upload,
                    result_json,
                    error,
                    followup_status,
                    followup_message,
                    followup_started_at,
                    followup_finished_at,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, 'queued', 'queued', 0, 'Upload queued.', ?, ?, 0, 0, false, NULL, NULL, 'not_requested', '', NULL, NULL, now(), now())
                """,
                [job_id, endpoint_path, filename, int(file_size_bytes)],
            )

    def _update_upload_job(
        job_id: str,
        *,
        status: str | None = None,
        stage: str | None = None,
        progress_pct: float | None = None,
        message: str | None = None,
        rows_in_file: int | None = None,
        columns_in_file: int | None = None,
        is_large_upload: bool | None = None,
        result_payload: dict[str, Any] | None = None,
        error: str | None = None,
        followup_status: str | None = None,
        followup_message: str | None = None,
        followup_started_at: str | None = None,
        followup_finished_at: str | None = None,
    ) -> None:
        conn, lock = connection_and_lock()
        with lock:
            _ensure_upload_job_schema(conn)
            statements: list[str] = []
            params: list[Any] = []
            if status is not None:
                statements.append("status = ?")
                params.append(status)
            if stage is not None:
                statements.append("stage = ?")
                params.append(stage)
            if progress_pct is not None:
                statements.append("progress_pct = ?")
                params.append(float(progress_pct))
            if message is not None:
                statements.append("message = ?")
                params.append(message)
            if rows_in_file is not None:
                statements.append("rows_in_file = ?")
                params.append(int(rows_in_file))
            if columns_in_file is not None:
                statements.append("columns_in_file = ?")
                params.append(int(columns_in_file))
            if is_large_upload is not None:
                statements.append("is_large_upload = ?")
                params.append(bool(is_large_upload))
            if result_payload is not None:
                statements.append("result_json = ?")
                params.append(json.dumps(result_payload, separators=(",", ":"), default=str))
            if error is not None:
                statements.append("error = ?")
                params.append(error)
            if followup_status is not None:
                statements.append("followup_status = ?")
                params.append(followup_status)
            if followup_message is not None:
                statements.append("followup_message = ?")
                params.append(followup_message)
            if followup_started_at is not None:
                statements.append("followup_started_at = ?")
                params.append(followup_started_at)
            if followup_finished_at is not None:
                statements.append("followup_finished_at = ?")
                params.append(followup_finished_at)
            statements.append("updated_at = now()")
            conn.execute(
                f"UPDATE jin_upload_jobs SET {', '.join(statements)} WHERE job_id = ?",
                [*params, job_id],
            )

    def _persist_upload_config(
        endpoint_path: str,
        dimension_fields: list[str],
        kpi_fields: list[str],
        tolerance_pct: float,
    ) -> None:
        conn, lock = connection_and_lock()
        with lock:
            conn.execute(
                """
                INSERT OR REPLACE INTO jin_config (
                    endpoint_path, dimension_overrides, kpi_overrides, tolerance_pct, confirmed, updated_at
                ) VALUES (?, ?, ?, ?, true, now())
                """,
                [
                    endpoint_path,
                    json.dumps(dimension_fields),
                    json.dumps(kpi_fields),
                    tolerance_pct,
                ],
            )

    def _clear_endpoint_references(endpoint_path: str) -> None:
        conn, lock = connection_and_lock()
        with lock:
            conn.execute("DELETE FROM jin_reference WHERE endpoint_path = ?", [endpoint_path])

    def _persist_normalized_rows(
        endpoint_path: str,
        dimension_fields: list[str],
        normalized_rows: list[dict[str, Any]],
        source: str,
        *,
        replace_existing: bool = False,
    ) -> int:
        imported = 0
        conn, lock = connection_and_lock()
        with lock:
            if replace_existing:
                conn.execute("DELETE FROM jin_reference WHERE endpoint_path = ?", [endpoint_path])
            for row in normalized_rows:
                grain_dimensions = {
                    field: row["dimensions"].get(field, "")
                    for field in dimension_fields
                    if field.replace("[]", "").split(".")[-1] not in TECHNICAL_METADATA_FIELDS
                }
                grain_suffix = "|".join(f"{key}={grain_dimensions[key]}" for key in sorted(grain_dimensions))
                grain_key = endpoint_path if not grain_suffix else f"{endpoint_path}|{grain_suffix}"
                for kpi_field, expected_value in row["expected"].items():
                    conn.execute(
                        "DELETE FROM jin_reference WHERE endpoint_path = ? AND grain_key = ? AND kpi_field = ?",
                        [endpoint_path, grain_key, kpi_field],
                    )
                    conn.execute(
                        """
                        INSERT INTO jin_reference (
                            id, endpoint_path, grain_key, kpi_field, expected_value, tolerance_pct, upload_source
                        )
                        SELECT COALESCE(MAX(id), 0) + 1, ?, ?, ?, ?, ?, ?
                        FROM jin_reference
                        """,
                        [
                            endpoint_path,
                            grain_key,
                            kpi_field,
                            expected_value,
                            row["tolerance_pct"],
                            source,
                        ],
                    )
                    imported += 1
        return imported

    async def _stage_upload_file(file: UploadFile, filename: str) -> tuple[str, int]:
        suffix = Path(filename).suffix if filename else ".dat"
        staged = tempfile.NamedTemporaryFile(prefix="jin-upload-", suffix=suffix, delete=False)
        staged_path = staged.name
        total_bytes = 0
        try:
            try:
                await file.seek(0)
            except Exception:
                pass
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                staged.write(chunk)
                total_bytes += len(chunk)
            staged.flush()
            return staged_path, total_bytes
        except Exception:
            try:
                Path(staged_path).unlink(missing_ok=True)
            except Exception:
                pass
            raise
        finally:
            staged.close()

    async def _run_upload_analysis_with_cap(
        endpoint_path: str,
        normalized_rows: list[dict[str, Any]],
        max_runs: int,
    ) -> dict[str, Any]:
        try:
            return await middleware.run_upload_analysis(
                endpoint_path,
                normalized_rows,
                max_runs=max_runs,
            )
        except TypeError as exc:
            if "max_runs" in str(exc) and "unexpected keyword argument" in str(exc):
                return await middleware.run_upload_analysis(endpoint_path, normalized_rows)
            raise

    def _augment_upload_job_result(job_id: str, patch_payload: dict[str, Any]) -> None:
        current = _read_upload_job(job_id) or {}
        result = current.get("result")
        base = result if isinstance(result, dict) else {}
        merged = {**base, **patch_payload}
        _update_upload_job(job_id, result_payload=merged)

    def _task_active(task_map: dict[str, asyncio.Task[Any]], key: str) -> bool:
        task = task_map.get(key)
        if task is None:
            return False
        if task.done():
            task_map.pop(key, None)
            return False
        return True

    def _mark_upload_tracker_stale_if_orphaned(payload: dict[str, Any] | None) -> dict[str, Any] | None:
        if not isinstance(payload, dict):
            return payload
        job_id = str(payload.get("job_id") or "")
        if not job_id:
            return payload
        status = str(payload.get("status") or "").lower()
        if status not in {"queued", "running"}:
            return payload
        if _task_active(upload_job_tasks, job_id):
            return payload

        created_at = parse_dt(payload.get("created_at"))
        updated_at = parse_dt(payload.get("updated_at"))
        now = now_naive()
        stale_by_restart = created_at is not None and created_at < router_started_at
        stale_by_age = (
            updated_at is not None and (now - updated_at) > timedelta(seconds=30)
        ) or (
            updated_at is None and created_at is not None and (now - created_at) > timedelta(seconds=30)
        )
        if not (stale_by_restart or stale_by_age):
            return payload

        _update_upload_job(
            job_id,
            status="failed",
            stage="failed",
            progress_pct=100.0,
            message=(
                "Upload tracking was interrupted by a restart. "
                "Please rerun Check file or start a fresh upload."
            ),
            error="upload_tracker_stale_after_restart",
        )
        refreshed = _read_upload_job(job_id) or payload
        if isinstance(refreshed, dict):
            refreshed["stale_after_restart"] = True
        return refreshed

    def _deferred_full_analysis_enabled() -> bool:
        return os.getenv("JIN_UPLOAD_DEFERRED_FULL_ANALYSIS", "true").strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

    def _deferred_full_analysis_max_runs() -> int:
        try:
            configured = int(os.getenv("JIN_UPLOAD_DEFERRED_MAX_RUNS", "5000"))
        except ValueError:
            configured = 5000
        return max(configured, 100)

    def _load_reference_rows_for_analysis(
        endpoint_path: str,
        dimension_fields: list[str],
        kpi_fields: list[str],
        limit_rows: int | None = None,
    ) -> list[dict[str, Any]]:
        conn, lock = connection_and_lock()
        with lock:
            rows = conn.execute(
                """
                SELECT grain_key, kpi_field, expected_value, tolerance_pct
                FROM jin_reference
                WHERE endpoint_path = ?
                ORDER BY grain_key, kpi_field
                """,
                [endpoint_path],
            ).fetchall()
        grouped: dict[str, dict[str, Any]] = {}
        for grain_key, kpi_field, expected_value, tolerance_pct in rows:
            if limit_rows and grain_key not in grouped and len(grouped) >= limit_rows:
                continue
            if grain_key not in grouped:
                dimensions: dict[str, Any] = {}
                parts = str(grain_key or "").split("|")
                for part in parts[1:]:
                    if "=" not in part:
                        continue
                    key, value = part.split("=", 1)
                    dimensions[key] = value
                grouped[grain_key] = {
                    "endpoint": endpoint_path,
                    "dimension_fields": dimension_fields,
                    "kpi_fields": kpi_fields,
                    "tolerance_pct": float(tolerance_pct or 10.0),
                    "dimensions": dimensions,
                    "expected": {},
                }
            grouped[grain_key]["expected"][str(kpi_field)] = float(expected_value)
            if tolerance_pct is not None:
                grouped[grain_key]["tolerance_pct"] = float(tolerance_pct)

        normalized = list(grouped.values())
        if limit_rows is not None and limit_rows > 0:
            return normalized[:limit_rows]
        return normalized

    async def _run_upload_followup_analysis(
        job_id: str,
        endpoint_path: str,
        *,
        dimension_fields: list[str],
        kpi_fields: list[str],
        total_rows: int,
    ) -> None:
        started_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
        _update_upload_job(
            job_id,
            followup_status="running",
            followup_message="Running deferred full analysis on uploaded baseline rows.",
            followup_started_at=started_at,
            followup_finished_at=None,
        )
        try:
            max_runs = _deferred_full_analysis_max_runs()
            normalized_rows = _load_reference_rows_for_analysis(
                endpoint_path,
                list(dimension_fields),
                list(kpi_fields),
                limit_rows=max_runs,
            )
            if not normalized_rows:
                raise RuntimeError("No uploaded baseline rows were available for deferred analysis.")
            analysis = await _run_upload_analysis_with_cap(
                endpoint_path,
                normalized_rows,
                len(normalized_rows),
            )
            analysis["issues_sync"] = sync_upload_analysis_runtime_issues(endpoint_path, analysis)
            completed_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
            capped = int(total_rows or 0) > len(normalized_rows)
            if capped:
                analysis["sampling_note"] = (
                    f"Deferred full analysis reviewed {len(normalized_rows)} rows out of {int(total_rows or 0)} "
                    "total uploaded rows. Increase JIN_UPLOAD_DEFERRED_MAX_RUNS to cover all rows."
                )
            analysis["deferred"] = True
            analysis["deferred_total_rows"] = int(total_rows or len(normalized_rows))
            analysis["deferred_analyzed_rows"] = len(normalized_rows)
            analysis["deferred_capped"] = capped
            analysis["deferred_completed_at"] = completed_at
            _augment_upload_job_result(
                job_id,
                {
                    "full_analysis": analysis,
                    "full_analysis_issues": analysis.get("issues_sync"),
                },
            )
            _update_upload_job(
                job_id,
                followup_status="completed",
                followup_message=(
                    f"Deferred full analysis completed on {len(normalized_rows)} uploaded row(s)."
                    if not capped
                    else (
                        f"Deferred full analysis completed on {len(normalized_rows)} row(s); "
                        f"{int(total_rows or 0) - len(normalized_rows)} row(s) were skipped by cap."
                    )
                ),
                followup_finished_at=completed_at,
            )
        except Exception as exc:
            _update_upload_job(
                job_id,
                followup_status="failed",
                followup_message=f"Deferred full analysis failed: {exc}",
                followup_finished_at=datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "),
            )
        finally:
            upload_followup_tasks.pop(job_id, None)

    async def run_upload_reference_pipeline(
        endpoint_path: str,
        *,
        upload_path: str,
        filename: str,
        app_version: str | None,
        file_size_bytes: int | None = None,
        progress_hook: Callable[[str, float, str, dict[str, Any] | None], Awaitable[None]] | None = None,
    ) -> dict[str, Any]:
        metadata = endpoint_metadata_runtime_only(endpoint_path)
        if file_size_bytes is None:
            try:
                file_size_bytes = int(Path(upload_path).stat().st_size)
            except Exception:
                file_size_bytes = 0
        source = "excel" if filename.endswith(".xlsx") else "csv"
        meta_dimension_fields = list(metadata.get("dimension_fields") or [])
        meta_kpi_fields = list(metadata.get("kpi_fields") or [])
        inferred_role_warnings: list[str] = []
        field_names = {field["name"] for field in metadata["fields"] if field.get("name")}

        def build_size_warnings(rows_in_file: int, columns_in_file: int) -> tuple[list[str], bool]:
            size_warnings: list[str] = []
            if file_size_bytes >= 10 * 1024 * 1024:
                size_warnings.append("Large file detected (>10 MB). Validation may take longer.")
            if rows_in_file >= 50000:
                size_warnings.append("High row volume detected (>50k rows). Processing will prioritize correctness over speed.")
            if columns_in_file >= 120:
                size_warnings.append("Wide table detected (>120 columns). Keep only required segment/metric columns for faster uploads.")
            return size_warnings, bool(size_warnings)

        def add_technical_defaults(raw_rows: list[dict[str, Any]]) -> None:
            for raw_row in raw_rows:
                internal_format = {"endpoint", "dimension_fields", "kpi_fields"}.issubset(raw_row.keys())
                for field in TECHNICAL_METADATA_FIELDS:
                    if field not in meta_dimension_fields:
                        continue
                    grain_key = f"grain_{field}" if internal_format else field
                    if grain_key in raw_row or field in raw_row:
                        continue
                    raw_row[grain_key] = default_technical_metadata_value(field, app_version)

        force_chunked_mode = os.getenv("JIN_UPLOAD_FORCE_CHUNKED", "").lower() in {"1", "true", "yes", "on"}
        use_chunked_csv_mode = bool(filename.endswith(".csv") and (force_chunked_mode or file_size_bytes >= 5 * 1024 * 1024))
        try:
            configured_chunk_rows = int(os.getenv("JIN_UPLOAD_CHUNK_ROWS", "2000"))
        except ValueError:
            configured_chunk_rows = 2000
        chunk_rows = max(configured_chunk_rows, 200)
        try:
            configured_analysis_cap = int(os.getenv("JIN_UPLOAD_ANALYSIS_SAMPLE_ROWS", "200"))
        except ValueError:
            configured_analysis_cap = 200
        analysis_row_cap = max(configured_analysis_cap, 25)
        try:
            configured_analysis_max_runs = int(os.getenv("JIN_UPLOAD_ANALYSIS_MAX_RUNS", "500"))
        except ValueError:
            configured_analysis_max_runs = 500
        analysis_max_runs = max(configured_analysis_max_runs, 25)

        if progress_hook is not None:
            await progress_hook("parsing", 8.0, "Reading uploaded file.", None)
        if use_chunked_csv_mode:
            if progress_hook is not None:
                await progress_hook(
                    "validating",
                    16.0,
                    f"Validating large CSV in chunks of {chunk_rows} rows.",
                    None,
                )
            rows_in_file = 0
            columns_in_file = 0
            chunk: list[dict[str, Any]] = []
            dimension_fields: list[str] | None = None
            kpi_fields: list[str] | None = None
            normalized_for_analysis: list[dict[str, Any]] = []
            warnings: list[str] = []
            warning_set: set[str] = set()
            imported = 0
            config_persisted = False
            references_reset = False
            expected_fields = (
                expected_upload_columns(meta_dimension_fields, meta_kpi_fields)
                if meta_dimension_fields and meta_kpi_fields
                else None
            )

            def add_warning(message: str) -> None:
                if message and message not in warning_set:
                    warning_set.add(message)
                    warnings.append(message)

            add_warning("Large CSV processed in chunked mode for stable baseline ingestion.")

            async def process_chunk(raw_chunk: list[dict[str, Any]], chunk_index: int) -> None:
                nonlocal dimension_fields, kpi_fields, imported, config_persisted, expected_fields, references_reset
                if not raw_chunk:
                    return
                if not meta_dimension_fields or not meta_kpi_fields:
                    inferred_dims, inferred_kpis, new_warnings = infer_roles_from_upload_rows(
                        raw_chunk,
                        metadata.get("fields") or [],
                        meta_dimension_fields,
                        meta_kpi_fields,
                    )
                    if inferred_dims and inferred_kpis:
                        meta_dimension_fields[:] = inferred_dims
                        meta_kpi_fields[:] = inferred_kpis
                        expected_fields = expected_upload_columns(meta_dimension_fields, meta_kpi_fields)
                    for warning in new_warnings:
                        if warning not in inferred_role_warnings:
                            inferred_role_warnings.append(warning)
                if not field_names and (meta_dimension_fields or meta_kpi_fields):
                    field_names.update(meta_dimension_fields)
                    field_names.update(meta_kpi_fields)
                add_technical_defaults(raw_chunk)
                try:
                    batch_dims, batch_kpis, batch_normalized, batch_warnings = validate_upload_rows(
                        raw_chunk,
                        field_names,
                        expected_fields=expected_fields,
                        endpoint=endpoint_path,
                        dimension_fields=meta_dimension_fields,
                        kpi_fields=meta_kpi_fields,
                        technical_defaults={"api_version": app_version} if app_version else None,
                    )
                except Exception as exc:
                    raise UploadProcessingError(
                        {
                            "ok": False,
                            "error": f"Row validation failed: {exc}",
                            "rows_in_file": rows_in_file,
                            "columns_in_file": columns_in_file,
                            "file_size_bytes": file_size_bytes,
                            "is_large_upload": True,
                            "warnings": warnings,
                        },
                        status_code=400,
                    ) from exc

                for warning in inferred_role_warnings:
                    add_warning(str(warning))
                for item in batch_warnings:
                    add_warning(str(item))

                if dimension_fields is None:
                    dimension_fields = list(batch_dims)
                    kpi_fields = list(batch_kpis)
                elif list(batch_dims) != list(dimension_fields) or list(batch_kpis) != list(kpi_fields or []):
                    raise UploadProcessingError(
                        {
                            "ok": False,
                            "error": "Row validation failed: Upload schema changed between chunks.",
                            "rows_in_file": rows_in_file,
                            "columns_in_file": columns_in_file,
                            "file_size_bytes": file_size_bytes,
                            "is_large_upload": True,
                            "warnings": warnings,
                        },
                        status_code=400,
                    )

                for normalized_row in batch_normalized:
                    if normalized_row["endpoint"] != endpoint_path:
                        mismatch = f"Upload row endpoint {normalized_row['endpoint']} does not match target {endpoint_path}"
                        raise UploadProcessingError(
                            {
                                "ok": False,
                                "error": mismatch,
                                "detail": mismatch,
                                "rows_in_file": rows_in_file,
                                "columns_in_file": columns_in_file,
                                "file_size_bytes": file_size_bytes,
                                "is_large_upload": True,
                                "warnings": warnings,
                            },
                            status_code=400,
                        )

                if not config_persisted and batch_normalized:
                    _persist_upload_config(
                        endpoint_path,
                        list(dimension_fields or []),
                        list(kpi_fields or []),
                        float(batch_normalized[0].get("tolerance_pct", 10.0)),
                    )
                    config_persisted = True

                if not references_reset and batch_normalized:
                    _clear_endpoint_references(endpoint_path)
                    references_reset = True

                imported += _persist_normalized_rows(
                    endpoint_path,
                    list(dimension_fields or []),
                    batch_normalized,
                    source,
                )
                if len(normalized_for_analysis) < analysis_row_cap:
                    remaining = analysis_row_cap - len(normalized_for_analysis)
                    normalized_for_analysis.extend(batch_normalized[:remaining])
                if progress_hook is not None:
                    progress = min(78.0, 24.0 + (chunk_index * 3.5))
                    await progress_hook(
                        "importing",
                        progress,
                        f"Processed {rows_in_file} row(s) so far.",
                        {
                            "rows_in_file": rows_in_file,
                            "columns_in_file": columns_in_file,
                            "file_size_bytes": file_size_bytes,
                            "is_large_upload": True,
                        },
                    )

            try:
                with Path(upload_path).open("rb") as binary_stream:
                    text_stream = io.TextIOWrapper(binary_stream, encoding="utf-8", newline="")
                    reader = csv.DictReader(text_stream)
                    columns_in_file = len(reader.fieldnames or [])
                    chunk_index = 0
                    for raw_row in reader:
                        rows_in_file += 1
                        chunk.append(dict(raw_row))
                        if len(chunk) >= chunk_rows:
                            chunk_index += 1
                            await process_chunk(chunk, chunk_index)
                            chunk = []
                    if chunk:
                        chunk_index += 1
                        await process_chunk(chunk, chunk_index)
            except UploadProcessingError:
                raise
            except Exception as exc:
                raise UploadProcessingError(
                    {
                        "ok": False,
                        "error": f"Could not read uploaded document: {exc}",
                        "rows_in_file": rows_in_file,
                        "columns_in_file": columns_in_file,
                        "file_size_bytes": file_size_bytes,
                        "is_large_upload": False,
                        "warnings": warnings,
                    },
                    status_code=400,
                ) from exc

            if rows_in_file == 0 or dimension_fields is None or kpi_fields is None:
                raise UploadProcessingError(
                    {
                        "ok": False,
                        "error": "Row validation failed: Empty file",
                        "rows_in_file": 0,
                        "columns_in_file": columns_in_file,
                        "file_size_bytes": file_size_bytes,
                        "is_large_upload": False,
                        "warnings": warnings,
                    },
                    status_code=400,
                )

            size_warnings, is_large_upload = build_size_warnings(rows_in_file, columns_in_file)
            for message in size_warnings:
                add_warning(message)
            upload_shape = {
                "rows_in_file": rows_in_file,
                "columns_in_file": columns_in_file,
                "file_size_bytes": file_size_bytes,
                "is_large_upload": is_large_upload,
            }
            existing_overrides = middleware._load_overrides(endpoint_path)
            middleware.override_state[endpoint_path] = {
                **(existing_overrides if isinstance(existing_overrides, dict) else {}),
                "dimension_fields": dimension_fields,
                "kpi_fields": kpi_fields,
                "tolerance_pct": normalized_for_analysis[0]["tolerance_pct"] if normalized_for_analysis else 10.0,
                "confirmed": True,
            }

            if rows_in_file > len(normalized_for_analysis):
                add_warning(
                    f"Upload analysis reviewed {len(normalized_for_analysis)} of {rows_in_file} rows. "
                    "Increase JIN_UPLOAD_ANALYSIS_SAMPLE_ROWS for deeper immediate validation."
                )
            if progress_hook is not None:
                await progress_hook(
                    "analyzing",
                    86.0,
                    "Running checks against sampled rows from this upload.",
                    upload_shape,
                )
            analysis = await _run_upload_analysis_with_cap(
                endpoint_path,
                normalized_for_analysis,
                min(len(normalized_for_analysis), analysis_max_runs),
            )
            analysis["issues_sync"] = sync_upload_analysis_runtime_issues(endpoint_path, analysis)
            analysis["requested_grains"] = rows_in_file
            analysis["sampling_note"] = (
                f"Upload analysis used {len(normalized_for_analysis)} sampled row(s) "
                f"from {rows_in_file} uploaded row(s)."
            )
            sampled = rows_in_file > len(normalized_for_analysis)
            return {
                "ok": True,
                "rows": rows_in_file,
                **upload_shape,
                "imported": imported,
                "dimension_fields": dimension_fields,
                "kpi_fields": kpi_fields,
                "warnings": warnings,
                "analysis": analysis,
                "analysis_sampled": sampled,
                "analysis_sample_rows": len(normalized_for_analysis),
                "analysis_total_rows": rows_in_file,
            }

        try:
            if filename.endswith(".xlsx"):
                rows = parse_xlsx_upload_path(upload_path)
            else:
                rows = parse_csv_upload_path(upload_path)
        except Exception as exc:
            raise UploadProcessingError(
                {
                    "ok": False,
                    "error": f"Could not read uploaded document: {exc}",
                    "rows_in_file": 0,
                    "columns_in_file": 0,
                    "file_size_bytes": file_size_bytes,
                    "is_large_upload": False,
                    "warnings": [],
                },
                status_code=400,
            ) from exc

        rows_in_file = len(rows)
        columns_in_file = len(rows[0].keys()) if rows else 0
        size_warnings, is_large_upload = build_size_warnings(rows_in_file, columns_in_file)
        upload_shape = {
            "rows_in_file": rows_in_file,
            "columns_in_file": columns_in_file,
            "file_size_bytes": file_size_bytes,
            "is_large_upload": is_large_upload,
        }
        if progress_hook is not None:
            await progress_hook(
                "validating",
                32.0,
                f"Validating upload rows ({rows_in_file} row(s)).",
                upload_shape,
            )

        if not meta_dimension_fields or not meta_kpi_fields:
            inferred_dims, inferred_kpis, new_warnings = infer_roles_from_upload_rows(
                rows,
                metadata.get("fields") or [],
                meta_dimension_fields,
                meta_kpi_fields,
            )
            if inferred_dims and inferred_kpis:
                meta_dimension_fields = inferred_dims
                meta_kpi_fields = inferred_kpis
            for warning in new_warnings:
                if warning not in inferred_role_warnings:
                    inferred_role_warnings.append(warning)
        if not field_names and (meta_dimension_fields or meta_kpi_fields):
            field_names.update(meta_dimension_fields)
            field_names.update(meta_kpi_fields)

        add_technical_defaults(rows)
        try:
            native_validation_error: str | None = None
            validation: dict[str, object] | None = None
            if validate_reference_rows is not None:
                try:
                    validation = json.loads(
                        call_native(
                            validate_reference_rows,
                            json.dumps(sorted(field_names)),
                            json.dumps(rows),
                            None,
                        )
                    )
                except Exception as exc:
                    native_validation_error = str(exc)
            if validation is not None:
                dimension_fields = validation["dimension_fields"]
                kpi_fields = validation["kpi_fields"]
                normalized = validation["normalized"]
                warnings = validation["warnings"]
                if native_validation_error:
                    warnings.append(
                        "Native validation failed; Python fallback was used for flexible upload parsing."
                    )
            else:
                dimension_fields, kpi_fields, normalized, warnings = validate_upload_rows(
                    rows,
                    field_names,
                    endpoint=endpoint_path,
                    dimension_fields=meta_dimension_fields,
                    kpi_fields=meta_kpi_fields,
                    technical_defaults={"api_version": app_version} if app_version else None,
                )
                if native_validation_error:
                    warnings.append(
                        "Native validation failed; Python fallback was used for flexible upload parsing."
                    )
        except Exception as exc:
            raise UploadProcessingError(
                {
                    "ok": False,
                    "error": f"Row validation failed: {exc}",
                    **upload_shape,
                    "warnings": size_warnings,
                },
                status_code=400,
            ) from exc

        warnings = [*inferred_role_warnings, *warnings, *size_warnings]
        existing_overrides = middleware._load_overrides(endpoint_path)
        middleware.override_state[endpoint_path] = {
            **(existing_overrides if isinstance(existing_overrides, dict) else {}),
            "dimension_fields": dimension_fields,
            "kpi_fields": kpi_fields,
            "tolerance_pct": normalized[0]["tolerance_pct"] if normalized else 10.0,
            "confirmed": True,
        }
        for row in normalized:
            if row["endpoint"] != endpoint_path:
                mismatch = f"Upload row endpoint {row['endpoint']} does not match target {endpoint_path}"
                raise UploadProcessingError(
                    {
                        "ok": False,
                        "error": mismatch,
                        "detail": mismatch,
                        **upload_shape,
                        "warnings": warnings,
                    },
                    status_code=400,
                )

        if progress_hook is not None:
            await progress_hook(
                "importing",
                65.0,
                f"Saving {len(normalized)} validated baseline row(s).",
                upload_shape,
            )

        if import_reference_rows is not None:
            try:
                _clear_endpoint_references(endpoint_path)
                payload = json.loads(
                    call_native(
                        import_reference_rows,
                        middleware.db_path,
                        endpoint_path,
                        json.dumps(dimension_fields),
                        json.dumps(kpi_fields),
                        json.dumps(normalized),
                        source,
                    )
                )
                if progress_hook is not None:
                    await progress_hook(
                        "analyzing",
                        86.0,
                        "Running checks against live API responses.",
                        upload_shape,
                    )
                payload["warnings"] = warnings
                if len(normalized) > analysis_max_runs:
                    payload["warnings"] = [
                        *payload["warnings"],
                        f"Upload analysis reviewed {analysis_max_runs} of {len(normalized)} rows. "
                        "Increase JIN_UPLOAD_ANALYSIS_MAX_RUNS for deeper immediate validation.",
                    ]
                payload["analysis"] = await _run_upload_analysis_with_cap(
                    endpoint_path,
                    normalized,
                    min(len(normalized), analysis_max_runs),
                )
                analysis_payload = payload.get("analysis")
                if isinstance(analysis_payload, dict):
                    analysis_payload["issues_sync"] = sync_upload_analysis_runtime_issues(
                        endpoint_path, analysis_payload
                    )
                payload.update(upload_shape)
                payload["analysis_sampled"] = len(normalized) > analysis_max_runs
                payload["analysis_sample_rows"] = min(len(normalized), analysis_max_runs)
                payload["analysis_total_rows"] = len(normalized)
                return payload
            except Exception as exc:
                record_router_error(
                    "router.upload",
                    "Native upload import failed; using Python import path instead.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    hint="Review the uploaded template columns and stored schema contract.",
                )

        _persist_upload_config(
            endpoint_path,
            list(dimension_fields),
            list(kpi_fields),
            float(normalized[0].get("tolerance_pct", 10.0) if normalized else 10.0),
        )
        imported = _persist_normalized_rows(
            endpoint_path,
            list(dimension_fields),
            normalized,
            source,
            replace_existing=True,
        )
        if progress_hook is not None:
            await progress_hook(
                "analyzing",
                86.0,
                "Running checks against live API responses.",
                upload_shape,
            )
        analysis = await _run_upload_analysis_with_cap(
            endpoint_path,
            normalized,
            min(len(normalized), analysis_max_runs),
        )
        analysis["issues_sync"] = sync_upload_analysis_runtime_issues(endpoint_path, analysis)
        return {
            "ok": True,
            "rows": len(rows),
            **upload_shape,
            "imported": imported,
            "dimension_fields": dimension_fields,
            "kpi_fields": kpi_fields,
            "warnings": [
                *warnings,
                *(
                    [
                        f"Upload analysis reviewed {analysis_max_runs} of {len(normalized)} rows. "
                        "Increase JIN_UPLOAD_ANALYSIS_MAX_RUNS for deeper immediate validation."
                    ]
                    if len(normalized) > analysis_max_runs
                    else []
                ),
            ],
            "analysis": analysis,
            "analysis_sampled": len(normalized) > analysis_max_runs,
            "analysis_sample_rows": min(len(normalized), analysis_max_runs),
            "analysis_total_rows": len(normalized),
        }

    @router.post("/api/upload-preview/{path:path}")
    @router.post("/api/v2/upload-preview/{path:path}")
    async def upload_preview(path: str, file: UploadFile = File(...), request: Request = None) -> JSONResponse:
        """Parse and validate an upload file without committing it to the database.

        Returns a preview payload suitable for showing to the user before they confirm.
        """
        require_auth(request, api=True)
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        blocked = _require_v2_setup_ready(endpoint_path, request, action_text="checking this file")
        if blocked is not None:
            return blocked
        metadata = endpoint_metadata_runtime_only(endpoint_path)
        filename = str(file.filename or "").lower()
        try:
            staged_path, file_size_bytes = await _stage_upload_file(file, filename)
        except Exception as exc:  # pragma: no cover
            return JSONResponse(
                {
                    "ok": False,
                    "error": f"Could not read file: {exc}",
                    "rows_found": 0,
                    "rows_in_file": 0,
                    "columns_in_file": 0,
                    "file_size_bytes": 0,
                    "is_large_upload": False,
                    "groups_detected": [],
                    "metrics_detected": [],
                    "sample_rows": [],
                    "warnings": [],
                },
                status_code=422,
            )
        try:
            rows = parse_xlsx_upload_path(staged_path) if filename.endswith(".xlsx") else parse_csv_upload_path(staged_path)
        except Exception as exc:  # pragma: no cover
            return JSONResponse(
                {
                    "ok": False,
                    "error": f"Could not read file: {exc}",
                    "rows_found": 0,
                    "rows_in_file": 0,
                    "columns_in_file": 0,
                    "file_size_bytes": file_size_bytes,
                    "is_large_upload": False,
                    "groups_detected": [],
                    "metrics_detected": [],
                    "sample_rows": [],
                    "warnings": [],
                },
                status_code=422,
            )
        finally:
            try:
                Path(staged_path).unlink(missing_ok=True)
            except Exception:
                pass
        rows_in_file = len(rows)
        columns_in_file = len(rows[0].keys()) if rows else 0
        size_warnings: list[str] = []
        if file_size_bytes >= 10 * 1024 * 1024:
            size_warnings.append("Large file detected (>10 MB). Validation may take longer.")
        if rows_in_file >= 50000:
            size_warnings.append("High row volume detected (>50k rows). Processing will prioritize correctness over speed.")
        if columns_in_file >= 120:
            size_warnings.append("Wide table detected (>120 columns). Keep only required segment/metric columns for faster uploads.")
        is_large_upload = bool(size_warnings)
        dimension_fields = list(metadata.get("dimension_fields") or [])
        kpi_fields = list(metadata.get("kpi_fields") or [])
        inferred_role_warnings: list[str] = []
        field_names = {field["name"] for field in metadata["fields"] if field.get("name")}
        app_version = getattr(request.app, "version", None)

        if not dimension_fields or not kpi_fields:
            inferred_dims, inferred_kpis, new_warnings = infer_roles_from_upload_rows(
                rows,
                metadata.get("fields") or [],
                dimension_fields,
                kpi_fields,
            )
            if inferred_dims and inferred_kpis:
                dimension_fields = inferred_dims
                kpi_fields = inferred_kpis
            for warning in new_warnings:
                if warning not in inferred_role_warnings:
                    inferred_role_warnings.append(warning)
        if not field_names and (dimension_fields or kpi_fields):
            field_names.update(dimension_fields)
            field_names.update(kpi_fields)

        for row in rows:
            internal_format = {"endpoint", "dimension_fields", "kpi_fields"}.issubset(row.keys())
            for field in TECHNICAL_METADATA_FIELDS:
                if field not in dimension_fields:
                    continue
                grain_key = f"grain_{field}" if internal_format else field
                if grain_key in row or field in row:
                    continue
                row[grain_key] = default_technical_metadata_value(field, app_version)
        try:
            native_validation_error: str | None = None
            validation: dict[str, object] | None = None
            if validate_reference_rows is not None:
                try:
                    validation = json.loads(
                        call_native(
                            validate_reference_rows,
                            json.dumps(sorted(field_names)),
                            json.dumps(rows),
                            None,
                        )
                    )
                except Exception as exc:  # pragma: no cover
                    native_validation_error = str(exc)
            if validation is not None:
                dim_fields = validation["dimension_fields"]
                kpi_fields_used = validation["kpi_fields"]
                normalized = validation["normalized"]
                warnings = validation["warnings"]
                if native_validation_error:
                    warnings.append(
                        "Native validation failed; Python fallback was used for flexible upload parsing."
                    )
            else:
                expected_fields = (
                    expected_upload_columns(dimension_fields, kpi_fields)
                    if dimension_fields and kpi_fields
                    else None
                )
                dim_fields, kpi_fields_used, normalized, warnings = validate_upload_rows(
                    rows,
                    field_names,
                    expected_fields=expected_fields,
                    endpoint=endpoint_path,
                    dimension_fields=dimension_fields,
                    kpi_fields=kpi_fields,
                    technical_defaults={"api_version": app_version} if app_version else None,
                )
                if native_validation_error:
                    warnings.append(
                        "Native validation failed; Python fallback was used for flexible upload parsing."
                    )
        except Exception as exc:  # pragma: no cover
            plain = str(exc)
            if _is_v2_api_request(request) and "simple template format" in plain.lower():
                snapshot = _setup_snapshot(endpoint_path)
                blockers = _setup_blockers(snapshot)
                if blockers:
                    message = f"Before checking this file, complete setup in Configuration: {', '.join(blockers)}."
                else:
                    blockers = ["save configuration"]
                    message = "Before checking this file, refresh setup in Configuration and save it once."
                return JSONResponse(
                    {
                        "ok": False,
                        "error": message,
                        "setup_blockers": blockers,
                        "setup": snapshot,
                    },
                    status_code=409,
                )
            return JSONResponse(
                {
                    "ok": False,
                    "error": plain,
                    "rows_found": len(rows),
                    "rows_in_file": rows_in_file,
                    "columns_in_file": columns_in_file,
                    "file_size_bytes": file_size_bytes,
                    "is_large_upload": is_large_upload,
                    "groups_detected": [],
                    "metrics_detected": [],
                    "sample_rows": [],
                    "warnings": size_warnings,
                },
                status_code=422,
            )
        warnings = [*inferred_role_warnings, *warnings, *size_warnings]
        sample = normalized[:5]
        sample_rows = [
            {
                "group": " | ".join(f"{k}={v}" for k, v in (entry.get("dimensions") or {}).items()),
                "metrics": entry.get("expected") or {},
                "tolerance_pct": entry.get("tolerance_pct", 10),
            }
            for entry in sample
        ]
        return JSONResponse(
            {
                "ok": True,
                "endpoint_path": endpoint_path,
                "rows_found": len(normalized),
                "rows_in_file": rows_in_file,
                "columns_in_file": columns_in_file,
                "file_size_bytes": file_size_bytes,
                "is_large_upload": is_large_upload,
                "groups_detected": dim_fields,
                "metrics_detected": kpi_fields_used,
                "sample_rows": sample_rows,
                "warnings": warnings,
            }
        )

    @router.post("/api/upload/{path:path}")
    @router.post("/api/v2/upload/{path:path}")
    async def upload_reference(path: str, file: UploadFile = File(...), request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        require_duckdb()
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        blocked = _require_v2_setup_ready(endpoint_path, request, action_text="uploading a baseline file")
        if blocked is not None:
            return blocked
        filename = str(file.filename or "").lower()
        app_version = getattr(request.app if request is not None else middleware.app, "version", None)
        try:
            staged_path, file_size_bytes = await _stage_upload_file(file, filename)
        except Exception as exc:
            return JSONResponse(
                {
                    "ok": False,
                    "error": f"Could not stage upload file: {exc}",
                    "rows_in_file": 0,
                    "columns_in_file": 0,
                    "file_size_bytes": 0,
                    "is_large_upload": False,
                    "warnings": [],
                },
                status_code=400,
            )
        try:
            payload = await run_upload_reference_pipeline(
                endpoint_path,
                upload_path=staged_path,
                filename=filename,
                app_version=app_version,
                file_size_bytes=file_size_bytes,
            )
        except UploadProcessingError as exc:
            return JSONResponse(exc.payload, status_code=exc.status_code)
        finally:
            try:
                Path(staged_path).unlink(missing_ok=True)
            except Exception:
                pass
        return JSONResponse(payload)

    @router.post("/api/upload-async/{path:path}")
    @router.post("/api/v2/upload-async/{path:path}")
    async def upload_reference_async(path: str, file: UploadFile = File(...), request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        require_duckdb()
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        blocked = _require_v2_setup_ready(endpoint_path, request, action_text="starting baseline upload")
        if blocked is not None:
            return blocked
        filename = str(file.filename or "").lower()
        app_version = getattr(request.app if request is not None else middleware.app, "version", None)
        try:
            staged_path, file_size_bytes = await _stage_upload_file(file, filename)
        except Exception as exc:
            return JSONResponse(
                {
                    "ok": False,
                    "error": f"Could not stage upload file: {exc}",
                    "rows_in_file": 0,
                    "columns_in_file": 0,
                    "file_size_bytes": 0,
                    "is_large_upload": False,
                    "warnings": [],
                },
                status_code=400,
            )
        job_id = f"upload-{secrets.token_hex(12)}"
        _create_upload_job(job_id, endpoint_path, filename=filename, file_size_bytes=file_size_bytes)

        async def progress(
            stage: str,
            progress_pct: float,
            message: str,
            shape: dict[str, Any] | None,
        ) -> None:
            _update_upload_job(
                job_id,
                status="running",
                stage=stage,
                progress_pct=progress_pct,
                message=message,
                rows_in_file=(shape or {}).get("rows_in_file"),
                columns_in_file=(shape or {}).get("columns_in_file"),
                is_large_upload=(shape or {}).get("is_large_upload"),
            )

        async def run_job() -> None:
            try:
                payload = await run_upload_reference_pipeline(
                    endpoint_path,
                    upload_path=staged_path,
                    filename=filename,
                    app_version=app_version,
                    file_size_bytes=file_size_bytes,
                    progress_hook=progress,
                )
                _update_upload_job(
                    job_id,
                    status="completed",
                    stage="completed",
                    progress_pct=100.0,
                    message="Upload complete.",
                    rows_in_file=int(payload.get("rows_in_file") or 0),
                    columns_in_file=int(payload.get("columns_in_file") or 0),
                    is_large_upload=bool(payload.get("is_large_upload")),
                    result_payload=payload,
                    error="",
                )
                if bool(payload.get("analysis_sampled")) and _deferred_full_analysis_enabled():
                    metadata = endpoint_metadata_native_first(endpoint_path)
                    dimension_fields = payload.get("dimension_fields")
                    if not isinstance(dimension_fields, list):
                        dimension_fields = metadata.get("dimension_fields") or []
                    kpi_fields = payload.get("kpi_fields")
                    if not isinstance(kpi_fields, list):
                        kpi_fields = metadata.get("kpi_fields") or []
                    total_rows = int(payload.get("analysis_total_rows") or payload.get("rows_in_file") or 0)
                    _update_upload_job(
                        job_id,
                        followup_status="queued",
                        followup_message="Deferred full analysis is queued.",
                    )
                    upload_followup_tasks[job_id] = asyncio.create_task(
                        _run_upload_followup_analysis(
                            job_id,
                            endpoint_path,
                            dimension_fields=list(dimension_fields),
                            kpi_fields=list(kpi_fields),
                            total_rows=total_rows,
                        )
                    )
            except UploadProcessingError as exc:
                payload = exc.payload if isinstance(exc.payload, dict) else {"ok": False, "error": str(exc)}
                _update_upload_job(
                    job_id,
                    status="failed",
                    stage="failed",
                    progress_pct=100.0,
                    message=str(payload.get("error") or "Upload failed."),
                    rows_in_file=int(payload.get("rows_in_file") or 0),
                    columns_in_file=int(payload.get("columns_in_file") or 0),
                    is_large_upload=bool(payload.get("is_large_upload")),
                    result_payload=payload,
                    error=str(payload.get("error") or "Upload failed."),
                )
            except Exception as exc:  # pragma: no cover
                record_router_error(
                    "router.upload_async",
                    "Asynchronous upload pipeline failed.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    hint="Inspect upload file shape and endpoint contract before retrying.",
                )
                _update_upload_job(
                    job_id,
                    status="failed",
                    stage="failed",
                    progress_pct=100.0,
                    message="Upload failed.",
                    result_payload={"ok": False, "error": str(exc)},
                    error=str(exc),
                )
            finally:
                try:
                    Path(staged_path).unlink(missing_ok=True)
                except Exception:
                    pass
                upload_job_tasks.pop(job_id, None)

        upload_job_tasks[job_id] = asyncio.create_task(run_job())
        return JSONResponse(
            {
                "ok": True,
                "job_id": job_id,
                "endpoint_path": endpoint_path,
                "status": "queued",
                "stage": "queued",
                "progress_pct": 0.0,
                "message": "Upload queued.",
                "filename": filename,
                "file_size_bytes": file_size_bytes,
                "status_url": f"/jin/api/v2/upload-async/{quote(job_id, safe='')}",
            },
            status_code=202,
        )

    @router.get("/api/upload-async/{job_id}")
    @router.get("/api/v2/upload-async/{job_id}")
    async def upload_reference_async_status(job_id: str, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        require_duckdb()
        payload = _read_upload_job(job_id)
        if payload is None:
            raise HTTPException(status_code=404, detail="Upload job not found")
        payload = _mark_upload_tracker_stale_if_orphaned(payload)
        if payload is None:
            raise HTTPException(status_code=404, detail="Upload job not found")
        payload["task_active"] = _task_active(upload_job_tasks, job_id)
        payload["followup_task_active"] = _task_active(upload_followup_tasks, job_id)
        return JSONResponse(payload)

    @router.get("/api/upload-async/latest/{path:path}")
    @router.get("/api/v2/upload-async/latest/{path:path}")
    async def upload_reference_async_latest(path: str, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        require_duckdb()
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        payload = _read_latest_upload_job(endpoint_path)
        if payload is None:
            return JSONResponse({"ok": True, "job": None, "endpoint_path": endpoint_path})
        payload = _mark_upload_tracker_stale_if_orphaned(payload)
        if payload is None:
            return JSONResponse({"ok": True, "job": None, "endpoint_path": endpoint_path})
        job_id = str(payload.get("job_id") or "")
        payload["task_active"] = _task_active(upload_job_tasks, job_id)
        payload["followup_task_active"] = _task_active(upload_followup_tasks, job_id)
        return JSONResponse(payload)

    @router.post("/api/upload-analysis/issues/{path:path}")
    @router.post("/api/v2/upload-analysis/issues/{path:path}")
    async def upload_analysis_to_issues(path: str, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        endpoint_record_or_404(endpoint_path)
        latest_analysis, _history = upload_analysis_payload_for(endpoint_path)
        if not isinstance(latest_analysis, dict):
            return JSONResponse(
                {
                    "ok": False,
                    "endpoint_path": endpoint_path,
                    "created": 0,
                    "candidates": 0,
                    "message": "No upload analysis is available for this API yet.",
                },
                status_code=404,
            )
        return JSONResponse(materialize_upload_analysis_runtime_issues(endpoint_path, latest_analysis))

    @router.get("/template/{path:path}.csv")
    async def template_csv(path: str, request: Request = None) -> Response:
        require_auth(request, api=True)
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        metadata = endpoint_metadata_runtime_only(endpoint_path)
        data = generate_csv_template(
            endpoint_path,
            list(metadata["dimension_fields"]),
            list(metadata["kpi_fields"]),
            list(metadata.get("fields") or []),
        )
        return Response(data, media_type="text/csv")

    @router.get("/template/{path:path}.xlsx")
    async def template_xlsx(path: str, request: Request = None) -> Response:
        require_auth(request, api=True)
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        metadata = endpoint_metadata_runtime_only(endpoint_path)
        data = generate_xlsx_template(
            endpoint_path,
            list(metadata["dimension_fields"]),
            list(metadata["kpi_fields"]),
            list(metadata.get("fields") or []),
        )
        return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

    @router.post("/api/promote-baseline/{path:path}")
    @router.post("/api/v2/promote-baseline/{path:path}")
    async def promote_baseline_endpoint(path: str, request: Request) -> JSONResponse:
        require_auth(request, api=True)
        require_duckdb()
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        if promote_baseline is not None:
            try:
                native_response = json.loads(call_native(promote_baseline, middleware.db_path, endpoint_path))
                return JSONResponse(native_response)
            except Exception as exc:
                return JSONResponse({"status": "error", "message": str(exc)}, status_code=500)
        return JSONResponse({"status": "error", "message": "Native core required for baseline promotion."}, status_code=400)

    @router.get("/api/anomalies")
    @router.get("/api/v2/anomalies")
    async def anomalies(request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        history_rows: list[dict[str, object]] | None = None
        if issues_list is not None:
            try:
                history = json.loads(call_native(issues_list, middleware.db_path, None, None))
                for item in history:
                    item["status"] = incident_status_for(
                        str(item.get("status") or "active") != "resolved",
                        str(item.get("incident_status") or item.get("status") or "active"),
                        item.get("snoozed_until"),
                        item.get("suppressed_until"),
                    )
                if history:
                    history_rows = history
            except Exception:  # pragma: no cover
                pass
        if history_rows is None and duckdb is not None:  # pragma: no branch
            try:
                history = load_anomaly_rows()
                if history:
                    history_rows = history
            except Exception:  # pragma: no cover
                pass


        if history_rows is None and get_active_anomalies is not None:
            try:
                active = json.loads(call_native(get_active_anomalies, middleware.db_path)).get("anomalies", [])
                for item in active:
                    item["status"] = incident_status_for(
                        True,
                        str(item.get("incident_status") or item.get("status") or "active"),
                        item.get("snoozed_until"),
                        item.get("suppressed_until"),
                    )
                active = [item for item in active if item.get("status") != "resolved"]
                if active:
                    history_rows = active
            except Exception:  # pragma: no cover
                pass
        if history_rows is None:
            history_rows = runtime_enriched_anomalies(True)  # pragma: no cover

        for path in middleware.endpoint_registry.keys():
            ensure_runtime_upload_issues_loaded(path)

        # Upload-analysis issues are runtime-only today; merge them into the issues feed
        # so users can review them in the same page.
        runtime_upload_rows = [
            item
            for item in runtime_enriched_anomalies(True)
            if str(item.get("detection_method") or "") == "upload_validation"
        ]
        if runtime_upload_rows:
            seen = {
                (
                    str(item.get("endpoint_path") or ""),
                    str(item.get("grain_key") or ""),
                    str(item.get("kpi_field") or ""),
                    str(item.get("detected_at") or ""),
                    str(item.get("detection_method") or ""),
                )
                for item in history_rows
            }
            merged = list(history_rows)
            for item in runtime_upload_rows:
                key = (
                    str(item.get("endpoint_path") or ""),
                    str(item.get("grain_key") or ""),
                    str(item.get("kpi_field") or ""),
                    str(item.get("detected_at") or ""),
                    str(item.get("detection_method") or ""),
                )
                if key in seen:
                    continue
                merged.append(item)
                seen.add(key)
            merged.sort(
                key=lambda item: str(item.get("detected_at") or item.get("resolved_at") or ""),
                reverse=True,
            )
            history_rows = merged

        resolved_ids = {
            int(anomaly_id)
            for anomaly_id, incident in middleware.incident_state.items()
            if str(incident.get("incident_status") or incident.get("status") or "").lower() == "resolved"
        }
        for endpoint_state in middleware.runtime_state.values():
            for item in endpoint_state.get("anomalies", []):
                if not item.get("is_active"):
                    resolved_ids.add(int(item.get("id") or 0))
        active = [
            item
            for item in history_rows
            if item.get("status") != "resolved" and int(item.get("id") or 0) not in resolved_ids
        ]
        return JSONResponse(
            jsonable_encoder({"anomalies": active, "history": history_rows[:50]})
        )

    @router.get("/api/scheduler")
    @router.get("/api/v2/scheduler")
    async def scheduler_status(request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        jobs = middleware.scheduler_snapshot()
        summary = {
            "total_jobs": len(jobs),
            "paused_jobs": sum(1 for item in jobs if item.get("paused")),
            "skipped_jobs": sum(1 for item in jobs if item.get("last_status") == "skipped"),
            "failing_jobs": sum(1 for item in jobs if item.get("last_status") == "error"),
        }
        return JSONResponse({"jobs": jobs, "running": middleware.scheduler.running, "summary": summary})

    @router.post("/api/scheduler/{job_id:path}/pause")
    @router.post("/api/v2/scheduler/{job_id:path}/pause")
    async def pause_scheduler_job(job_id: str, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        decoded = unquote(job_id)
        if not middleware.scheduler.pause(decoded):
            raise HTTPException(status_code=404, detail="Scheduler job not found")
        return JSONResponse({"ok": True, "job_id": decoded, "paused": True})

    @router.post("/api/scheduler/{job_id:path}/resume")
    @router.post("/api/v2/scheduler/{job_id:path}/resume")
    async def resume_scheduler_job(job_id: str, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        decoded = unquote(job_id)
        if not middleware.scheduler.resume(decoded):
            raise HTTPException(status_code=404, detail="Scheduler job not found")
        return JSONResponse({"ok": True, "job_id": decoded, "paused": False})

    @router.post("/api/scheduler/{job_id:path}/run")
    @router.post("/api/v2/scheduler/{job_id:path}/run")
    async def run_scheduler_job(job_id: str, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        decoded = unquote(job_id)
        if not await middleware.scheduler.run_now(decoded):
            raise HTTPException(status_code=404, detail="Scheduler job not found")
        return JSONResponse({"ok": True, "job_id": decoded, "started": True})

    @router.get("/api/check-runs/{path:path}")
    @router.get("/api/v2/check-runs/{path:path}")
    async def check_runs(path: str, request: Request = None, limit: int = 25) -> JSONResponse:
        require_auth(request, api=True)
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        endpoint_record_or_404(endpoint_path)
        return JSONResponse(
            {
                "endpoint_path": endpoint_path,
                "runs": middleware.list_check_runs(endpoint_path, limit=max(int(limit), 1)),
            }
        )

    @router.post("/api/check/{path:path}")
    @router.post("/api/v2/check/{path:path}")
    async def trigger_manual_check(path: str, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        endpoint_path = "/" + unquote(path).replace("--", "/").lstrip("/")
        blocked = _require_v2_setup_ready(endpoint_path, request, action_text="running a manual check")
        if blocked is not None:
            return blocked
        job_id = f"jin:{endpoint_path}"

        # Try to run the scheduled job first (it handles the endpoint callable logic)
        run_now = middleware.scheduler.run_now
        try:
            scheduled_started = await run_now(job_id, trigger="manual")
        except TypeError:  # pragma: no cover
            scheduled_started = await run_now(job_id)
        if scheduled_started:
            return JSONResponse({"ok": True, "method": "scheduler", "endpoint": endpoint_path})

        # Fallback: Find the record and run it if it exists but isn't scheduled
        record = middleware.endpoint_registry.get(endpoint_path)
        if not record:
            raise HTTPException(status_code=404, detail=f"Endpoint {endpoint_path} not found in registry")
        try:
            result = await middleware.run_watch_check(
                endpoint_path,
                trigger="manual",
                source="manual",
                scheduled_job_id=job_id,
            )
            return JSONResponse(
                {
                    "ok": True,
                    "method": "direct",
                    "endpoint": endpoint_path,
                    "run_id": result.get("run_id"),
                    "status": result.get("status"),
                    "grains_processed": result.get("grains_processed"),
                    "anomalies_detected": result.get("anomalies_detected"),
                }
            )
        except ValueError as exc:
            return JSONResponse({"ok": False, "error": str(exc)}, status_code=400)
        except Exception as exc:
            return JSONResponse({"ok": False, "error": str(exc)}, status_code=500)

    @router.post("/api/anomaly/{anomaly_id}/status")
    @router.post("/api/v2/anomaly/{anomaly_id}/status")
    async def update_anomaly_status(anomaly_id: int, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        payload = await request.json() if request is not None else {}
        action = payload.get("action") or payload.get("status") or "active"
        note = payload.get("note")
        owner = normalize_owner(payload.get("owner"))
        resolution_reason = payload.get("resolution_reason")
        snooze_minutes = int(payload.get("snooze_minutes") or 0)
        until = payload.get("until")
        if action in {"snoozed", "suppressed"} and not until and snooze_minutes > 0:
            until = (now_naive() + timedelta(minutes=snooze_minutes)).isoformat(sep=" ")
        if issues_update is not None:
            try:
                result = json.loads(
                    call_native(
                        issues_update,
                        middleware.db_path,
                        anomaly_id,
                        action,
                        note,
                        owner,
                        resolution_reason,
                        until,
                    )
                )
                if action == "resolved":
                    force_anomaly_resolved(anomaly_id)
                return JSONResponse(result)
            except Exception: # pragma: no cover
                pass
        return JSONResponse(
            apply_anomaly_action(
                anomaly_id,
                action=action,
                note=note,
                owner=owner,
                resolution_reason=resolution_reason,
                until=until,
                snooze_minutes=snooze_minutes,
            )
        )

    @router.post("/api/anomaly/{anomaly_id}/ai-explain")
    @router.post("/api/v2/anomaly/{anomaly_id}/ai-explain")
    async def explain_anomaly_with_ai(anomaly_id: int, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        if not middleware.feature_enabled("ai_chat"):
            raise HTTPException(status_code=403, detail="AI explanations require a business entitlement")
        require_duckdb()
        middleware._ensure_python_schema()

        conn, lock = connection_and_lock()
        explanation = ""
        with lock:
            row = conn.execute(
                """
                SELECT
                  a.id,
                  a.endpoint_path,
                  a.grain_key,
                  a.kpi_field,
                  a.actual_value,
                  a.expected_value,
                  a.pct_change,
                  a.detection_method,
                  CAST(a.detected_at AS VARCHAR),
                  CAST(a.resolved_at AS VARCHAR),
                  a.is_active,
                  a.ai_explanation,
                  s.incident_status,
                  s.note,
                  s.owner,
                  s.resolution_reason,
                  CAST(s.snoozed_until AS VARCHAR),
                  CAST(s.suppressed_until AS VARCHAR),
                  CASE
                    WHEN ABS(a.pct_change) >= 75 THEN 'critical'
                    WHEN ABS(a.pct_change) >= 30 THEN 'high'
                    WHEN ABS(a.pct_change) >= 15 THEN 'medium'
                    ELSE 'low'
                  END AS severity,
                  CASE a.detection_method
                    WHEN 'reference' THEN 0.95
                    WHEN 'statistical' THEN 0.88
                    WHEN 'threshold' THEN 0.75
                    ELSE 0.5
                  END AS confidence
                FROM jin_anomalies a
                LEFT JOIN jin_incident_state s ON s.anomaly_id = a.id
                WHERE a.id = ?
                """,
                [anomaly_id],
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Anomaly not found")
            payload = anomaly_row_to_payload(conn, row)
            explanation = anomaly_reason(payload)
            try:
                conn.execute(
                    "UPDATE jin_anomalies SET ai_explanation = ? WHERE id = ?",
                    [explanation, anomaly_id],
                )
                checkpoint_if_enabled(conn)
            except Exception as exc:
                record_router_error(
                    "router.ai_explain",
                    "Could not persist AI explanation back to DuckDB; returning the generated explanation only.",
                    endpoint_path=str(payload.get("endpoint_path") or ""),
                    detail=str(exc),
                    hint="Check the local DuckDB anomaly table for schema drift or locks.",
                )
            runtime_state = middleware.incident_state.get(anomaly_id, {})
            middleware.incident_state[anomaly_id] = {
                **runtime_state,
                "ai_explanation": explanation,
                "why_flagged": explanation,
            }
            payload["ai_explanation"] = explanation
            payload["why_flagged"] = explanation
            payload["timeline"] = load_incident_events(conn, anomaly_id, payload) + list(runtime_state.get("timeline", []))
            payload["timeline"].sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)
        return JSONResponse(
            jsonable_encoder(
                {
                    "ok": True,
                    "anomaly": payload,
                    "ai_explanation": explanation,
                    "why_flagged": explanation,
                    "feature": "ai_chat",
                }
            )
        )

    @router.post("/api/anomalies/bulk")
    @router.post("/api/v2/anomalies/bulk")
    async def bulk_anomaly_update(request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        payload = await request.json() if request is not None else {}
        anomaly_ids = payload.get("anomaly_ids", [])
        action = payload.get("action") or payload.get("status") or "active"
        note = payload.get("note")
        owner = normalize_owner(payload.get("owner"))
        resolution_reason = payload.get("resolution_reason")
        snooze_minutes = int(payload.get("snooze_minutes") or 0)
        until = payload.get("until")
        if action in {"snoozed", "suppressed"} and not until and snooze_minutes > 0:
            until = (now_naive() + timedelta(minutes=snooze_minutes)).isoformat(sep=" ")
        if issues_update is not None:
            try:
                results = []
                for anomaly_id in anomaly_ids:
                    results.append(
                        json.loads(
                            call_native(
                                issues_update,
                                middleware.db_path,
                                int(anomaly_id),
                                action,
                                note,
                                owner,
                                resolution_reason,
                                until,
                            )
                        )
                    )
                return JSONResponse({"ok": True, "count": len(results), "results": results})
            except Exception: # pragma: no cover
                pass
        results = []
        for anomaly_id in anomaly_ids:
            results.append(
                apply_anomaly_action(
                    int(anomaly_id),
                    action=action,
                    note=note,
                    owner=owner,
                    resolution_reason=resolution_reason,
                    until=until,
                    snooze_minutes=snooze_minutes,
                )
            )
        return JSONResponse({"ok": True, "count": len(results), "results": results})

    @router.post("/api/resolve/{anomaly_id}")
    @router.post("/api/v2/resolve/{anomaly_id}")
    async def resolve_anomaly(anomaly_id: int, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        if issues_update is not None:
            try:
                result = json.loads(call_native(issues_update, middleware.db_path, anomaly_id, "resolved", None, None, None, None))
                force_anomaly_resolved(anomaly_id)
                return JSONResponse(result)
            except Exception: # pragma: no cover
                pass
        return JSONResponse(apply_anomaly_action(anomaly_id, action="resolved"))

    @router.post("/api/anomaly/{anomaly_id}/promote")
    @router.post("/api/v2/anomaly/{anomaly_id}/promote")
    async def promote_individual_anomaly(anomaly_id: int, request: Request = None) -> JSONResponse:
        require_auth(request, api=True)
        require_duckdb()
        promote_fn = globals().get("promote_anomaly_to_baseline")
        if promote_fn is not None:
            try:
                native_response = json.loads(call_native(promote_fn, middleware.db_path, anomaly_id))
                # Also refresh runtime state if needed
                for endpoint_state in middleware.runtime_state.values():
                    for item in endpoint_state.get("anomalies", []):
                        if item["id"] == anomaly_id:
                            item["is_active"] = False
                return JSONResponse(native_response)
            except Exception as exc:
                return JSONResponse({"status": "error", "message": str(exc)}, status_code=500)
        return JSONResponse({"status": "error", "message": "Native core required for anomaly promotion."}, status_code=400)

    return router
