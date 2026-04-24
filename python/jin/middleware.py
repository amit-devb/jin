from __future__ import annotations

import asyncio
import json
import os
import hmac
import hashlib
import inspect
import string
import platform
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta, timezone
from contextlib import contextmanager
from pathlib import Path
from threading import Lock, RLock
from typing import Any, Callable, get_type_hints
import logging
import secrets
import base64
import time
import re

try:
    import fcntl
except ImportError:  # pragma: no cover
    fcntl = None  # type: ignore[assignment]

import anyio
from fastapi import Request, Response
from fastapi.routing import APIRoute
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from jin.config import EndpointModelInfo, build_config_json, build_schema_contract, classify_model
from jin.logger import get_logger
from jin.router import create_router
from jin.scheduler import JinScheduler
from jin.core.license import LicenseClient
from jin.technical_metadata import TECHNICAL_METADATA_FIELDS

try:
    from jin_core import (
        init_db,
        load_saved_endpoint_config,
        promote_baseline,
        process_observation,
        process_observations,
        resolve_endpoint_config,
        sync_registry,
        get_status,
    )
except ImportError:  # pragma: no cover
    init_db = None
    load_saved_endpoint_config = None
    promote_baseline = None
    process_observation = None
    process_observations = None
    resolve_endpoint_config = None
    sync_registry = None
    get_status = None

def _env_truthy(name: str) -> bool:
    return str(os.getenv(name, "")).strip().lower() in {"1", "true", "yes", "on"}


# Operators should be able to force Python-only mode (useful for cross-OS packaging
# and when native storage is unavailable/locked). When disabled, we keep the native
# symbols importable but never call them.
if _env_truthy("JIN_DISABLE_NATIVE"):
    init_db = None
    load_saved_endpoint_config = None
    promote_baseline = None
    process_observation = None
    process_observations = None
    resolve_endpoint_config = None
    sync_registry = None
    get_status = None


_connections: dict[str, tuple[Any, Lock]] = {}
API_V1_SUNSET = "Thu, 31 Dec 2026 23:59:59 GMT"
API_V2_MIGRATION_LINK = '</jin/api/v2/migration>; rel="deprecation"; type="application/json"'


@dataclass
class EndpointRecord:
    method: str
    path: str
    response_model: type[BaseModel] | None
    endpoint_callable: Any
    fields: list[dict[str, Any]]
    dimension_fields: list[str]
    kpi_fields: list[str]
    metrics: list[Any]
    watch_config: dict[str, Any]
    array_field_path: str | None = None
    discovery_status: str = "ready"
    discovery_reason_codes: list[str] = field(default_factory=list)
    request_fields: list[dict[str, Any]] = field(default_factory=list)


class JinMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        db_path: str = "./jin.duckdb",
        global_threshold: float = 10.0,
        auth_callback: Any | None = None,
        exclude_paths: list[str] | None = None,
        log_level: str = "WARNING",
    ) -> None:
        super().__init__(app)
        self.db_path = os.getenv("JIN_DB_PATH", db_path)
        configured_py_db_path = str(os.getenv("JIN_PY_DB_PATH", "")).strip()
        if configured_py_db_path:
            self.py_db_path = configured_py_db_path
        else:
            self.py_db_path = self.db_path
        try:
            db_parent = Path(self.db_path).expanduser().parent
            if str(db_parent) and str(db_parent) != ".":
                db_parent.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass
        try:
            py_parent = Path(self.py_db_path).expanduser().parent
            if str(py_parent) and str(py_parent) != ".":
                py_parent.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass
        self.global_threshold = global_threshold
        self.auth_callback = auth_callback
        self.exclude_paths = set(exclude_paths or ["/jin"])
        log_level = os.getenv("JIN_LOG_LEVEL", log_level)
        self.logger = get_logger(log_level)
        self.project_name = os.getenv("JIN_PROJECT_NAME", Path(os.getcwd()).name or "jin-project")
        self.project_root = str(Path(os.getcwd()).resolve())
        self.endpoint_registry: dict[str, EndpointRecord] = {}
        self.runtime_state: dict[str, dict[str, Any]] = {}
        try:
            configured_history_limit = int(os.getenv("JIN_RUNTIME_HISTORY_LIMIT", "2000"))
        except ValueError:
            configured_history_limit = 2000
        self.runtime_history_limit = max(configured_history_limit, 50)
        try:
            configured_anomaly_limit = int(os.getenv("JIN_RUNTIME_ANOMALY_LIMIT", "2000"))
        except ValueError:
            configured_anomaly_limit = 2000
        self.runtime_anomaly_limit = max(configured_anomaly_limit, 100)
        self.override_state: dict[str, dict[str, Any]] = {}
        self.watch_overrides: dict[str, dict[str, Any]] = {}
        self.incident_state: dict[int, dict[str, Any]] = {}
        self.recent_errors: list[dict[str, Any]] = []
        self._next_runtime_anomaly_id = 1
        # Serialize native DuckDB/Rust observation writes to avoid unstable concurrent access
        # under mixed request + scheduler load.
        self._native_db_lock = RLock()
        self._router_mounted = False
        self._initialized = False
        self.scheduler_enabled = os.getenv("JIN_DISABLE_SCHEDULER", "").lower() not in {
            "1",
            "true",
            "yes",
            "on",
        }
        # Windows guardrail: DuckDB file locking is stricter and uvicorn multi-worker
        # setups can lead to overlapping access against the same db_path.
        #
        # Instead of failing silently, degrade gracefully by disabling the scheduler
        # and recording a clear operator error.
        try:
            is_windows = os.name == "nt" or _env_truthy("JIN_FORCE_WINDOWS_GUARDS")
            if is_windows:
                raw_workers = os.getenv("UVICORN_WORKERS") or os.getenv("WEB_CONCURRENCY") or "1"
                workers = int(str(raw_workers).strip() or "1")
                if workers > 1:
                    self.scheduler_enabled = False
                    self._record_error(
                        "middleware.db",
                        "Detected multiple server workers on Windows; disabling Jin scheduler to avoid DuckDB file lock issues.",
                        hint="Run uvicorn with `--workers 1` (recommended on Windows), or use a separate DB per worker.",
                        level="warning",
                    )
        except Exception:
            pass
        self._middleware_created_perf = time.perf_counter()
        self._startup_completed_perf: float | None = None
        self.scheduler = JinScheduler(retry_backoff_seconds=300, retry_backoff_cap_seconds=3600)
        self.scheduler_leader_lock_enabled = os.getenv("JIN_SCHEDULER_LEADER_LOCK", "true").lower() not in {
            "0",
            "false",
            "no",
            "off",
        }
        self.scheduler_lock_dir = Path(
            os.getenv("JIN_SCHEDULER_LOCK_DIR", str(Path(self.db_path).resolve().parent))
        )
        self.async_ingest_enabled = os.getenv("JIN_ASYNC_INGEST_ENABLED", "false").lower() not in {
            "0",
            "false",
            "no",
            "off",
        }
        self.native_batch_observations_enabled = os.getenv(
            "JIN_NATIVE_BATCH_OBSERVATIONS_ENABLED",
            "false",
        ).lower() not in {
            "0",
            "false",
            "no",
            "off",
        }
        # Native calls run inline by default to avoid cross-thread instability in
        # long-lived processes. Threadpool mode stays available behind an env flag.
        self.native_threadpool_enabled = os.getenv(
            "JIN_NATIVE_THREADPOOL_ENABLED",
            "false",
        ).lower() not in {
            "0",
            "false",
            "no",
            "off",
        }
        try:
            configured_queue_size = int(os.getenv("JIN_INGEST_QUEUE_SIZE", "2000"))
        except ValueError:
            configured_queue_size = 2000

        # Mount the operator surface immediately so `/jin` works even if the first
        # request a developer makes is to the dashboard itself (middleware excludes
        # `/jin` to avoid recursion).
        try:
            if hasattr(app, "include_router") and not self._router_mounted:  # FastAPI app
                app.include_router(create_router(self), prefix="/jin")
                self._router_mounted = True
        except Exception:
            # If mounting fails (non-FastAPI app or import edge), we fall back to
            # mounting during `_ensure_initialized()` on the first non-excluded request.
            pass
        self.ingest_queue_size = max(configured_queue_size, 1)
        try:
            configured_ingest_workers = int(os.getenv("JIN_INGEST_WORKERS", "1"))
        except ValueError:
            configured_ingest_workers = 1
        self.ingest_workers = max(configured_ingest_workers, 1)
        self._ingest_queue: asyncio.Queue[dict[str, Any]] | None = None
        self._ingest_worker_tasks: list[asyncio.Task[Any]] = []
        self._test_conn = None
        self.auth_enabled = os.getenv("JIN_AUTH_ENABLED", "").lower() in {"1", "true", "yes", "on"}
        self.auth_username = os.getenv("JIN_USERNAME", "")
        self.auth_password = os.getenv("JIN_PASSWORD", "")
        self.auth_password_hash = os.getenv("JIN_PASSWORD_HASH", "")
        self.auth_session_cookie = "jin_session"
        self.auth_session_ttl_seconds = max(int(os.getenv("JIN_SESSION_TTL_MINUTES", "480")), 5) * 60
        configured_secret = os.getenv("JIN_SESSION_SECRET", "")
        self.auth_session_secret = configured_secret or hashlib.sha256(
            f"{self.project_root}|{self.db_path}|{self.auth_username}|{self.auth_password_hash or self.auth_password}|jin".encode(
                "utf-8"
            )
        ).hexdigest()
        self.site_id = self._generate_site_id()
        self.license_client = LicenseClient()
        self.license_tier = self.license_client.get_policy().tier
        self.license_enforced = str(os.getenv("JIN_LICENSE_ENFORCEMENT", "0")).strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
            "enforce",
            "strict",
            "required",
        }
        if os.getenv("WEBSITE_SITE_NAME"):
            self.logger.warning(
                "Azure App Service detected. DuckDB file may be lost on restart on non-persistent tiers."
            )

    def _runtime_endpoint_state(self, endpoint_path: str) -> dict[str, Any]:
        return self.runtime_state.setdefault(
            endpoint_path,
            {
                "history": [],
                "recent_history": [],
                "anomalies": [],
                "grains": set(),
                "last_checked": None,
                "last_upload_analysis": None,
                "upload_analysis_history": [],
            },
        )

    def _ensure_upload_analysis_schema(self, conn: Any) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jin_upload_analysis_runs (
                id BIGINT,
                endpoint_path VARCHAR NOT NULL,
                analyzed_at TIMESTAMP,
                verdict VARCHAR,
                run_status VARCHAR,
                payload_json VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT now()
            )
            """
        )

    def _ensure_watch_config_schema(self, conn: Any) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jin_watch_config (
                endpoint_path VARCHAR PRIMARY KEY,
                schedule VARCHAR,
                threshold DOUBLE,
                default_params_json VARCHAR,
                baseline_mode VARCHAR,
                updated_at TIMESTAMP DEFAULT now()
            )
            """
        )

    def _ensure_check_runs_schema(self, conn: Any) -> None:
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

    def _record_check_run_start(
        self,
        endpoint_path: str,
        *,
        job_id: str | None,
        trigger: str,
        source: str,
    ) -> dict[str, Any]:
        run_id = f"check-{int(time.time() * 1000)}-{secrets.token_hex(4)}"
        started_at = datetime.now(timezone.utc).replace(tzinfo=None)
        payload = {
            "run_id": run_id,
            "endpoint_path": endpoint_path,
            "job_id": job_id,
            "trigger": trigger,
            "source": source,
            "status": "running",
            "started_at": started_at.isoformat(sep=" "),
        }
        try:
            conn, lock = self._get_connection()
        except Exception:
            return payload
        if conn is None:
            return payload
        try:
            with lock:
                self._ensure_check_runs_schema(conn)
                conn.execute(
                    """
                    INSERT INTO jin_check_runs (
                        id,
                        run_id,
                        endpoint_path,
                        job_id,
                        trigger,
                        source,
                        status,
                        started_at,
                        finished_at,
                        duration_ms,
                        grains_processed,
                        anomalies_detected,
                        error,
                        created_at
                    )
                    SELECT
                        COALESCE(MAX(id), 0) + 1,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'running',
                        ?,
                        NULL,
                        NULL,
                        0,
                        0,
                        NULL,
                        now()
                    FROM jin_check_runs
                    """,
                    [run_id, endpoint_path, job_id, trigger, source, payload["started_at"]],
                )
        except Exception as exc:
            self._record_error(
                "watch.run_ledger.start",
                "Could not persist check run start event.",
                endpoint_path=endpoint_path,
                detail=str(exc),
                hint="Check DuckDB write permissions and schema compatibility.",
                level="warning",
            )
        return payload

    def _record_check_run_finish(
        self,
        run_id: str,
        *,
        status: str,
        started_at: str | None,
        grains_processed: int = 0,
        anomalies_detected: int = 0,
        error: str | None = None,
    ) -> dict[str, Any]:
        finished_at_dt = datetime.now(timezone.utc).replace(tzinfo=None)
        duration_ms: int | None = None
        if isinstance(started_at, str) and started_at:
            try:
                started_at_dt = datetime.fromisoformat(started_at)
                duration_ms = max(0, int((finished_at_dt - started_at_dt).total_seconds() * 1000))
            except ValueError:
                duration_ms = None
        finished_at = finished_at_dt.isoformat(sep=" ")
        payload = {
            "run_id": run_id,
            "status": status,
            "finished_at": finished_at,
            "duration_ms": duration_ms,
            "grains_processed": int(max(grains_processed, 0)),
            "anomalies_detected": int(max(anomalies_detected, 0)),
            "error": error,
        }
        try:
            conn, lock = self._get_connection()
        except Exception:
            return payload
        if conn is None:
            return payload
        try:
            with lock:
                self._ensure_check_runs_schema(conn)
                conn.execute(
                    """
                    UPDATE jin_check_runs
                    SET
                        status = ?,
                        finished_at = ?,
                        duration_ms = ?,
                        grains_processed = ?,
                        anomalies_detected = ?,
                        error = ?
                    WHERE run_id = ?
                    """,
                    [
                        status,
                        finished_at,
                        duration_ms,
                        payload["grains_processed"],
                        payload["anomalies_detected"],
                        error,
                        run_id,
                    ],
                )
        except Exception as exc:
            self._record_error(
                "watch.run_ledger.finish",
                "Could not persist check run completion event.",
                detail=str(exc),
                hint="Check DuckDB write permissions and schema compatibility.",
                level="warning",
            )
        return payload

    def list_check_runs(self, endpoint_path: str, limit: int = 25) -> list[dict[str, Any]]:
        try:
            conn, lock = self._get_connection()
        except Exception:
            return []
        if conn is None:
            return []
        try:
            with lock:
                self._ensure_check_runs_schema(conn)
                rows = conn.execute(
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
                    WHERE endpoint_path = ?
                    ORDER BY COALESCE(started_at, created_at) DESC, id DESC
                    LIMIT ?
                    """,
                    [endpoint_path, int(max(limit, 1))],
                ).fetchall()
        except Exception:
            return []
        return [
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
            for row in rows
        ]

    @staticmethod
    def _upload_analysis_identity(payload: dict[str, Any]) -> tuple[Any, ...]:
        return (
            payload.get("analyzed_at"),
            payload.get("verdict"),
            payload.get("status"),
            payload.get("summary_message"),
            payload.get("requested_grains"),
            payload.get("attempted_runs"),
            payload.get("successful_runs"),
            payload.get("failed_runs"),
        )

    def merge_upload_analysis_history(
        self,
        *histories: list[dict[str, Any]] | None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []
        seen: set[tuple[Any, ...]] = set()
        for history in histories:
            if not history:
                continue
            for item in history:
                if not isinstance(item, dict):
                    continue
                identity = self._upload_analysis_identity(item)
                if identity in seen:
                    continue
                seen.add(identity)
                merged.append(item)
        merged.sort(key=lambda item: str(item.get("analyzed_at") or ""), reverse=True)
        return merged[:limit]

    def load_upload_analysis_history(self, endpoint_path: str, limit: int = 20) -> list[dict[str, Any]]:
        try:
            conn, lock = self._get_connection()
        except Exception:
            return []
        if conn is None:
            return []
        try:
            with lock:
                self._ensure_upload_analysis_schema(conn)
                rows = conn.execute(
                    """
                    SELECT payload_json
                    FROM jin_upload_analysis_runs
                    WHERE endpoint_path = ?
                    ORDER BY COALESCE(analyzed_at, created_at) DESC, id DESC
                    LIMIT ?
                    """,
                    [endpoint_path, int(limit)],
                ).fetchall()
        except Exception:
            return []

        history: list[dict[str, Any]] = []
        for row in rows:
            raw_payload = row[0] if row else None
            if not raw_payload:
                continue
            try:
                parsed = json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload
            except Exception:
                continue
            if isinstance(parsed, dict):
                history.append(parsed)
        return history

    def _persist_upload_analysis(self, endpoint_path: str, analysis_payload: dict[str, Any]) -> None:
        try:
            conn, lock = self._get_connection()
        except Exception:
            return
        if conn is None:
            return
        payload_json = json.dumps(analysis_payload, separators=(",", ":"), default=str)
        analyzed_at = analysis_payload.get("analyzed_at")
        try:
            with lock:
                self._ensure_upload_analysis_schema(conn)
                conn.execute(
                    """
                    INSERT INTO jin_upload_analysis_runs (
                        id, endpoint_path, analyzed_at, verdict, run_status, payload_json, created_at
                    )
                    SELECT COALESCE(MAX(id), 0) + 1, ?, ?, ?, ?, ?, now()
                    FROM jin_upload_analysis_runs
                    """,
                    [
                        endpoint_path,
                        analyzed_at,
                        analysis_payload.get("verdict"),
                        analysis_payload.get("status"),
                        payload_json,
                    ],
                )
        except Exception as exc:
            self._record_error(
                "upload.analysis.persist",
                "Could not persist upload analysis history.",
                endpoint_path=endpoint_path,
                detail=str(exc),
                hint="Check DuckDB write permissions and schema integrity.",
                level="warning",
            )

    def _load_watch_override(self, endpoint_path: str) -> dict[str, Any]:
        payload = self.watch_overrides.get(endpoint_path, {})
        if not isinstance(payload, dict):
            return {}
        return dict(payload)

    def _save_watch_override(self, endpoint_path: str, watch_config: dict[str, Any]) -> None:
        self.watch_overrides[endpoint_path] = dict(watch_config)

    @staticmethod
    def _normalized_watch_config(watch_config: dict[str, Any]) -> dict[str, Any]:
        default_params = watch_config.get("default_params")
        if not isinstance(default_params, dict):
            default_params = {}
        threshold = watch_config.get("threshold")
        if threshold is not None:
            try:
                threshold = float(threshold)
            except (TypeError, ValueError):
                threshold = None
        baseline_mode = str(watch_config.get("baseline_mode") or "fixed").strip().lower()
        if baseline_mode not in {"fixed", "refresh_before_run"}:
            baseline_mode = "fixed"
        payload: dict[str, Any] = {
            "default_params": default_params,
            "baseline_mode": baseline_mode,
        }
        schedule = watch_config.get("schedule")
        if isinstance(schedule, str) and schedule.strip():
            payload["schedule"] = schedule.strip()
        if threshold is not None:
            payload["threshold"] = threshold
        return payload

    def _generate_site_id(self) -> str:
        try:
            import uuid
            node = uuid.getnode()
            return hashlib.sha256(f"jin-{node}".encode()).hexdigest()[:12]
        except Exception:
            return "unknown-site"

    def calculate_trust_score(self) -> float:
        # Trust score should never depend on a potentially unstable native call path.
        # We derive it from persisted anomaly rows when possible.
        try:
            anomaly_count = 0
            conn, lock = self._get_connection()
            if conn is not None:
                with lock:
                    row = conn.execute(
                        """
                        SELECT COUNT(*)
                        FROM jin_anomalies
                        WHERE status IS NULL OR status != 'resolved'
                        """
                    ).fetchone()
                anomaly_count = int(row[0] or 0) if row else 0
            score = max(0.0, 100.0 - (anomaly_count * 2.5))
            return round(score, 1)
        except Exception:
            return 100.0

    def get_license_meta(self) -> dict[str, Any]:
        # Enforce project limit based on the license policy.
        registry_file = self._license_projects_registry_path()
        projects = self._load_license_projects_registry(registry_file)

        policy = self.license_client.get_policy()
        license_backend = self.license_client.backend_mode()
        enforcement_enabled = bool(self.license_enforced)
        current_hash = self._project_license_key(self.project_root, self.db_path)
        legacy_catalog_hash = self._project_catalog_id(self.project_name, self.project_root, self.db_path)
        legacy_hash = hashlib.sha256(self.project_name.encode()).hexdigest()[:8]
        limit = policy.max_projects if enforcement_enabled else None
        unlimited_projects = limit is None or int(limit) <= 0
        is_registered = (
            current_hash in projects
            or legacy_catalog_hash in projects
            or legacy_hash in projects
        )

        # If this is a new project, and we have room, register it.
        if not is_registered and (unlimited_projects or len(projects) < int(limit)):
            projects.append(current_hash)
            self._save_license_projects_registry(registry_file, projects)
            is_registered = True

        is_unlicensed = enforcement_enabled and not is_registered and policy.tier == "free"
        policy_payload = asdict(policy)
        if not enforcement_enabled:
            policy_payload["max_projects"] = None
            if not policy_payload.get("message"):
                policy_payload["message"] = (
                    "License enforcement is disabled in this runtime. "
                    "You can use Jin without activation."
                )

        return {
            "site_id": self.site_id,
            "tier": policy.tier,
            "project_limit": limit,
            "projects_active": len(projects),
            "trust_score": self.calculate_trust_score(),
            "is_unlicensed": is_unlicensed,
            "license_enforced": enforcement_enabled,
            "license_backend": license_backend,
            "license_catalog_present": self.license_client.has_commercial_catalog(),
            "policy": policy_payload,
            "usage": {
                "current": self.license_client.get_current_usage(),
                "limit": None,
                "is_limited": False,
            },
        }

    def _license_projects_registry_path(self) -> Path:
        configured = os.getenv("JIN_LICENSE_PROJECTS_PATH")
        if configured:
            return Path(configured).expanduser().resolve()
        scope = self.license_client.get_account_scope(self.site_id)
        safe_scope = re.sub(r"[^A-Za-z0-9._-]+", "-", scope).strip("-") or "local"
        return Path.home() / ".jin" / "accounts" / f"{safe_scope}-projects.json"

    @staticmethod
    def _load_license_projects_registry(registry_file: Path) -> list[str]:
        if not registry_file.exists():
            return []
        try:
            payload = json.loads(registry_file.read_text())
        except Exception:
            return []
        if not isinstance(payload, list):
            return []
        normalized = [str(item) for item in payload if isinstance(item, str)]
        return normalized

    @staticmethod
    def _save_license_projects_registry(registry_file: Path, projects: list[str]) -> None:
        try:
            registry_file.parent.mkdir(parents=True, exist_ok=True)
            registry_file.write_text(json.dumps(projects))
        except Exception:
            # Read-only or restricted filesystems should not break status/dashboard.
            return

    def _error_category(self, source: str) -> str:
        if source.startswith("scheduler"):
            return "scheduler"
        if source.startswith("router.upload") or source.startswith("router.save_references"):
            return "upload"
        if source.startswith("router.save_config") or source.startswith("config."):
            return "configuration"
        if source.startswith("router.") or source.startswith("middleware."):
            return "runtime"
        return "general"

    def _error_severity(self, source: str) -> str:
        if source.startswith("scheduler") or source.startswith("middleware.process_response"):
            return "high"
        if source.startswith("router.status") or source.startswith("router.endpoint_detail"):
            return "medium"
        return "low"

    def _error_remediation_steps(self, source: str, hint: str | None, endpoint_path: str | None) -> list[str]:
        steps: list[str] = []
        if source.startswith("scheduler"):
            steps.append("Review the scheduler panel for the last run error and retry window.")
            steps.append("Run the watch job manually after fixing the failing endpoint or input state.")
        elif source.startswith("router.upload") or source.startswith("router.save_references"):
            steps.append("Re-download the template for this API and verify the column names match exactly.")
            steps.append("Check the uploaded grain values and KPI field names for typos or missing data.")
        elif source.startswith("router.save_config") or source.startswith("config."):
            steps.append("Confirm the selected dimensions and KPIs exist in the reflected schema for this API.")
            steps.append("Re-save configuration after correcting any invalid tolerance or field choices.")
        elif source.startswith("router.status") or source.startswith("router.endpoint_detail"):
            steps.append("Inspect the project's DuckDB file for malformed history, config, or reference rows.")
            steps.append("Refresh the API workspace after correcting the stored rows or restarting the app.")
        else:
            steps.append("Review the project-local logs and recent operator actions for the failing API.")
        if endpoint_path:
            steps.append(f"Open {endpoint_path} in the API workspace for endpoint-specific context.")
        if hint:
            steps.append(hint)
        return steps[:4]

    def _record_error(
        self,
        source: str,
        message: str,
        *,
        hint: str | None = None,
        endpoint_path: str | None = None,
        detail: str | None = None,
        level: str = "error",
    ) -> None:
        timestamp = datetime.now(timezone.utc).replace(tzinfo=None)
        entry = {
            "id": int(timestamp.timestamp() * 1_000_000) + len(self.recent_errors),
            "created_at": timestamp.isoformat(sep=" "),
            "source": source,
            "category": self._error_category(source),
            "severity": self._error_severity(source),
            "message": message,
            "hint": hint,
            "endpoint_path": endpoint_path,
            "detail": detail,
            "status": "open",
            "acknowledged_at": None,
            "archived_at": None,
            "remediation_steps": self._error_remediation_steps(source, hint, endpoint_path),
        }
        self.recent_errors.insert(0, entry)
        self.recent_errors = self.recent_errors[:25]
        log_message = f"[{self.project_name}] {source}: {message}"
        if endpoint_path:
            log_message += f" (endpoint={endpoint_path})"
        if detail:
            log_message += f" detail={detail}"
        if hint:
            log_message += f" hint={hint}"
        getattr(self.logger, level if hasattr(self.logger, level) else "error")(log_message)

    def update_error_status(self, error_id: int, action: str) -> dict[str, Any] | None:
        now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
        for entry in self.recent_errors:
            if int(entry.get("id", -1)) != int(error_id):
                continue
            if action == "acknowledged":
                entry["status"] = "acknowledged"
                entry["acknowledged_at"] = now
                entry["archived_at"] = None
            elif action == "archived":
                entry["status"] = "archived"
                entry["archived_at"] = now
            elif action == "reopened":
                entry["status"] = "open"
                entry["acknowledged_at"] = None
                entry["archived_at"] = None
            else:
                return None
            return dict(entry)
        return None

    def dashboard_context(self) -> dict[str, Any]:
        meta = self.get_license_meta()
        diagnostics = self.runtime_diagnostics()
        return {
            "name": self.project_name,
            "root": self.project_root,
            "db_path": self.db_path,
            "site_id": meta["site_id"],
            "tier": meta["tier"],
            "project_limit": meta["project_limit"],
            "projects_active": meta["projects_active"],
            "trust_score": meta["trust_score"],
            "is_unlicensed": meta["is_unlicensed"],
            "license_enforced": meta["license_enforced"],
            "license_backend": meta["license_backend"],
            "license_catalog_present": meta["license_catalog_present"],
            "is_maintainer": self._is_maintainer_ui_enabled(),
            "policy": meta["policy"],
            "auth_enabled": self.is_auth_enabled(),
            "auth_mode": "session_cookie" if self.is_auth_enabled() else "disabled",
            "auth_uses_default_credentials": self.auth_username == "operator"
            and (self.auth_password == "change-me" or not self.auth_password_hash),
            "deployment_model": "client_infra_embedded",
            "runtime_mode": diagnostics.get("runtime_mode"),
            "native_available": diagnostics.get("native_available"),
            "native_missing_features": diagnostics.get("native_missing_features"),
            "startup_completed": diagnostics.get("startup_completed"),
            "startup_seconds": diagnostics.get("startup_seconds"),
            "discovery": diagnostics.get("discovery"),
            "recent_errors": list(self.recent_errors),
        }

    def feature_enabled(self, feature_name: str) -> bool:
        feature = str(feature_name or "").strip().lower()
        if not feature:
            return False
        policy = self.license_client.get_policy()
        return feature in {str(item).strip().lower() for item in policy.features}

    @staticmethod
    def _is_maintainer_ui_enabled() -> bool:
        return str(os.getenv("JIN_MAINTAINER_UI", "0")).strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
            "enabled",
        }

    def _projects_catalog_path(self) -> Path:
        configured = os.getenv("JIN_PROJECT_CATALOG_PATH")
        if configured:
            return Path(configured).expanduser().resolve()
        base = Path(self.project_root) / ".jin"
        base.mkdir(parents=True, exist_ok=True)
        return base / "projects_catalog.json"

    def _active_project_path(self) -> Path:
        configured = os.getenv("JIN_ACTIVE_PROJECT_PATH")
        if configured:
            return Path(configured).expanduser().resolve()
        base = Path(self.project_root) / ".jin"
        base.mkdir(parents=True, exist_ok=True)
        return base / "active_project.json"

    @staticmethod
    def _current_project_payload(project_id: str, name: str, root: str, db_path: str) -> dict[str, Any]:
        timestamp = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
        return {
            "id": project_id,
            "name": name,
            "root": root,
            "db_path": db_path,
            "monitor_policy": JinMiddleware._default_monitor_policy(),
            "created_at": timestamp,
            "last_seen_at": timestamp,
            "source": "runtime",
        }

    @staticmethod
    def _default_monitor_policy() -> dict[str, Any]:
        return {
            "cadence_template": "balanced",
            "schedule": "every 2h",
            "baseline_mode": "fixed",
            "threshold": None,
            "bundle_enabled": False,
            "bundle_schedule": "daily 09:00",
            "bundle_endpoint_paths": None,
            "bundle_report_format": "markdown",
        }

    def _normalized_monitor_policy(
        self,
        payload: dict[str, Any] | None,
        *,
        fallback: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        template_schedules = {
            "aggressive": "every 1h",
            "balanced": "every 2h",
            "conservative": "daily 09:00",
        }
        template_bundle_schedules = {
            "aggressive": "every 2h",
            "balanced": "daily 09:00",
            "conservative": "weekly mon 09:00",
        }
        base = self._default_monitor_policy()
        if isinstance(fallback, dict):
            base.update(
                {
                    key: fallback.get(key)
                    for key in {
                        "cadence_template",
                        "schedule",
                        "baseline_mode",
                        "threshold",
                        "bundle_enabled",
                        "bundle_schedule",
                        "bundle_endpoint_paths",
                        "bundle_report_format",
                    }
                    if key in fallback
                }
            )
        incoming = payload if isinstance(payload, dict) else {}

        cadence_template = str(incoming.get("cadence_template") or base.get("cadence_template") or "balanced").strip().lower()
        if cadence_template not in {"aggressive", "balanced", "conservative", "custom"}:
            cadence_template = "balanced"

        schedule_raw = incoming.get("schedule", base.get("schedule"))
        schedule = str(schedule_raw).strip() if isinstance(schedule_raw, str) and schedule_raw.strip() else None
        if cadence_template in template_schedules:
            schedule = template_schedules[cadence_template]
        elif not schedule:
            schedule = str(base.get("schedule") or "every 2h")

        if not self.scheduler.is_supported_schedule(schedule):
            raise ValueError(
                "Unsupported schedule format. Use 'every Nh', 'daily HH:MM', or 'weekly mon[,tue] HH:MM'."
            )

        baseline_mode = str(incoming.get("baseline_mode") or base.get("baseline_mode") or "fixed").strip().lower()
        if baseline_mode not in {"fixed", "refresh_before_run"}:
            baseline_mode = "fixed"

        threshold = incoming.get("threshold", base.get("threshold"))
        if threshold is None:
            normalized_threshold: float | None = None
        else:
            try:
                normalized_threshold = float(threshold)
            except (TypeError, ValueError):
                raise ValueError("threshold must be a number when provided") from None

        bundle_enabled = bool(incoming.get("bundle_enabled", base.get("bundle_enabled", False)))
        bundle_schedule_raw = incoming.get("bundle_schedule", base.get("bundle_schedule"))
        bundle_schedule = (
            str(bundle_schedule_raw).strip()
            if isinstance(bundle_schedule_raw, str) and str(bundle_schedule_raw).strip()
            else None
        )
        if cadence_template in template_bundle_schedules and (
            "bundle_schedule" not in incoming or not str(incoming.get("bundle_schedule") or "").strip()
        ):
            bundle_schedule = template_bundle_schedules[cadence_template]
        if bundle_enabled and not bundle_schedule:
            bundle_schedule = str(base.get("bundle_schedule") or "daily 09:00")
        if bundle_enabled and not self.scheduler.is_supported_schedule(str(bundle_schedule)):
            raise ValueError(
                "Unsupported bundle schedule format. Use 'every Nh', 'daily HH:MM', or 'weekly mon[,tue] HH:MM'."
            )

        bundle_endpoint_paths_raw = incoming.get("bundle_endpoint_paths", base.get("bundle_endpoint_paths"))
        if isinstance(bundle_endpoint_paths_raw, list):
            bundle_endpoint_paths = [
                str(item).strip()
                for item in bundle_endpoint_paths_raw
                if isinstance(item, str) and str(item).strip()
            ]
        else:
            bundle_endpoint_paths = None

        bundle_report_format = str(incoming.get("bundle_report_format", base.get("bundle_report_format") or "markdown")).strip().lower()
        if bundle_report_format not in {"markdown", "json"}:
            bundle_report_format = "markdown"

        return {
            "cadence_template": cadence_template,
            "schedule": schedule,
            "baseline_mode": baseline_mode,
            "threshold": normalized_threshold,
            "bundle_enabled": bundle_enabled,
            "bundle_schedule": bundle_schedule,
            "bundle_endpoint_paths": bundle_endpoint_paths if bundle_endpoint_paths else None,
            "bundle_report_format": bundle_report_format,
        }

    def _load_active_project_id(self) -> str | None:
        active_path = self._active_project_path()
        if not active_path.exists():
            return None
        try:
            payload = json.loads(active_path.read_text())
        except Exception:
            return None
        if isinstance(payload, dict):
            active_id = payload.get("project_id")
            if isinstance(active_id, str) and active_id.strip():
                return active_id
        return None

    def _save_active_project_id(self, project_id: str | None) -> None:
        active_path = self._active_project_path()
        try:
            active_path.parent.mkdir(parents=True, exist_ok=True)
            if project_id:
                active_path.write_text(json.dumps({"project_id": project_id}))
            elif active_path.exists():
                active_path.unlink()
        except Exception:
            return

    def _project_catalog_id(self, name: str, root: str, db_path: str) -> str:
        digest = hashlib.sha256(f"{name}|{root}|{db_path}".encode("utf-8")).hexdigest()
        return digest[:16]

    def _project_license_key(self, root: str, db_path: str) -> str:
        digest = hashlib.sha256(f"{root}|{db_path}".encode("utf-8")).hexdigest()
        return digest[:16]

    @staticmethod
    def _project_is_archived(payload: dict[str, Any]) -> bool:
        archived_at = payload.get("archived_at")
        return isinstance(archived_at, str) and bool(archived_at.strip())

    def _load_projects_catalog(self) -> list[dict[str, Any]]:
        catalog_path = self._projects_catalog_path()
        if not catalog_path.exists():
            return []
        try:
            payload = json.loads(catalog_path.read_text())
        except Exception:
            return []
        if not isinstance(payload, list):
            return []
        projects = [item for item in payload if isinstance(item, dict)]
        return projects

    def _save_projects_catalog(self, projects: list[dict[str, Any]]) -> None:
        catalog_path = self._projects_catalog_path()
        catalog_path.parent.mkdir(parents=True, exist_ok=True)
        catalog_path.write_text(json.dumps(projects, indent=2))

    def add_project_to_catalog(
        self,
        name: str,
        *,
        root: str | None = None,
        db_path: str | None = None,
        source: str = "api",
    ) -> dict[str, Any]:
        normalized_name = str(name or "").strip()
        if not normalized_name:
            raise ValueError("project name is required")
        normalized_root = str(root or self.project_root).strip()
        normalized_db_path = str(db_path or self.db_path).strip()
        if not normalized_root:
            raise ValueError("project root is required")
        if not normalized_db_path:
            raise ValueError("project db_path is required")
        project_id = self._project_catalog_id(normalized_name, normalized_root, normalized_db_path)

        policy = self.license_client.get_policy()
        if self.license_enforced and policy.tier == "free":
            registry_file = self._license_projects_registry_path()
            registered_projects = self._load_license_projects_registry(registry_file)
            candidate_hash = self._project_license_key(normalized_root, normalized_db_path)
            legacy_catalog_hash = self._project_catalog_id(normalized_name, normalized_root, normalized_db_path)
            legacy_hash = hashlib.sha256(normalized_name.encode()).hexdigest()[:8]
            if (
                candidate_hash not in registered_projects
                and legacy_catalog_hash not in registered_projects
                and legacy_hash not in registered_projects
                and registered_projects
            ):
                raise ValueError("Free tier allows one project per account. Activate Business for unlimited projects.")
            if candidate_hash not in registered_projects:
                registered_projects.append(candidate_hash)
                self._save_license_projects_registry(registry_file, registered_projects)

        timestamp = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
        projects = self._load_projects_catalog()
        existing = next((item for item in projects if item.get("id") == project_id), None)
        if existing is None:
            existing = {
                "id": project_id,
                "name": normalized_name,
                "root": normalized_root,
                "db_path": normalized_db_path,
                "site_id": self.site_id,
                "monitor_policy": self._default_monitor_policy(),
                "created_at": timestamp,
                "last_seen_at": timestamp,
                "source": source,
                "archived_at": None,
            }
            projects.insert(0, existing)
        else:
            existing["name"] = normalized_name
            existing["root"] = normalized_root
            existing["db_path"] = normalized_db_path
            existing["site_id"] = self.site_id
            existing["last_seen_at"] = timestamp
            existing["source"] = source
            existing["monitor_policy"] = self._normalized_monitor_policy(
                existing.get("monitor_policy"),
                fallback=self._default_monitor_policy(),
            )
            existing["archived_at"] = None
        projects.sort(key=lambda item: str(item.get("last_seen_at") or ""), reverse=True)
        self._save_projects_catalog(projects)
        return dict(existing)

    def list_projects_catalog(self, *, include_archived: bool = False) -> list[dict[str, Any]]:
        projects = self._load_projects_catalog()
        current_id = self._project_catalog_id(self.project_name, self.project_root, self.db_path)
        if not any(item.get("id") == current_id for item in projects):
            projects.insert(
                0,
                self._current_project_payload(
                    current_id,
                    self.project_name,
                    self.project_root,
                    self.db_path,
                ),
            )
        active_id = self._load_active_project_id() or current_id
        active_row = next((item for item in projects if item.get("id") == active_id), None)
        if active_row is not None and self._project_is_archived(active_row):
            active_id = current_id
            self._save_active_project_id(active_id)
        if not any(
            item.get("id") == active_id and not self._project_is_archived(item)
            for item in projects
        ):
            fallback_id = next(
                (
                    str(item.get("id") or "")
                    for item in projects
                    if str(item.get("id") or "") and not self._project_is_archived(item)
                ),
                current_id,
            )
            active_id = fallback_id
            self._save_active_project_id(active_id)
        normalized: list[dict[str, Any]] = []
        for item in projects:
            payload = dict(item)
            payload["is_archived"] = self._project_is_archived(payload)
            if payload["is_archived"] and not include_archived:
                continue
            payload["active"] = payload.get("id") == active_id and not payload["is_archived"]
            payload["monitor_policy"] = self._normalized_monitor_policy(
                payload.get("monitor_policy"),
                fallback=self._default_monitor_policy(),
            )
            normalized.append(payload)
        return normalized

    def resolve_project(self, project_id: str | None = None, *, include_archived: bool = False) -> dict[str, Any]:
        projects = self.list_projects_catalog(include_archived=include_archived)
        current_id = self._project_catalog_id(self.project_name, self.project_root, self.db_path)
        selected_id = project_id or self._load_active_project_id() or current_id
        selected = next((item for item in projects if item.get("id") == selected_id), None)
        if selected is None:
            if project_id:
                raise ValueError("project not found")
            return self._current_project_payload(current_id, self.project_name, self.project_root, self.db_path)
        return dict(selected)

    def set_active_project(self, project_id: str) -> dict[str, Any]:
        resolved = self.resolve_project(project_id, include_archived=True)
        if self._project_is_archived(resolved):
            raise ValueError("cannot activate an archived project")
        self._save_active_project_id(str(resolved.get("id") or ""))
        return self.resolve_project(project_id)

    def archive_project_in_catalog(self, project_id: str) -> dict[str, Any]:
        normalized_id = str(project_id or "").strip()
        if not normalized_id:
            raise ValueError("project_id is required")
        current_id = self._project_catalog_id(self.project_name, self.project_root, self.db_path)
        if normalized_id == current_id:
            raise ValueError("cannot archive the current runtime project")
        projects = self._load_projects_catalog()
        target = next((item for item in projects if item.get("id") == normalized_id), None)
        if target is None:
            raise ValueError("project not found")
        now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
        target["archived_at"] = now
        target["last_seen_at"] = now
        projects.sort(key=lambda item: str(item.get("last_seen_at") or ""), reverse=True)
        self._save_projects_catalog(projects)
        active_id = self._load_active_project_id() or current_id
        if active_id == normalized_id:
            fallback_id = next(
                (
                    str(item.get("id") or "")
                    for item in projects
                    if str(item.get("id") or "") and not self._project_is_archived(item)
                ),
                current_id,
            )
            self._save_active_project_id(fallback_id)
        payload = dict(target)
        payload["is_archived"] = True
        payload["active"] = False
        return payload

    def restore_project_in_catalog(self, project_id: str) -> dict[str, Any]:
        normalized_id = str(project_id or "").strip()
        if not normalized_id:
            raise ValueError("project_id is required")
        current_id = self._project_catalog_id(self.project_name, self.project_root, self.db_path)
        projects = self._load_projects_catalog()
        target = next((item for item in projects if item.get("id") == normalized_id), None)
        if target is None and normalized_id == current_id:
            target = self.add_project_to_catalog(self.project_name, source="runtime")
            projects = self._load_projects_catalog()
            target = next((item for item in projects if item.get("id") == normalized_id), None)
        if target is None:
            raise ValueError("project not found")
        now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
        target["archived_at"] = None
        target["last_seen_at"] = now
        projects.sort(key=lambda item: str(item.get("last_seen_at") or ""), reverse=True)
        self._save_projects_catalog(projects)
        active_id = self._load_active_project_id() or current_id
        payload = dict(target)
        payload["is_archived"] = False
        payload["active"] = payload.get("id") == active_id
        return payload

    def delete_project_from_catalog(self, project_id: str, *, force: bool = False) -> dict[str, Any]:
        normalized_id = str(project_id or "").strip()
        if not normalized_id:
            raise ValueError("project_id is required")
        current_id = self._project_catalog_id(self.project_name, self.project_root, self.db_path)
        if normalized_id == current_id:
            raise ValueError("cannot delete the current runtime project")
        projects = self._load_projects_catalog()
        index = next((idx for idx, item in enumerate(projects) if item.get("id") == normalized_id), None)
        if index is None:
            raise ValueError("project not found")
        target = dict(projects[index])
        if not self._project_is_archived(target) and not force:
            raise ValueError("project must be archived before deletion")
        del projects[index]
        self._save_projects_catalog(projects)
        active_id = self._load_active_project_id() or current_id
        if active_id == normalized_id:
            fallback_id = next(
                (
                    str(item.get("id") or "")
                    for item in projects
                    if str(item.get("id") or "") and not self._project_is_archived(item)
                ),
                current_id,
            )
            self._save_active_project_id(fallback_id)
        target["is_archived"] = self._project_is_archived(target)
        target["active"] = False
        return target

    def set_project_monitor_policy(self, project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        current_id = self._project_catalog_id(self.project_name, self.project_root, self.db_path)
        projects = self._load_projects_catalog()
        target = next((item for item in projects if item.get("id") == project_id), None)
        if target is None and project_id == current_id:
            self.add_project_to_catalog(self.project_name, source="runtime")
            projects = self._load_projects_catalog()
            target = next((item for item in projects if item.get("id") == project_id), None)
        if target is None:
            raise ValueError("project not found")

        normalized_policy = self._normalized_monitor_policy(
            payload,
            fallback=target.get("monitor_policy") if isinstance(target.get("monitor_policy"), dict) else self._default_monitor_policy(),
        )
        normalized_policy["updated_at"] = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
        target["monitor_policy"] = normalized_policy
        target["last_seen_at"] = normalized_policy["updated_at"]
        projects.sort(key=lambda item: str(item.get("last_seen_at") or ""), reverse=True)
        self._save_projects_catalog(projects)
        if project_id == current_id:
            self._register_project_bundle_job(project_id, replace=True)
        return {"project": dict(target), "monitor_policy": dict(normalized_policy)}

    def project_monitor_policy(self, project_id: str | None = None) -> dict[str, Any]:
        project = self.resolve_project(project_id)
        return self._normalized_monitor_policy(
            project.get("monitor_policy"),
            fallback=self._default_monitor_policy(),
        )

    def apply_project_monitor_policy(
        self,
        project_id: str,
        *,
        endpoint_paths: list[str] | None = None,
        overwrite_existing_schedule: bool = True,
    ) -> dict[str, Any]:
        project = self.resolve_project(project_id)
        current_id = self._project_catalog_id(self.project_name, self.project_root, self.db_path)
        is_current_project = str(project.get("id") or "") == current_id or str(project.get("db_path") or "") == self.db_path
        policy = self.project_monitor_policy(project_id)

        if not is_current_project:
            return {
                "project": project,
                "monitor_policy": policy,
                "requested": 0,
                "applied": 0,
                "results": [],
                "message": "Project policy saved. Load this project runtime to apply endpoint schedules.",
            }

        if endpoint_paths is None:
            targets = sorted(self.endpoint_registry.keys())
        else:
            targets = [str(path).strip() for path in endpoint_paths if isinstance(path, str) and str(path).strip()]

        results: list[dict[str, Any]] = []
        applied = 0
        schedule = str(policy.get("schedule") or "every 2h")
        baseline_mode = str(policy.get("baseline_mode") or "fixed")
        threshold = policy.get("threshold")
        for endpoint_path in targets:
            record = self.endpoint_registry.get(endpoint_path)
            if record is None:
                results.append({"endpoint_path": endpoint_path, "ok": False, "reason": "endpoint_not_found"})
                continue

            current_watch = self._normalized_watch_config(record.watch_config or {})
            merged_watch = dict(current_watch)
            if overwrite_existing_schedule or not current_watch.get("schedule"):
                merged_watch["schedule"] = schedule
            merged_watch["baseline_mode"] = baseline_mode
            if threshold is not None:
                merged_watch["threshold"] = threshold
            normalized_watch = self._normalized_watch_config(merged_watch)
            watch_schedule = normalized_watch.get("schedule")
            if watch_schedule and not self.scheduler.is_supported_schedule(str(watch_schedule)):
                results.append({"endpoint_path": endpoint_path, "ok": False, "reason": "unsupported_schedule"})
                continue
            default_params = normalized_watch.get("default_params") or {}
            if not default_params:
                results.append({"endpoint_path": endpoint_path, "ok": False, "reason": "missing_default_params"})
                continue
            self._save_watch_override(endpoint_path, normalized_watch)
            record.watch_config = normalized_watch
            self._register_scheduler_job_for_record(record, replace=True)
            applied += 1
            results.append(
                {
                    "endpoint_path": endpoint_path,
                    "ok": True,
                    "schedule": normalized_watch.get("schedule"),
                    "baseline_mode": normalized_watch.get("baseline_mode"),
                }
            )

        return {
            "project": project,
            "monitor_policy": policy,
            "requested": len(targets),
            "applied": applied,
            "results": results,
        }

    def _bundle_runs_path(self) -> Path:
        configured = os.getenv("JIN_BUNDLE_RUNS_PATH")
        if configured:
            return Path(configured).expanduser().resolve()
        base = Path(self.project_root) / ".jin"
        base.mkdir(parents=True, exist_ok=True)
        return base / "bundle_runs.json"

    def _load_bundle_runs(self) -> list[dict[str, Any]]:
        path = self._bundle_runs_path()
        if not path.exists():
            return []
        try:
            payload = json.loads(path.read_text())
        except Exception:
            return []
        if not isinstance(payload, list):
            return []
        return [item for item in payload if isinstance(item, dict)]

    def _save_bundle_runs(self, runs: list[dict[str, Any]]) -> None:
        path = self._bundle_runs_path()
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(runs, indent=2))
        except Exception:
            return

    def record_bundle_run(self, payload: dict[str, Any]) -> dict[str, Any]:
        runs = self._load_bundle_runs()
        run_payload = dict(payload)
        runs.insert(0, run_payload)
        self._save_bundle_runs(runs[:200])
        return run_payload

    def list_bundle_runs(self, project_id: str, *, limit: int = 20) -> list[dict[str, Any]]:
        runs = self._load_bundle_runs()
        filtered = [row for row in runs if str(row.get("project_id") or "") == str(project_id)]
        filtered.sort(key=lambda row: str(row.get("started_at") or ""), reverse=True)
        return filtered[: max(int(limit), 1)]

    @staticmethod
    def _parse_bundle_datetime(value: object) -> datetime | None:
        if not isinstance(value, str) or not value.strip():
            return None
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
        return parsed

    def bundle_digest_payload(
        self,
        *,
        days: int = 7,
        project_ids: list[str] | None = None,
        limit: int = 200,
    ) -> dict[str, Any]:
        window_days = max(int(days), 1)
        window_end = datetime.now(timezone.utc).replace(tzinfo=None)
        window_start = window_end - timedelta(days=window_days)
        allowed_ids = {str(item) for item in project_ids} if project_ids else None

        runs = self._load_bundle_runs()
        filtered_runs: list[dict[str, Any]] = []
        for row in runs:
            if not isinstance(row, dict):
                continue
            project_id = str(row.get("project_id") or "")
            if allowed_ids is not None and project_id not in allowed_ids:
                continue
            started_at = self._parse_bundle_datetime(row.get("started_at"))
            if started_at is None or started_at < window_start:
                continue
            filtered_runs.append(dict(row))
        filtered_runs.sort(key=lambda row: str(row.get("started_at") or ""), reverse=True)
        filtered_runs = filtered_runs[: max(int(limit), 1)]

        totals = {
            "runs": 0,
            "success": 0,
            "degraded": 0,
            "not_scheduled": 0,
            "not_executable": 0,
            "requested": 0,
            "executed": 0,
            "errors": 0,
        }
        project_rollups: dict[str, dict[str, Any]] = {}
        for row in filtered_runs:
            project_id = str(row.get("project_id") or "")
            project_name = str(row.get("project_name") or "unknown")
            status = str(row.get("status") or "unknown")
            totals["runs"] += 1
            totals["requested"] += int(row.get("requested") or 0)
            totals["executed"] += int(row.get("executed") or 0)
            totals["errors"] += int(row.get("errors") or 0)
            if status in totals:
                totals[status] += 1

            rollup = project_rollups.setdefault(
                project_id,
                {
                    "project_id": project_id,
                    "project_name": project_name,
                    "runs": 0,
                    "success": 0,
                    "degraded": 0,
                    "not_scheduled": 0,
                    "not_executable": 0,
                    "requested": 0,
                    "executed": 0,
                    "errors": 0,
                    "last_run_at": None,
                },
            )
            rollup["runs"] += 1
            rollup["requested"] += int(row.get("requested") or 0)
            rollup["executed"] += int(row.get("executed") or 0)
            rollup["errors"] += int(row.get("errors") or 0)
            if status in rollup:
                rollup[status] += 1
            if rollup["last_run_at"] is None or str(row.get("started_at") or "") > str(rollup["last_run_at"] or ""):
                rollup["last_run_at"] = row.get("started_at")

        projects = sorted(
            project_rollups.values(),
            key=lambda row: (int(row.get("errors") or 0), int(row.get("runs") or 0), str(row.get("project_name") or "")),
            reverse=True,
        )
        return {
            "generated_at": window_end.isoformat(sep=" "),
            "window_days": window_days,
            "window_start": window_start.isoformat(sep=" "),
            "window_end": window_end.isoformat(sep=" "),
            "totals": totals,
            "projects": projects,
            "recent_runs": filtered_runs,
            "count": len(filtered_runs),
        }

    @staticmethod
    def _bundle_markdown_report(payload: dict[str, Any]) -> str:
        lines = [
            f"# Jin Bundle Run Report ({payload.get('run_id', 'unknown')})",
            "",
            f"- Project: {payload.get('project_name', 'unknown')}",
            f"- Trigger: {payload.get('trigger', 'manual')}",
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

    async def run_project_bundle(
        self,
        project_id: str,
        *,
        endpoint_paths: list[str] | None = None,
        trigger: str = "manual",
    ) -> dict[str, Any]:
        project = self.resolve_project(project_id)
        current_id = self._project_catalog_id(self.project_name, self.project_root, self.db_path)
        is_current_project = str(project.get("id") or "") == current_id or str(project.get("db_path") or "") == self.db_path
        if endpoint_paths is None:
            scheduler_rows = self.scheduler_snapshot()
            target_paths = sorted(
                {
                    str(item.get("endpoint_path")).strip()
                    for item in scheduler_rows
                    if isinstance(item, dict)
                    and isinstance(item.get("endpoint_path"), str)
                    and str(item.get("endpoint_path")).strip()
                    and not str(item.get("job_id") or "").startswith("jin:bundle:")
                }
            )
        else:
            target_paths = [str(path).strip() for path in endpoint_paths if isinstance(path, str) and str(path).strip()]

        started_at = datetime.now(timezone.utc).replace(tzinfo=None)
        run_id = f"bundle-{int(started_at.timestamp() * 1000)}"

        if not is_current_project:
            artifact = {
                "run_id": run_id,
                "project_id": str(project.get("id") or ""),
                "project_name": str(project.get("name") or ""),
                "trigger": trigger,
                "started_at": started_at.isoformat(sep=" "),
                "finished_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "),
                "status": "not_executable",
                "requested": len(target_paths),
                "executed": 0,
                "success": 0,
                "errors": 0,
                "not_scheduled": len(target_paths),
                "results": [],
                "message": "Project runtime is not loaded in this process; bundle execution was not performed.",
            }
            artifact["report_markdown"] = self._bundle_markdown_report(artifact)
            self.record_bundle_run(artifact)
            return {"ok": False, **artifact}

        results: list[dict[str, Any]] = []
        executed = 0
        success = 0
        errors = 0
        not_scheduled = 0
        for endpoint_path in target_paths:
            job_id = f"jin:{endpoint_path}"
            started = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
            ran = await self.scheduler.run_now(job_id)
            snapshot = next((item for item in self.scheduler_snapshot() if item.get("job_id") == job_id), None)
            if not ran:
                not_scheduled += 1
                results.append(
                    {
                        "endpoint_path": endpoint_path,
                        "job_id": job_id,
                        "started_at": started,
                        "status": "not_scheduled",
                        "error": None,
                    }
                )
                continue
            executed += 1
            status = str((snapshot or {}).get("last_status") or "unknown")
            error = (snapshot or {}).get("last_error")
            if status == "success":
                success += 1
            elif status == "error":
                errors += 1
            results.append(
                {
                    "endpoint_path": endpoint_path,
                    "job_id": job_id,
                    "started_at": started,
                    "status": status,
                    "error": error,
                }
            )

        final_status = "success"
        if errors > 0:
            final_status = "degraded"
        elif executed == 0:
            final_status = "not_scheduled"
        artifact = {
            "run_id": run_id,
            "project_id": str(project.get("id") or ""),
            "project_name": str(project.get("name") or ""),
            "trigger": trigger,
            "started_at": started_at.isoformat(sep=" "),
            "finished_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "),
            "status": final_status,
            "requested": len(target_paths),
            "executed": executed,
            "success": success,
            "errors": errors,
            "not_scheduled": not_scheduled,
            "results": results,
        }
        artifact["report_markdown"] = self._bundle_markdown_report(artifact)
        self.record_bundle_run(artifact)
        return {"ok": True, **artifact}

    @staticmethod
    def _hash_password(password: str, iterations: int = 390000) -> str:
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        ).hex()
        return f"pbkdf2_sha256${iterations}${salt}${digest}"

    def _upsert_env_file(self, values: dict[str, str], env_file: Path | None = None) -> str:
        target = env_file or (Path(self.project_root) / ".env")
        if target.exists():
            lines = target.read_text().splitlines()
        else:
            lines = []
        index_by_key: dict[str, int] = {}
        for idx, line in enumerate(lines):
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key = stripped.split("=", 1)[0].strip()
            index_by_key[key] = idx
        for key, value in values.items():
            text = f"{key}={value}"
            if key in index_by_key:
                lines[index_by_key[key]] = text
            else:
                lines.append(text)
        target.write_text("\n".join(lines) + "\n")
        return str(target)

    def register_operator(
        self,
        *,
        project_name: str | None = None,
        username: str | None = None,
        password: str | None = None,
        disable_auth: bool = False,
        write_env: bool = False,
        monitor_policy: dict[str, Any] | None = None,
        bootstrap_monitoring: bool = True,
        overwrite_existing_schedule: bool | None = None,
    ) -> dict[str, Any]:
        if project_name is not None and not str(project_name).strip():
            raise ValueError("project_name must be non-empty")
        if (username and not password) or (password and not username):
            raise ValueError("username and password must be provided together")
        if username is not None and len(str(username).strip()) < 3:
            raise ValueError("username must be at least 3 characters")
        if password is not None and len(str(password)) < 8:
            raise ValueError("password must be at least 8 characters")
        if disable_auth and (username or password):
            raise ValueError("disable_auth cannot be combined with username/password")

        if project_name:
            self.project_name = str(project_name).strip()
        env_written_to = None
        if disable_auth:
            self.auth_enabled = False
            self.auth_username = ""
            self.auth_password = ""
            self.auth_password_hash = ""
            if write_env:
                env_written_to = self._upsert_env_file(
                    {
                        "JIN_PROJECT_NAME": self.project_name,
                        "JIN_AUTH_ENABLED": "false",
                        "JIN_USERNAME": "",
                        "JIN_PASSWORD_HASH": "",
                        "JIN_PASSWORD": "",
                    }
                )
        elif username and password:
            normalized_username = str(username).strip()
            self.auth_enabled = True
            self.auth_username = normalized_username
            self.auth_password = ""
            self.auth_password_hash = self._hash_password(str(password))
            if not self.auth_session_secret:
                self.auth_session_secret = secrets.token_hex(32)
            if write_env:
                env_written_to = self._upsert_env_file(
                    {
                        "JIN_PROJECT_NAME": self.project_name,
                        "JIN_AUTH_ENABLED": "true",
                        "JIN_USERNAME": normalized_username,
                        "JIN_PASSWORD_HASH": self.auth_password_hash,
                        "JIN_PASSWORD": "",
                        "JIN_SESSION_SECRET": self.auth_session_secret,
                    }
                )
        elif write_env:
            env_written_to = self._upsert_env_file({"JIN_PROJECT_NAME": self.project_name})

        project = self.add_project_to_catalog(self.project_name, source="register")
        project_id = str(project.get("id") or "")
        self._save_active_project_id(project_id)
        monitor_policy_payload = None
        if isinstance(monitor_policy, dict):
            monitor_policy_payload = self.set_project_monitor_policy(project_id, monitor_policy)["monitor_policy"]
        else:
            monitor_policy_payload = self.project_monitor_policy(project_id)
        monitor_bootstrap = None
        if bootstrap_monitoring:
            overwrite = bool(overwrite_existing_schedule) if overwrite_existing_schedule is not None else isinstance(
                monitor_policy, dict
            )
            monitor_bootstrap = self.apply_project_monitor_policy(
                project_id,
                overwrite_existing_schedule=overwrite,
            )
        return {
            "project": project,
            "auth_enabled": self.is_auth_enabled(),
            "auth_mode": "session_cookie" if self.is_auth_enabled() else "disabled",
            "env_written_to": env_written_to,
            "monitor_policy": monitor_policy_payload,
            "monitor_bootstrap": monitor_bootstrap,
        }

    def _init_db_if_needed(self) -> None:
        if self._initialized:
            return
        if init_db is not None:
            try:
                attempts = 0
                while True:
                    try:
                        init_db(self.db_path)
                        break
                    except Exception as exc:
                        attempts += 1
                        if platform.system().lower() == "windows" and self._is_duckdb_lock_error(exc) and attempts < 10:
                            # Uvicorn reload/workers can briefly overlap processes on Windows, which makes
                            # DuckDB refuse to open the file. Retry for a short window so the operator
                            # dashboard doesn't flap on reload.
                            time.sleep(min(0.05 * (2 ** (attempts - 1)), 0.5))
                            continue
                        raise
                if self._test_conn is not None:
                    try:
                        self._test_conn.close()
                    except Exception:
                        pass
                    self._test_conn = None
                self._initialized = True
                return
            except Exception as e:
                self.logger.error(f"Failed to initialize Jin database at {self.db_path}: {e}")
                if "assertion failed" in str(e).lower() or "dict_offset" in str(e).lower():
                    self.logger.error(
                        "DuckDB Assertion Failure detected. This usually means the DB file is corrupted or version-mismatched. Please delete it."
                    )
                # If native init fails, we do not silently fall back: this signals
                # potential corruption/version mismatch and operators should delete
                # or quarantine the DB file. (Python-only mode is handled when init_db
                # is absent/disabled.)
                return

        # Python-only fallback schema path (used when native is disabled or unavailable).
        try:
            import duckdb as py_duckdb  # type: ignore
        except ImportError:
            return
        try:
            with self.db_lock():
                conn = py_duckdb.connect(self.py_db_path)
                try:
                    # Core tables used by the reconciliation-first operator surface.
                    conn.execute(
                        """
                        CREATE TABLE IF NOT EXISTS jin_endpoints (
                          endpoint_path TEXT,
                          http_method TEXT,
                          pydantic_schema TEXT,
                          dimension_fields TEXT,
                          kpi_fields TEXT,
                          config_source TEXT DEFAULT 'auto',
                          created_at TIMESTAMP DEFAULT now(),
                          PRIMARY KEY (endpoint_path, http_method)
                        )
                        """
                    )
                    conn.execute(
                        """
                        CREATE TABLE IF NOT EXISTS jin_anomalies (
                          id BIGINT PRIMARY KEY,
                          endpoint_path TEXT,
                          grain_key TEXT,
                          kpi_field TEXT,
                          expected_value DOUBLE,
                          actual_value DOUBLE,
                          pct_change DOUBLE,
                          detection_method TEXT,
                          detected_at TIMESTAMP DEFAULT now(),
                          resolved_at TIMESTAMP,
                          is_active BOOLEAN DEFAULT true,
                          ai_explanation TEXT
                        )
                        """
                    )
                    conn.execute(
                        """
                        CREATE TABLE IF NOT EXISTS jin_reference (
                          id BIGINT PRIMARY KEY,
                          endpoint_path TEXT,
                          grain_key TEXT,
                          kpi_field TEXT,
                          expected_value DOUBLE,
                          tolerance_pct DOUBLE DEFAULT 10.0,
                          uploaded_at TIMESTAMP DEFAULT now(),
                          upload_source TEXT
                        )
                        """
                    )
                    conn.execute(
                        """
                        CREATE TABLE IF NOT EXISTS jin_config (
                          endpoint_path TEXT PRIMARY KEY,
                          dimension_overrides TEXT,
                          kpi_overrides TEXT,
                          tolerance_relaxed DOUBLE DEFAULT 20.0,
                          tolerance_normal DOUBLE DEFAULT 10.0,
                          tolerance_strict DOUBLE DEFAULT 5.0,
                          active_tolerance TEXT DEFAULT 'normal',
                          tolerance_pct DOUBLE DEFAULT 10.0,
                          confirmed BOOLEAN DEFAULT false,
                          rows_path TEXT,
                          time_end_field TEXT,
                          time_profile TEXT DEFAULT 'auto',
                          time_extraction_rule TEXT DEFAULT 'single',
                          time_format TEXT,
                          time_field TEXT,
                          time_granularity TEXT DEFAULT 'minute',
                          time_pin INTEGER DEFAULT 0,
                          updated_at TIMESTAMP DEFAULT now()
                        )
                        """
                    )
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS rows_path TEXT")
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_end_field TEXT")
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_profile TEXT DEFAULT 'auto'")
                    conn.execute(
                        "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_extraction_rule TEXT DEFAULT 'single'"
                    )
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_format TEXT")
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_field TEXT")
                    conn.execute(
                        "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_granularity TEXT DEFAULT 'minute'"
                    )
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_pin INTEGER DEFAULT 0")

                    conn.execute(
                        """
                        CREATE TABLE IF NOT EXISTS jin_incident_state (
                          anomaly_id BIGINT PRIMARY KEY,
                          incident_status TEXT DEFAULT 'active',
                          note TEXT,
                          owner TEXT,
                          resolution_reason TEXT,
                          snoozed_until TIMESTAMP,
                          suppressed_until TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT now()
                        )
                        """
                    )
                    conn.execute(
                        """
                        CREATE TABLE IF NOT EXISTS jin_incident_events (
                          id BIGINT PRIMARY KEY,
                          anomaly_id BIGINT,
                          event_type TEXT,
                          note TEXT,
                          owner TEXT,
                          resolution_reason TEXT,
                          payload_json TEXT,
                          created_at TIMESTAMP DEFAULT now()
                        )
                        """
                    )

                    self._ensure_watch_config_schema(conn)
                    self._ensure_check_runs_schema(conn)
                    self._ensure_upload_analysis_schema(conn)

                    try:
                        conn.execute("CHECKPOINT")
                    except Exception:
                        pass
                finally:
                    conn.close()
            self._initialized = True
        except Exception as e:  # pragma: no cover
            self.logger.error("Python fallback schema init failed for %s: %s", self.py_db_path, e)
            return

    @contextmanager
    def db_lock(self):
        self._native_db_lock.acquire()
        try:
            yield
        finally:
            self._native_db_lock.release()

    @contextmanager
    def _scheduler_job_lock(self, job_id: str):
        if not self.scheduler_leader_lock_enabled or fcntl is None:  # pragma: no cover
            yield True
            return

        digest = hashlib.sha256(f"{self.project_root}|{self.db_path}|{job_id}".encode("utf-8")).hexdigest()[:16]
        try:
            self.scheduler_lock_dir.mkdir(parents=True, exist_ok=True)
        except Exception:  # pragma: no cover
            yield True
            return
        lock_path = self.scheduler_lock_dir / f".jin-watch-{digest}.lock"
        lock_handle = None
        acquired = False
        try:
            lock_handle = lock_path.open("a+")
            fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            acquired = True
        except OSError:
            acquired = False

        try:
            yield acquired
        finally:
            if lock_handle is not None:
                if acquired:
                    try:
                        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_UN)
                    except Exception:  # pragma: no cover
                        pass
                lock_handle.close()

    def _get_connection(self):
        """Legacy helper for tests. Main code should use jin_core."""
        def windows_ephemeral_duckdb_connections() -> bool:
            # DuckDB on Windows uses stricter file locking than macOS/Linux. A long-lived
            # Python DuckDB connection can prevent the native (Rust) DuckDB client from
            # opening the same DB file, yielding:
            # "IO Error: cannot open ... the process cannot access the file because it is used by another process"
            #
            # On Windows, prefer short-lived Python connections that are closed after each use.
            return platform.system().lower() == "windows"

        @contextmanager
        def _scoped_lock_and_close(conn):
            self._native_db_lock.acquire()
            try:
                yield
            finally:
                self._native_db_lock.release()
                try:
                    conn.close()
                except Exception:
                    pass

        if self._test_conn is not None and not windows_ephemeral_duckdb_connections():
            try:
                # DuckDB can invalidate a connection after a fatal checkpoint error.
                self._test_conn.execute("SELECT 1")
                return self._test_conn, self.db_lock()
            except Exception as exc:
                if self._is_duckdb_internal_error(exc):
                    self._quarantine_corrupt_db(exc)
                try:
                    self._test_conn.close()
                except Exception:
                    pass
                self._test_conn = None
        # We perform a local import to avoid hard dependency in production
        try:
            import duckdb as py_duckdb
        except ImportError:
            return None, self.db_lock()
        attempts = 0
        while True:
            try:
                conn = py_duckdb.connect(self.py_db_path)
                break
            except Exception as exc:
                if self._is_duckdb_internal_error(exc):
                    self._quarantine_corrupt_db(exc)
                    continue
                attempts += 1
                if windows_ephemeral_duckdb_connections() and self._is_duckdb_lock_error(exc) and attempts < 10:
                    time.sleep(min(0.05 * (2 ** (attempts - 1)), 0.5))
                    continue
                raise
        try:
            if windows_ephemeral_duckdb_connections():
                return conn, _scoped_lock_and_close(conn)
            self._test_conn = conn
            return self._test_conn, self.db_lock()
        except Exception as exc:
            if self._is_duckdb_internal_error(exc):
                self._quarantine_corrupt_db(exc)
                conn = py_duckdb.connect(self.py_db_path)
                if windows_ephemeral_duckdb_connections():
                    return conn, _scoped_lock_and_close(conn)
                self._test_conn = conn
                return self._test_conn, self.db_lock()
            raise

    @staticmethod
    def _native_config_loading_disabled() -> bool:
        return os.getenv("JIN_DISABLE_NATIVE_CONFIG_LOAD", "").lower() in {"1", "true", "yes", "on"}

    def _is_duckdb_internal_error(self, exc: Exception) -> bool:
        text = str(exc).lower()
        markers = (
            "internal error",
            "assertion failure",
            "failed to load metadata pointer",
            "dict_offset",
        )
        return any(marker in text for marker in markers)

    def _is_duckdb_lock_error(self, exc: Exception) -> bool:
        text = str(exc).lower()
        markers = (
            "file already open",
            "already open",
            "already in use",
            "used by another process",
            "cannot open file",
            "io error: cannot open file",
            "permission denied",
        )
        return any(marker in text for marker in markers)

    def _quarantine_corrupt_db(self, exc: Exception) -> None:
        db_file = Path(self.db_path)
        if not db_file.exists():
            return

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        quarantine_path = db_file.with_name(f"{db_file.name}.corrupt.{timestamp}")
        try:
            db_file.replace(quarantine_path)
        except Exception as move_exc:  # pragma: no cover
            self.logger.error(
                "Detected DuckDB internal error but could not quarantine DB file %s: %s",
                self.db_path,
                move_exc,
            )
            return

        self.logger.error(
            "Detected DuckDB internal error. Quarantined %s to %s and creating a fresh DB.",
            self.db_path,
            quarantine_path,
        )
        self._record_error(
            "middleware.db",
            "DuckDB internal error detected. Quarantined corrupted DB and started with a fresh file.",
            detail=str(exc),
            hint=f"Old DB moved to {quarantine_path}. Restore from backup if needed.",
            level="error",
        )
        self._initialized = False
        if self._test_conn is not None:
            try:
                self._test_conn.close()
            except Exception:
                pass
            self._test_conn = None
        if init_db is not None:
            try:
                init_db(self.db_path)
                self._initialized = True
            except Exception as init_exc:
                self.logger.error("Failed to initialize fresh DuckDB after quarantine: %s", init_exc)
                raise

    def _ensure_python_schema(self) -> None:
        """Legacy helper for tests. Main code should use _init_db_if_needed."""
        self._init_db_if_needed()

    def _reset_cached_connection(self) -> None:
        if self._test_conn is None:
            return
        try:
            self._test_conn.close()
        except Exception:
            pass
        self._test_conn = None

    def is_auth_enabled(self) -> bool:
        return self.auth_enabled and bool(self.auth_username) and bool(self.auth_password or self.auth_password_hash)

    def _verify_password(self, password: str) -> bool:
        if self.auth_password_hash:
            try:
                algorithm, iteration_text, salt, digest = self.auth_password_hash.split("$", 3)
                if algorithm != "pbkdf2_sha256":
                    return False
                calculated = hashlib.pbkdf2_hmac(
                    "sha256",
                    password.encode("utf-8"),
                    salt.encode("utf-8"),
                    int(iteration_text),
                ).hex()
            except Exception:  # pragma: no cover
                return False
            return secrets.compare_digest(calculated, digest)
        return secrets.compare_digest(password, self.auth_password)

    def authenticate_credentials(self, username: str, password: str) -> bool:
        return secrets.compare_digest(username, self.auth_username) and self._verify_password(password)

    def create_session_token(self, username: str) -> str:
        issued_at = int(time.time())
        expires_at = issued_at + self.auth_session_ttl_seconds
        payload = f"{username}|{issued_at}|{expires_at}"
        signature = hmac.new(
            self.auth_session_secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        token = f"{payload}|{signature}"
        return base64.urlsafe_b64encode(token.encode("utf-8")).decode("ascii")

    def session_cookie_settings(self, request: Request | None) -> dict[str, Any]:
        secure = False
        if request is not None:
            secure = request.url.scheme == "https"
        return {
            "key": self.auth_session_cookie,
            "httponly": True,
            "samesite": "lax",
            "secure": secure,
            "max_age": self.auth_session_ttl_seconds,
            "path": "/jin",
        }

    def clear_session_cookie_settings(self, request: Request | None) -> dict[str, Any]:
        settings = self.session_cookie_settings(request)
        settings["max_age"] = 0
        return settings

    def is_authenticated(self, authorization: str | None = None, request: Request | None = None) -> bool:
        if not self.is_auth_enabled():
            return True
        session_token = None
        if request is not None:
            session_token = request.cookies.get(self.auth_session_cookie)
        if session_token:
            try:
                decoded = base64.urlsafe_b64decode(session_token.encode("ascii")).decode("utf-8")
                username, issued_text, expires_text, signature = decoded.split("|", 3)
                payload = f"{username}|{issued_text}|{expires_text}"
                expected_signature = hmac.new(
                    self.auth_session_secret.encode("utf-8"),
                    payload.encode("utf-8"),
                    hashlib.sha256,
                ).hexdigest()
                if (
                    secrets.compare_digest(signature, expected_signature)
                    and secrets.compare_digest(username, self.auth_username)
                    and int(expires_text) >= int(time.time())
                ):
                    return True
            except Exception:  # pragma: no cover
                pass
        if not authorization or not authorization.startswith("Basic "):
            return False
        try:
            decoded = base64.b64decode(authorization.split(" ", 1)[1]).decode("utf-8")
            username, password = decoded.split(":", 1)
        except Exception:  # pragma: no cover
            return False
        return self.authenticate_credentials(username, password)

    def _discover_routes(self, request: Any) -> None:
        app = getattr(request, "app", request)
        for route in app.routes:
            if not isinstance(route, APIRoute):
                continue
            path = route.path
            if path.startswith("/jin"):
                continue
            response_model = self._resolve_response_model(route)
            fields, dims, kpis, array_field_path = classify_model(response_model)
            discovery_status, discovery_reason_codes = self._discovery_profile(
                response_model=response_model,
                fields=fields,
                dimension_fields=dims,
                kpi_fields=kpis,
            )
            methods = sorted(route.methods or {"GET"})
            method = methods[0] if methods else "GET"
            metrics_override = getattr(route.endpoint, "_jin_metrics", [])
            for m in metrics_override:
                d_fields = [getattr(d, "field", None) or getattr(d, "name", "") for d in getattr(m, "dimensions", [])]
                dims.extend(d for d in d_fields if d not in dims)
                if hasattr(m, "calculation") and hasattr(m.calculation, "field"):
                    kpi_f = m.calculation.field
                    if kpi_f != "*" and kpi_f not in kpis:
                        kpis.append(kpi_f)
            if "api_version" not in dims:
                dims.append("api_version")
            if not any(f["name"] == "api_version" for f in fields):
                fields.append({"name": "api_version", "kind": "dimension", "annotation": "str", "suggested": False})
            route_watch_config = self._normalized_watch_config(getattr(route.endpoint, "_jin_watch", {}))
            watch_override = self._normalized_watch_config(self._load_watch_override(path))
            merged_watch_config = {
                **route_watch_config,
                **watch_override,
                "default_params": (
                    watch_override.get("default_params")
                    if watch_override.get("default_params")
                    else route_watch_config.get("default_params", {})
                ),
            }
            # Extract Request-side Grains (Path, Query, Body)
            request_fields = []
            if hasattr(route, "dependant"):
                # Path/Query params
                for param in route.dependant.query_params + route.dependant.path_params:
                    p_type = getattr(param, "type_", getattr(param, "annotation", str))
                    request_fields.append({
                        "name": param.name,
                        "kind": "grain",
                        "annotation": str(getattr(p_type, "__name__", str(p_type))),
                        "source": "query" if param in route.dependant.query_params else "path",
                        "required": True
                    })
                # Body params (for POST-as-GET reads)
                for body in route.dependant.body_params:
                    b_type = getattr(body, "type_", getattr(body, "annotation", None))
                    if inspect.isclass(b_type) and issubclass(b_type, BaseModel):
                        body_fields, _, _, _ = classify_model(b_type)
                        for bf in body_fields:
                            bf["source"] = "body"
                            bf["kind"] = "grain"
                            request_fields.append(bf)
                    else:
                        request_fields.append({
                            "name": body.name,
                            "kind": "grain",
                            "annotation": str(getattr(b_type, "__name__", "str")),
                            "source": "body",
                            "required": True
                        })

            self.endpoint_registry[path] = EndpointRecord(
                method=method,
                path=path,
                response_model=response_model,
                endpoint_callable=route.endpoint,
                fields=fields,
                dimension_fields=dims,
                kpi_fields=kpis,
                array_field_path=array_field_path,
                metrics=metrics_override,
                watch_config=merged_watch_config,
                discovery_status=discovery_status,
                discovery_reason_codes=discovery_reason_codes,
                request_fields=request_fields,
            )
        self._sync_endpoint_registry_to_db()

    @staticmethod
    def _resolve_response_model(route: APIRoute) -> Any:
        response_model = getattr(route, "response_model", None)
        if response_model is not None:
            return response_model
        try:
            signature = inspect.signature(route.endpoint)
        except Exception:
            return None
        if signature.return_annotation is inspect.Signature.empty:
            return None
        candidate = signature.return_annotation
        try:
            fields, _dims, _kpis, _array = classify_model(candidate)
        except Exception:
            return None
        non_technical_fields = [
            field
            for field in fields
            if str(field.get("name") or "").strip() not in TECHNICAL_METADATA_FIELDS
        ]
        if not non_technical_fields:
            return None
        return candidate

    @staticmethod
    def _discovery_profile(
        *,
        response_model: Any,
        fields: list[dict[str, Any]],
        dimension_fields: list[str],
        kpi_fields: list[str],
    ) -> tuple[str, list[str]]:
        reason_codes: list[str] = []
        if response_model is None:
            reason_codes.append("missing_response_model")
        if response_model is not None and not fields:
            reason_codes.append("unsupported_response_model_shape")
        if not dimension_fields:
            reason_codes.append("no_dimension_fields_detected")
        if not kpi_fields:
            reason_codes.append("no_kpi_fields_detected")

        # Jin can still operate without a response_model by inferring fields from runtime
        # observations and letting operators confirm Segment/Metric/Time mappings.
        if "missing_response_model" in reason_codes or "unsupported_response_model_shape" in reason_codes:
            return "runtime_infer", reason_codes
        if reason_codes:
            return "partial", reason_codes
        return "ready", reason_codes

    def _sync_endpoint_registry_to_db(self) -> None:
        if sync_registry is None:  # pragma: no cover
            return
            
        self._init_db_if_needed()
        
        records = []
        for path, record in self.endpoint_registry.items():
            records.append(
                {
                    "endpoint_path": path,
                    "http_method": record.method,
                    "dimension_fields": record.dimension_fields,
                    "kpi_fields": record.kpi_fields,
                    "discovery_status": record.discovery_status,
                    "discovery_reason_codes": record.discovery_reason_codes,
                    "schema_contract": build_schema_contract(
                        EndpointModelInfo(
                            method=record.method,
                            path=record.path,
                            fields=record.fields,
                            dimension_fields=record.dimension_fields,
                            kpi_fields=record.kpi_fields,
                            metrics=record.metrics,
                            array_field_path=record.array_field_path,
                            request_fields=record.request_fields,
                        )
                    ),
                }
            )
        try:
            sync_registry(self.db_path, json.dumps(records))
        except Exception as exc:
            self._record_error(
                "registry.sync",
                "Failed to sync endpoint registry to native store.",
                hint="Check the native extension and database connectivity.",
                detail=str(exc),
                level="error",
            )

    def _ensure_initialized(self, request: Request) -> None:
        if self._initialized:
            return
        self._init_db_if_needed()
        self._discover_routes(request)
        if not self._router_mounted:  # pragma: no branch
            request.app.include_router(create_router(self), prefix="/jin")
            self._router_mounted = True
        self._register_scheduler_jobs()
        self._ensure_ingestion_workers()
        if self.scheduler_enabled:
            self.scheduler.start()
        self._initialized = True
        if self._startup_completed_perf is None:
            self._startup_completed_perf = time.perf_counter()

    def runtime_diagnostics(self) -> dict[str, Any]:
        native_available = all(fn is not None for fn in (init_db, process_observation, get_status))
        runtime_mode = "native" if native_available else "python_fallback"
        startup_seconds = None
        if self._startup_completed_perf is not None:
            startup_seconds = max(self._startup_completed_perf - self._middleware_created_perf, 0.0)

        discovery_summary: dict[str, int] = {
            "ready": 0,
            "partial": 0,
            "runtime_infer": 0,
            "total": len(self.endpoint_registry),
        }
        reason_counts: dict[str, int] = {}
        for endpoint in self.endpoint_registry.values():
            status = str(endpoint.discovery_status or "partial")
            discovery_summary[status] = int(discovery_summary.get(status, 0)) + 1
            for code in endpoint.discovery_reason_codes:
                reason_counts[code] = int(reason_counts.get(code, 0)) + 1

        return {
            "runtime_mode": runtime_mode,
            "native_available": native_available,
            "native_missing_features": [
                name
                for name, fn in (
                    ("init_db", init_db),
                    ("process_observation", process_observation),
                    ("get_status", get_status),
                )
                if fn is None
            ],
            "startup_completed": self._startup_completed_perf is not None,
            "startup_seconds": round(startup_seconds, 4) if startup_seconds is not None else None,
            "discovery": {
                "summary": discovery_summary,
                "reason_counts": reason_counts,
            },
        }

    def _ensure_ingestion_workers(self) -> None:
        if not self.async_ingest_enabled:
            return
        if self._ingest_queue is None:
            self._ingest_queue = asyncio.Queue(maxsize=self.ingest_queue_size)
        if self._ingest_worker_tasks:
            return
        for worker_index in range(self.ingest_workers):
            task = asyncio.create_task(self._ingestion_worker(worker_index + 1))
            self._ingest_worker_tasks.append(task)

    def _enqueue_ingestion_task(self, payload: dict[str, Any]) -> bool:
        if self._ingest_queue is None:
            return False
        try:
            self._ingest_queue.put_nowait(payload)
            return True
        except asyncio.QueueFull:
            return False

    async def _ingestion_worker(self, worker_id: int) -> None:
        if self._ingest_queue is None:
            return
        while True:
            payload = await self._ingest_queue.get()
            try:
                await self._process_observation_payload_async(
                    payload["record"],
                    payload["endpoint_path"],
                    payload["method"],
                    payload["request_json"],
                    payload["data"],
                    payload["config_json"],
                )
            except asyncio.CancelledError:  # pragma: no cover
                raise
            except Exception as exc:
                self._record_error(
                    "middleware.ingest_worker",
                    f"Asynchronous ingestion worker {worker_id} failed to process payload.",
                    hint="Check queue backpressure and payload compatibility for monitored endpoints.",
                    endpoint_path=str(payload.get("endpoint_path") or ""),
                    detail=str(exc),
                    level="warning",
                )
            finally:
                self._ingest_queue.task_done()

    async def _process_observation_payload_async(
        self,
        record: EndpointRecord,
        endpoint_path: str,
        method: str,
        request_json: str,
        data: Any,
        config_json: str,
    ) -> None:
        # If native is disabled/unavailable, don't attempt native calls (they create noisy
        # "NoneType is not callable" operator warnings). Go straight to the Python path.
        native_available = process_observation is not None or process_observations is not None

        array_items = None
        if isinstance(data, list):
            array_items = data
        elif hasattr(record, "array_field_path") and record.array_field_path:  # pragma: no cover
            self.logger.info(f"Jin: processing array at {record.array_field_path}")
            parts = record.array_field_path.split(".")
            curr = data
            for part in parts:
                if isinstance(curr, dict) and part in curr:
                    curr = curr[part]
                else:
                    curr = None
                    break
            if isinstance(curr, list):
                array_items = curr
                self.logger.info(f"Jin: extracted {len(array_items)} items from {record.array_field_path}")
            else:
                self.logger.warning(f"Jin: expected list at {record.array_field_path}, got {type(curr)}")

        if array_items is not None:  # pragma: no cover
            if not native_available:
                for item in array_items:
                    fallback_result = self._build_python_observation_result(record, request_json, item)
                    self._mirror_python_state(record, fallback_result, item)
                self.license_client.increment_usage(len(array_items))
                return
            self.logger.info(f"Jin: processing {len(array_items)} observation item(s)")
            prefixed_items = []
            prefix = f"{record.array_field_path}[]."
            for item in array_items:
                if isinstance(item, dict):
                    prefixed_items.append({f"{prefix}{k}": v for k, v in item.items()})
                else:
                    prefixed_items.append(item)

            try:
                results = await self._run_native_process_observations_async(
                    endpoint_path,
                    method,
                    request_json,
                    json.dumps(prefixed_items),
                    config_json,
                )
                for item, result in zip(array_items, results):
                    self._mirror_python_state(record, result, item)
                    for anomaly in result.get("anomalies", []):
                        self.logger.warning(
                            "anomaly detected: %s %s %s%%",
                            result["grain_key"],
                            anomaly["kpi_field"],
                            anomaly["pct_change"],
                        )
            except Exception as exc:
                self._record_error(
                    "middleware.process_response",
                    "Native observation processing failed; using Python fallback for this response.",
                    hint="Check stored endpoint config rows and DuckDB native extension compatibility.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    level="warning",
                )
                for item in array_items:
                    fallback_result = self._build_python_observation_result(record, request_json, item)
                    self._mirror_python_state(record, fallback_result, item)
            self.license_client.increment_usage(len(array_items))
        else:
            if not native_available:
                fallback_result = self._build_python_observation_result(record, request_json, data)
                self._mirror_python_state(record, fallback_result, data)
                self.license_client.increment_usage(1)
                return
            try:
                await self._record_processed_item_async(record, endpoint_path, method, request_json, data, config_json)
            except Exception as exc:
                self._record_error(
                    "middleware.process_response",
                    "Native observation processing failed; using Python fallback for this response.",
                    hint="Check stored endpoint config rows and DuckDB native extension compatibility.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    level="warning",
                )
                fallback_result = self._build_python_observation_result(record, request_json, data)
                self._mirror_python_state(record, fallback_result, data)
            self.license_client.increment_usage(1)

    async def dispatch(self, request: Request, call_next) -> Response:
        self._ensure_initialized(request)
        if request.url.path.startswith("/jin") or request.url.path in self.exclude_paths:
            response = await call_next(request)
            if request.url.path.startswith("/jin/api/") and not request.url.path.startswith("/jin/api/v2/"):
                response.headers.setdefault("Deprecation", "true")
                response.headers.setdefault("Sunset", API_V1_SUNSET)
                response.headers.setdefault("Link", API_V2_MIGRATION_LINK)
            return response

        body = await request.body()

        async def receive() -> dict[str, Any]:  # pragma: no cover
            return {"type": "http.request", "body": body, "more_body": False}

        cloned_request = Request(request.scope, receive=receive)
        response = await call_next(cloned_request)
        if response.status_code >= 400:
            return response

        chunks = [chunk async for chunk in response.body_iterator]
        payload = b"".join(chunks)
        media_type = response.media_type or response.headers.get("content-type", "")
        if "application/json" not in media_type:
            return Response(
                content=payload,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        try:
            data = json.loads(payload or b"null")
            route = request.scope.get("route")
            endpoint_path = route.path if isinstance(route, APIRoute) else request.url.path
            record = self.endpoint_registry.get(endpoint_path)
            if record and record.kpi_fields:
                request_json = self._build_request_json(request, body)
                config_json = self._build_endpoint_config(record)

                if self.async_ingest_enabled:
                    enqueued = self._enqueue_ingestion_task(
                        {
                            "record": record,
                            "endpoint_path": endpoint_path,
                            "method": request.method,
                            "request_json": request_json,
                            "data": data,
                            "config_json": config_json,
                        }
                    )
                    if not enqueued:
                        self._record_error(
                            "middleware.ingest_queue",
                            "Ingestion queue reached capacity; processing inline to preserve data quality coverage.",
                            hint="Increase JIN_INGEST_QUEUE_SIZE or scale worker resources for sustained throughput.",
                            endpoint_path=endpoint_path,
                            level="warning",
                        )
                        await self._process_observation_payload_async(
                            record,
                            endpoint_path,
                            request.method,
                            request_json,
                            data,
                            config_json,
                        )
                else:
                    await self._process_observation_payload_async(
                        record,
                        endpoint_path,
                        request.method,
                        request_json,
                        data,
                        config_json,
                    )
        except Exception as exc:  # pragma: no cover
            self._record_error(
                "middleware.process_response",
                "Failed to process response payload for Jin monitoring.",
                hint="Check that the endpoint returns JSON matching the monitored schema.",
                endpoint_path=request.url.path,
                detail=str(exc),
            )

        return Response(
            content=payload,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )

    async def _process_item_async(  # pragma: no cover
        self,
        endpoint_path: str,
        method: str,
        request_json: str,
        item: Any,
        config_json: str,
    ) -> dict[str, Any]:
        result_str = await self._run_native_process_observation_async(
            endpoint_path,
            method,
            request_json,
            json.dumps(item),
            config_json,
        )
        return self._normalize_native_reconciliation_result(json.loads(result_str))

    def _process_item(
        self,
        endpoint_path: str,
        method: str,
        request_json: str,
        item: Any,
        config_json: str,
    ) -> dict[str, Any]:
        return self._normalize_native_reconciliation_result(
            json.loads(
                self._run_native_process_observation(
                    endpoint_path,
                    method,
                    request_json,
                    json.dumps(item),
                    config_json,
                )
            )
        )

    async def _run_native_process_observation_async(  # pragma: no cover
        self,
        endpoint_path: str,
        method: str,
        request_json: str,
        response_json: str,
        config_json: str,
    ) -> str:
        def _sync_call() -> str:
            with self.db_lock():
                return process_observation(
                    endpoint_path,
                    method,
                    request_json,
                    response_json,
                    config_json,
                    self.db_path,
                )
        if self.native_threadpool_enabled:
            return await anyio.to_thread.run_sync(_sync_call)
        return _sync_call()

    def _run_native_process_observation(
        self,
        endpoint_path: str,
        method: str,
        request_json: str,
        response_json: str,
        config_json: str,
    ) -> str:
        with self.db_lock():
            return process_observation(
                endpoint_path,
                method,
                request_json,
                response_json,
                config_json,
                self.db_path,
            )

    async def _run_native_process_observations_async(  # pragma: no cover
        self,
        endpoint_path: str,
        method: str,
        request_json: str,
        response_json: str,
        config_json: str,
    ) -> list[dict[str, Any]]:
        def _sync_call() -> list[dict[str, Any]]:
            if process_observations is not None and self.native_batch_observations_enabled:
                with self.db_lock():
                    return [
                        self._normalize_native_reconciliation_result(item)
                        for item in json.loads(
                        process_observations(
                            endpoint_path,
                            method,
                            request_json,
                            response_json,
                            config_json,
                            self.db_path,
                        )
                    )]
            items = json.loads(response_json)
            if not isinstance(items, list):
                items = [items]
            return [
                self._normalize_native_reconciliation_result(
                    json.loads(
                        self._run_native_process_observation(
                            endpoint_path,
                            method,
                            request_json,
                            json.dumps(item),
                            config_json,
                        )
                    )
                )
                for item in items
            ]
        if self.native_threadpool_enabled:
            return await anyio.to_thread.run_sync(_sync_call)
        return _sync_call()

    def _run_native_process_observations(  # pragma: no cover
        self,
        endpoint_path: str,
        method: str,
        request_json: str,
        response_json: str,
        config_json: str,
    ) -> list[dict[str, Any]]:
        if process_observations is not None and self.native_batch_observations_enabled:
            with self.db_lock():
                return [
                    self._normalize_native_reconciliation_result(item)
                    for item in json.loads(
                    process_observations(
                        endpoint_path,
                        method,
                        request_json,
                        response_json,
                        config_json,
                        self.db_path,
                    )
                )]
        items = json.loads(response_json)
        if not isinstance(items, list):
            items = [items]
        return [
            self._normalize_native_reconciliation_result(
                json.loads(
                    self._run_native_process_observation(
                        endpoint_path,
                        method,
                        request_json,
                        json.dumps(item),
                        config_json,
                    )
                )
            )
            for item in items
        ]

    async def _record_processed_item_async(  # pragma: no cover
        self,
        record: EndpointRecord,
        endpoint_path: str,
        method: str,
        request_json: str,
        item: Any,
        config_json: str,
    ) -> dict[str, Any]:
        if process_observation is None:
            result = self._build_python_observation_result(record, request_json, item)
        else:
            result = await self._process_item_async(endpoint_path, method, request_json, item, config_json)
        self._mirror_python_state(record, result, item)
        for anomaly in result.get("anomalies", []):
            self.logger.warning(
                "anomaly detected: %s %s %s%%",
                result["grain_key"],
                anomaly["kpi_field"],
                anomaly["pct_change"],
            )
        return result

    def _record_processed_item(
        self,
        record: EndpointRecord,
        endpoint_path: str,
        method: str,
        request_json: str,
        item: Any,
        config_json: str,
    ) -> dict[str, Any]:
        if process_observation is None:
            result = self._build_python_observation_result(record, request_json, item)
        else:
            result = self._process_item(endpoint_path, method, request_json, item, config_json)
        self._mirror_python_state(record, result, item)
        for anomaly in result.get("anomalies", []):
            self.logger.warning(
                "anomaly detected: %s %s %s%%",
                result["grain_key"],
                anomaly["kpi_field"],
                anomaly["pct_change"],
            )
        return result

    def _load_overrides(self, endpoint_path: str) -> dict[str, Any]:
        if endpoint_path in self.override_state:
            return self.override_state[endpoint_path]
        merged: dict[str, Any] = {}
        native_config_enabled = load_saved_endpoint_config is not None and not self._native_config_loading_disabled()
        native_failed = False
        if native_config_enabled:
            try:
                payload = json.loads(load_saved_endpoint_config(self.db_path, endpoint_path))
                if not payload:
                    # Treat "no row" (or a native layer returning `{}`) as a signal to try
                    # the Python fallback store. This keeps config loading resilient when
                    # native persistence is degraded but the shadow row exists.
                    native_failed = True
                else:
                    merged.update({
                        "dimension_fields": payload.get("dimension_fields"),
                        "kpi_fields": payload.get("kpi_fields"),
                        "tolerance_pct": payload.get("tolerance_pct") or self.global_threshold,
                        "confirmed": bool(payload.get("confirmed", False)),
                        "tolerance_relaxed": payload.get("tolerance_relaxed") or 20.0,
                        "tolerance_normal": payload.get("tolerance_normal")
                        or payload.get("tolerance_pct")
                        or self.global_threshold,
                        "tolerance_strict": payload.get("tolerance_strict") or 5.0,
                        "active_tolerance": payload.get("active_tolerance") or "normal",
                        "time_field": payload.get("time_field"),
                        "time_granularity": payload.get("time_granularity") or "minute",
                    })
            except Exception as exc:
                self._record_error(
                    "config.overrides",
                    "Falling back to Python override loading after native config load error.",
                    hint="Check the stored endpoint config row and native extension compatibility.",
                    endpoint_path=endpoint_path,
                    detail=str(exc),
                    level="warning",
                )
                native_failed = True
        if not native_config_enabled or native_failed:
            try:
                conn, lock = self._get_connection()
                with lock:
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
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS rows_path VARCHAR")
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_end_field VARCHAR")
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_profile VARCHAR DEFAULT 'auto'")
                    conn.execute(
                        "ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_extraction_rule VARCHAR DEFAULT 'single'"
                    )
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_format VARCHAR")
                    conn.execute("ALTER TABLE jin_config ADD COLUMN IF NOT EXISTS time_pin INTEGER DEFAULT 0")
                    row = conn.execute(
                        """
                        SELECT
                            dimension_overrides,
                            kpi_overrides,
                            tolerance_pct,
                            confirmed,
                            tolerance_relaxed,
                            tolerance_normal,
                            tolerance_strict,
                            active_tolerance,
                            time_field,
                            time_granularity,
                            rows_path,
                            time_end_field,
                            time_profile,
                            time_extraction_rule,
                            time_format,
                            time_pin
                        FROM jin_config
                        WHERE endpoint_path = ?
                        """,
                        [endpoint_path],
                    ).fetchone()
                if row:
                    if merged.get("dimension_fields") is None and row[0]:
                        try:
                            merged["dimension_fields"] = json.loads(row[0])
                        except Exception:
                            pass
                    if merged.get("kpi_fields") is None and row[1]:
                        try:
                            merged["kpi_fields"] = json.loads(row[1])
                        except Exception:
                            pass
                    if merged.get("tolerance_pct") is None and row[2] is not None:
                        merged["tolerance_pct"] = float(row[2])
                    if merged.get("confirmed") is None and row[3] is not None:
                        merged["confirmed"] = bool(row[3])
                    if merged.get("tolerance_relaxed") is None and row[4] is not None:
                        merged["tolerance_relaxed"] = float(row[4])
                    if merged.get("tolerance_normal") is None and row[5] is not None:
                        merged["tolerance_normal"] = float(row[5])
                    if merged.get("tolerance_strict") is None and row[6] is not None:
                        merged["tolerance_strict"] = float(row[6])
                    if merged.get("active_tolerance") is None and row[7]:
                        merged["active_tolerance"] = row[7]
                    if merged.get("time_field") is None and row[8]:
                        merged["time_field"] = row[8]
                    if merged.get("time_granularity") is None and row[9]:
                        merged["time_granularity"] = row[9]
                    merged.update(
                        {
                            "rows_path": row[10],
                            "time_end_field": row[11],
                            "time_profile": row[12] or "auto",
                            "time_extraction_rule": row[13] or "single",
                            "time_format": row[14],
                            "time_pin": bool(row[15]) if row[15] is not None else False,
                        }
                    )
            except Exception:
                pass
        return merged

    def _build_endpoint_config(self, record: EndpointRecord, extra: dict[str, Any] | None = None) -> str:
        if resolve_endpoint_config is not None and not self._native_config_loading_disabled():
            try:
                return resolve_endpoint_config(
                    self.db_path,
                    record.path,
                    json.dumps(record.dimension_fields),
                    json.dumps(record.kpi_fields),
                    self.global_threshold,
                    record.watch_config.get("threshold"),
                    json.dumps(extra or {}),
                )
            except Exception as exc:
                self._record_error(
                    "config.resolve",
                    "Falling back to Python config resolution after native resolver error.",
                    hint="Verify the stored endpoint config JSON and native extension compatibility.",
                    endpoint_path=record.path,
                    detail=str(exc),
                    level="warning",
                )
                pass
        
        weights = {}
        for kpi in record.kpi_fields:
            env_key = f"JIN_WEIGHT_{kpi.upper().replace('.', '_')}"
            weight = os.environ.get(env_key)
            if weight:
                try:
                    weights[kpi] = float(weight)
                except ValueError:
                    pass

        overrides = {
            "tolerance_pct": self.global_threshold,
            "kpi_weights": weights,
            "currency": os.environ.get("JIN_CURRENCY", "$")
        }
        overrides.update({k: v for k, v in self._load_overrides(record.path).items() if v is not None})
        if record.watch_config.get("threshold") is not None:
            overrides["tolerance_pct"] = record.watch_config["threshold"]
        if extra:
            overrides.update(extra)
        return build_config_json(
            EndpointModelInfo(
                method=record.method,
                path=record.path,
                fields=record.fields,
                dimension_fields=record.dimension_fields,
                kpi_fields=record.kpi_fields,
            ),
            overrides=overrides,
        )

    @staticmethod
    def _path_param_names(path_template: str) -> set[str]:
        return set(re.findall(r"{([^}/]+)}", path_template))

    @staticmethod
    def _grain_key_from_dimensions(endpoint_path: str, dimensions: dict[str, Any]) -> str:
        if not dimensions:
            return endpoint_path
        def _is_technical_dimension(key: str) -> bool:
            leaf = key.replace("[]", "").split(".")[-1]
            return leaf in TECHNICAL_METADATA_FIELDS

        business_dims = [key for key in sorted(dimensions) if not _is_technical_dimension(key)]
        if not business_dims:
            return endpoint_path
        suffix = "|".join(f"{key}={dimensions[key]}" for key in business_dims)
        return f"{endpoint_path}|{suffix}"

    @staticmethod
    def _coerce_number(value: Any) -> float | None:
        if value is None or value == "":
            return None
        if isinstance(value, bool):
            return None
        if isinstance(value, (int, float)):
            return float(value)
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _comparison_pct_change(self, actual: Any, expected: Any, fallback_pct: Any = None) -> float | None:
        fallback = self._coerce_number(fallback_pct)
        if fallback is not None:
            return fallback
        actual_value = self._coerce_number(actual)
        expected_value = self._coerce_number(expected)
        if actual_value is None or expected_value is None:
            return None
        if expected_value == 0:
            return 0.0 if actual_value == 0 else None
        return ((actual_value - expected_value) / abs(expected_value)) * 100.0

    @staticmethod
    def _comparison_reason(
        kpi_field: str,
        actual: Any,
        expected: Any,
        status: str,
        pct_change: float | None,
        tolerance_pct: float | None = None,
    ) -> str:
        if status == "error":
            return "Jin could not complete the API call for this grain."
        if status == "missing_reference":
            return f"Jin did not find an uploaded reference for {kpi_field} on this grain."
        if status == "missing_kpi":
            return f"The API response did not include {kpi_field}, so Jin could not compare it to the uploaded reference."
        if status == "match":
            if tolerance_pct is not None and pct_change is not None:
                if abs(pct_change) == 0:
                    return f"{kpi_field} matched the uploaded reference ({actual} vs {expected})."
                return (
                    f"{kpi_field} stayed within the allowed +/-{tolerance_pct:.1f}% tolerance "
                    f"({abs(pct_change):.2f}% difference)."
                )
            return f"{kpi_field} matched the uploaded reference ({actual} vs {expected})."
        if pct_change is None:
            return f"{kpi_field} did not match the uploaded reference ({actual} vs {expected})."
        direction = "higher" if pct_change > 0 else "lower"
        if pct_change == 0:
            direction = "different"
        if tolerance_pct is not None:
            return (
                f"{kpi_field} returned {actual} while the CSV expected {expected} "
                f"({abs(pct_change):.2f}% {direction}), outside the allowed +/-{tolerance_pct:.1f}% tolerance."
            )
        return (
            f"{kpi_field} returned {actual} while the CSV expected {expected} "
            f"({abs(pct_change):.2f}% {direction} than the reference)."
        )

    def _analysis_run_from_result(
        self,
        record: EndpointRecord,
        row: dict[str, Any],
        invocation: dict[str, Any],
        result: dict[str, Any],
    ) -> dict[str, Any]:
        dimensions = row.get("dimensions", {}) if isinstance(row, dict) else {}
        expected_values = row.get("expected", {}) if isinstance(row, dict) else {}
        tolerance_pct = self._coerce_number(row.get("tolerance_pct")) if isinstance(row, dict) else None
        grain_key = result.get("grain_key") or self._grain_key_from_dimensions(record.path, dimensions)
        anomalies_by_kpi = {
            str(item.get("kpi_field")): item
            for item in result.get("anomalies", [])
            if item.get("kpi_field") is not None
        }
        comparisons: list[dict[str, Any]] = []
        seen_kpis: set[str] = set()
        mismatch_count = 0
        matched_count = 0

        for raw_comparison in result.get("comparisons", []):
            kpi_field = str(raw_comparison.get("kpi_field") or "")
            if not kpi_field:
                continue
            seen_kpis.add(kpi_field)
            actual_value = self._coerce_number(raw_comparison.get("actual"))
            expected_value = raw_comparison.get("expected")
            if expected_value is None and kpi_field in expected_values:
                expected_value = expected_values.get(kpi_field)
            anomaly = anomalies_by_kpi.get(kpi_field)
            pct_change = self._comparison_pct_change(
                raw_comparison.get("actual"),
                expected_value,
                anomaly.get("pct_change") if anomaly else None,
            )

            if expected_value is None:
                status = "missing_reference"
            elif anomaly is not None:
                status = "mismatch"
            elif tolerance_pct is not None and pct_change is not None and abs(pct_change) > tolerance_pct:
                status = "mismatch"
            else:
                status = "match"

            if status == "match":
                matched_count += 1
            else:
                mismatch_count += 1

            comparisons.append(
                {
                    "kpi_field": kpi_field,
                    "actual_value": actual_value,
                    "expected_value": self._coerce_number(expected_value),
                    "delta": self._coerce_number(raw_comparison.get("delta")),
                    "pct_change": pct_change,
                    "allowed_tolerance_pct": tolerance_pct,
                    "status": status,
                    "message": self._comparison_reason(
                        kpi_field,
                        actual_value,
                        expected_value,
                        status,
                        pct_change,
                        tolerance_pct,
                    ),
                }
            )

        for kpi_field, expected_value in expected_values.items():
            if kpi_field in seen_kpis:
                continue
            mismatch_count += 1
            comparisons.append(
                {
                    "kpi_field": kpi_field,
                    "actual_value": None,
                    "expected_value": self._coerce_number(expected_value),
                    "delta": None,
                    "pct_change": None,
                    "allowed_tolerance_pct": tolerance_pct,
                    "status": "missing_kpi",
                    "message": self._comparison_reason(
                        kpi_field,
                        None,
                        expected_value,
                        "missing_kpi",
                        None,
                        tolerance_pct,
                    ),
                }
            )

        if mismatch_count:
            status = "mismatch"
            message = (
                f"{mismatch_count} KPI check(s) did not match the uploaded reference for this grain."
            )
        else:
            status = "match"
            message = f"All {matched_count} KPI check(s) matched the uploaded reference for this grain."

        return {
            "grain_key": grain_key,
            "dimensions": dimensions,
            "request": invocation,
            "status": status,
            "message": message,
            "tolerance_pct": tolerance_pct,
            "matched_checks": matched_count,
            "mismatched_checks": mismatch_count,
            "comparisons": comparisons,
        }

    def _analysis_run_from_error(
        self,
        record: EndpointRecord,
        row: dict[str, Any],
        invocation: dict[str, Any],
        error: Exception,
    ) -> dict[str, Any]:
        dimensions = row.get("dimensions", {}) if isinstance(row, dict) else {}
        return {
            "grain_key": self._grain_key_from_dimensions(record.path, dimensions),
            "dimensions": dimensions,
            "request": invocation,
            "status": "error",
            "message": "Jin could not complete the API call for this uploaded grain.",
            "error": str(error),
            "matched_checks": 0,
            "mismatched_checks": 0,
            "comparisons": [],
        }

    @staticmethod
    def _analysis_field_token(field_name: str) -> str:
        raw = str(field_name or "").lower()
        allowed = set(string.ascii_lowercase + string.digits)
        return "".join(ch for ch in raw if ch in allowed)

    def _lookup_analysis_actual_value(self, payload: dict[str, Any], kpi_field: str) -> float | None:
        if not isinstance(payload, dict):
            return None
        if kpi_field in payload:
            return self._coerce_number(payload.get(kpi_field))
        normalized_target = self._analysis_field_token(kpi_field)
        leaf_target = self._analysis_field_token(kpi_field.replace("[]", "").split(".")[-1])
        for key, value in payload.items():
            if key == kpi_field:
                return self._coerce_number(value)
            normalized_key = self._analysis_field_token(key)
            if normalized_key and normalized_key == normalized_target:
                return self._coerce_number(value)
            if leaf_target and normalized_key.endswith(leaf_target):
                return self._coerce_number(value)
        return None

    def _select_upload_analysis_payload(self, record: EndpointRecord, row: dict[str, Any], data: Any) -> Any:
        array_items, prefixed_items = self._extract_array_items_for_result(record, data)
        if array_items is None or prefixed_items is None:
            return data
        dimensions = row.get("dimensions", {}) if isinstance(row, dict) else {}
        if not isinstance(dimensions, dict) or not dimensions:
            return prefixed_items[0] if prefixed_items else data
        best_index = 0
        best_score = -1
        for index, item in enumerate(prefixed_items):
            if not isinstance(item, dict):
                continue
            score = 0
            for key, expected in dimensions.items():
                expected_text = str(expected)
                direct = item.get(key)
                if direct is not None and str(direct) == expected_text:
                    score += 1
                    continue
                leaf = str(key).replace("[]", "").split(".")[-1]
                for item_key, item_value in item.items():
                    if str(item_key).replace("[]", "").split(".")[-1] == leaf and str(item_value) == expected_text:
                        score += 1
                        break
            if score > best_score:
                best_score = score
                best_index = index
        if 0 <= best_index < len(prefixed_items):
            return prefixed_items[best_index]
        return prefixed_items[0] if prefixed_items else data

    def _build_safe_upload_analysis_result(
        self,
        record: EndpointRecord,
        row: dict[str, Any],
        data: Any,
    ) -> tuple[dict[str, Any], Any]:
        dimensions = row.get("dimensions", {}) if isinstance(row, dict) else {}
        expected_values = row.get("expected", {}) if isinstance(row, dict) else {}
        selected_payload = self._select_upload_analysis_payload(record, row, data)
        flattened = self._flatten_item(selected_payload)
        tolerance_pct = self._coerce_number(row.get("tolerance_pct")) if isinstance(row, dict) else None
        tolerance = tolerance_pct if tolerance_pct is not None else self.global_threshold
        comparisons: list[dict[str, Any]] = []
        anomalies: list[dict[str, Any]] = []
        actual_kpis: dict[str, Any] = {}
        for kpi_field, expected in expected_values.items():
            expected_key = str(kpi_field)
            actual = self._lookup_analysis_actual_value(flattened, expected_key)
            expected_value = self._coerce_number(expected)
            if actual is not None:
                actual_kpis[expected_key] = actual
            delta = None
            pct_change = None
            if actual is not None and expected_value is not None:
                delta = actual - expected_value
                pct_change = self._comparison_pct_change(actual, expected_value)
                if pct_change is not None and abs(pct_change) > tolerance:
                    anomalies.append(
                        {
                            "kpi_field": expected_key,
                            "actual": actual,
                            "expected": expected_value,
                            "pct_change": pct_change,
                            "method": "reconciliation",
                        }
                    )
            comparisons.append(
                {
                    "kpi_field": expected_key,
                    "actual": actual,
                    "expected": expected_value,
                    "delta": delta,
                }
            )
        return (
            {
                "grain_key": self._grain_key_from_dimensions(record.path, dimensions if isinstance(dimensions, dict) else {}),
                "dimension_json": dimensions if isinstance(dimensions, dict) else {},
                "kpi_json": actual_kpis,
                "comparisons": comparisons,
                "anomalies": anomalies,
            },
            selected_payload,
        )

    def _build_python_observation_result(
        self,
        record: EndpointRecord,
        request_json: str,
        item: Any,
    ) -> dict[str, Any]:
        request_payload: dict[str, Any] = {}
        try:
            decoded = json.loads(request_json) if request_json else {}
            if isinstance(decoded, dict):
                request_payload = decoded
        except Exception:
            request_payload = {}

        flattened = self._flatten_item(item)
        dimensions: dict[str, Any] = {}
        path_dims = request_payload.get("path", {})
        if isinstance(path_dims, dict):
            for key, value in path_dims.items():
                if value not in (None, ""):
                    dimensions[str(key)] = value
        query_dims = request_payload.get("query", {})
        body_dims = request_payload.get("body", {})
        if isinstance(query_dims, dict) and record.dimension_fields:
            for key, value in query_dims.items():
                if str(key) in dimensions:
                    continue
                if str(key) in record.dimension_fields and value not in (None, ""):
                    dimensions[str(key)] = value
        if isinstance(body_dims, dict) and record.dimension_fields:
            for key, value in body_dims.items():
                if str(key) in dimensions:
                    continue
                if str(key) in record.dimension_fields and value not in (None, ""):
                    dimensions[str(key)] = value
        if not record.dimension_fields:
            for source in (query_dims, body_dims):
                if not isinstance(source, dict):
                    continue
                for key, value in source.items():
                    if len(dimensions) >= 8:
                        break
                    if str(key) in dimensions:
                        continue
                    if value in (None, "", [], {}):
                        continue
                    if isinstance(value, (str, int, float, bool)):
                        dimensions[str(key)] = value
        for field in record.dimension_fields:
            value = self._lookup_analysis_actual_value(flattened, str(field))
            if value is not None:
                dimensions[str(field)] = value

        kpi_json: dict[str, Any] = {}
        if record.kpi_fields:
            for field in record.kpi_fields:
                value = self._lookup_analysis_actual_value(flattened, str(field))
                if value is not None:
                    kpi_json[str(field)] = value
        else:
            for key, value in flattened.items():
                if len(kpi_json) >= 20:
                    break
                leaf = str(key).replace("[]", "").split(".")[-1]
                if leaf in TECHNICAL_METADATA_FIELDS:
                    continue
                number = self._coerce_number(value)
                if number is None:
                    continue
                kpi_json[str(key)] = number

        return {
            "grain_key": self._grain_key_from_dimensions(record.path, dimensions),
            "dimension_json": dimensions,
            "kpi_json": kpi_json,
            "comparisons": [],
            "anomalies": [],
        }

    def _normalize_native_reconciliation_result(self, result: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(result, dict):
            return result

        comparisons_raw = result.get("comparisons")
        comparisons: list[dict[str, Any]] = []
        expected_by_kpi: dict[str, Any] = {}
        if isinstance(comparisons_raw, list):
            for entry in comparisons_raw:
                if not isinstance(entry, dict):
                    continue
                normalized = dict(entry)
                kpi_field = str(normalized.get("kpi_field") or "")
                if kpi_field:
                    expected = normalized.get("expected")
                    if expected is not None:
                        expected_by_kpi[kpi_field] = expected
                comparisons.append(normalized)

        anomalies_raw = result.get("anomalies")
        anomalies: list[dict[str, Any]] = []
        if isinstance(anomalies_raw, list):
            for entry in anomalies_raw:
                if not isinstance(entry, dict):
                    continue
                normalized = dict(entry)
                method = str(normalized.get("method") or "").strip().lower()
                kpi_field = str(normalized.get("kpi_field") or "")
                if method in {"reconciliation", "reference"}:
                    normalized["method"] = "reconciliation"
                    anomalies.append(normalized)
                    continue
                if not kpi_field or kpi_field not in expected_by_kpi:
                    # Drop threshold/statistical-only detections when no uploaded reference exists.
                    continue
                normalized["method"] = "reconciliation"
                normalized.setdefault("expected", expected_by_kpi[kpi_field])
                anomalies.append(normalized)

        anomalies_by_kpi = {
            str(item.get("kpi_field")): item
            for item in anomalies
            if isinstance(item, dict) and item.get("kpi_field") is not None
        }
        for comparison in comparisons:
            kpi_field = str(comparison.get("kpi_field") or "")
            actual = comparison.get("actual")
            expected = comparison.get("expected")
            mismatch = anomalies_by_kpi.get(kpi_field)
            pct_change = self._comparison_pct_change(
                actual,
                expected,
                mismatch.get("pct_change") if isinstance(mismatch, dict) else None,
            )
            status = str(comparison.get("reconciliation_status") or "").strip().lower()
            if status not in {"match", "mismatch", "missing_reference", "missing_kpi"}:
                if expected is None:
                    status = "missing_reference"
                elif mismatch is not None:
                    status = "mismatch"
                else:
                    status = "match"
            tolerance_pct = self._coerce_number(comparison.get("tolerance_pct"))
            comparison["reconciliation_status"] = status
            comparison.setdefault("delta_pct", pct_change)
            comparison.setdefault("tolerance_pct", tolerance_pct)
            comparison.setdefault(
                "reason",
                self._comparison_reason(
                    kpi_field,
                    actual,
                    expected,
                    status,
                    pct_change,
                    tolerance_pct,
                ),
            )

        if "reconciliation" not in result:
            total = len(comparisons)
            mismatched = sum(
                1 for item in comparisons if str(item.get("reconciliation_status")) == "mismatch"
            )
            missing_reference = sum(
                1
                for item in comparisons
                if str(item.get("reconciliation_status")) == "missing_reference"
            )
            matched = max(total - mismatched - missing_reference, 0)
            result["reconciliation"] = {
                "total_checks": total,
                "matched": matched,
                "mismatched": mismatched,
                "missing_reference": missing_reference,
            }

        result["comparisons"] = comparisons
        result["anomalies"] = anomalies
        return result

    def _prepare_reference_invocation(self, record: EndpointRecord, row: dict[str, Any]) -> dict[str, Any]:
        defaults = (record.watch_config or {}).get("default_params", {}) or {}
        dimensions = row.get("dimensions", {}) if isinstance(row, dict) else {}

        path_params = dict(defaults.get("path_params", {}) or {})
        query_params = dict(defaults.get("query_params", {}) or {})
        headers = dict(defaults.get("headers", {}) or {})
        body_seed = defaults.get("body", {})
        body = dict(body_seed) if isinstance(body_seed, dict) else body_seed
        method = record.method.upper()
        callable_params = set(inspect.signature(record.endpoint_callable).parameters)

        # 1. Precise placement using discovered request grains
        handled_keys: set[str] = set()
        for rf in record.request_fields:
            name = rf["name"]
            source = rf.get("source")
            val = dimensions.get(name)
            if val is None or val == "":
                continue
                
            if source == "path":
                path_params[name] = val
                handled_keys.add(name)
            elif source == "query":
                query_params[name] = val
                handled_keys.add(name)
            elif source == "body":
                if isinstance(body, dict):
                    # For nested body fields, we search for the top-level key
                    # currently simple flat injection for MVP
                    body[name] = val
                    handled_keys.add(name)

        # 2. Heuristic fallback for any remaining dimensions (Legacy Support)
        for key, value in dimensions.items():
            if key in handled_keys or value in (None, ""):
                continue
            if key in path_params or key in query_params:
                continue
            if key in {"api_version"}:
                continue
            if ".date" in key:
                if method in {"POST", "PUT", "PATCH"} and isinstance(body, dict):
                    body["dates"] = [value]
                else:
                    query_params.setdefault("dates", [value])
                continue
            if "[]" in key or "." in key:
                continue
            
            # Brute force path param matching for MVP coverage of unmapped dynamic paths
            if f"{{{key}}}" in record.path:
                path_params[key] = value
                continue

            if key in callable_params:
                query_params[key] = value
                continue
            if method in {"POST", "PUT", "PATCH"} and isinstance(body, dict):
                body.setdefault(key, value)
                continue
            query_params[key] = value

        return {
            "path_params": path_params,
            "query_params": query_params,
            "headers": headers,
            "body": body,
        }

    def _derive_default_params_from_reference(self, record: EndpointRecord) -> dict[str, Any]:
        try:
            conn, lock = self._get_connection()
        except Exception:
            return {}
        if conn is None:
            return {}
        try:
            with lock:
                row = conn.execute(
                    """
                    SELECT grain_key
                    FROM jin_reference
                    WHERE endpoint_path = ?
                    ORDER BY uploaded_at DESC, id DESC
                    LIMIT 1
                    """,
                    [record.path],
                ).fetchone()
        except Exception:
            return {}
        if not row or not row[0]:
            return {}
        dimensions = self._dimensions_from_grain_key(record.path, str(row[0]))
        if not isinstance(dimensions, dict) or not dimensions:
            return {}
        invocation = self._prepare_reference_invocation(record, {"dimensions": dimensions})
        if not isinstance(invocation, dict):
            return {}
        has_content = any(
            bool(invocation.get(key))
            for key in ("path_params", "query_params", "body", "headers")
        )
        return invocation if has_content else {}

    def _extract_array_items_for_result(self, record: EndpointRecord, data: Any) -> tuple[list[Any] | None, list[Any] | None]:
        if isinstance(data, list):  # pragma: no cover
            if record.array_field_path:
                prefix = f"{record.array_field_path}[]."
                prefixed = [{f"{prefix}{k}": v for k, v in item.items()} if isinstance(item, dict) else item for item in data]
                return data, prefixed
            return data, data

        if not record.array_field_path or not isinstance(data, dict):
            return None, None

        curr: Any = data
        for part in record.array_field_path.split("."):
            if isinstance(curr, dict) and part in curr:
                curr = curr[part]
            else:
                curr = None
                break
        if not isinstance(curr, list):
            return None, None

        prefix = f"{record.array_field_path}[]."
        prefixed = [{f"{prefix}{k}": v for k, v in item.items()} if isinstance(item, dict) else item for item in curr]
        return curr, prefixed

    @staticmethod
    def _select_array_result_for_row(results: list[dict[str, Any]], row: dict[str, Any]) -> dict[str, Any] | None:
        if not results:
            return None
        row_dims = row.get("dimensions", {}) if isinstance(row, dict) else {}
        if not isinstance(row_dims, dict) or not row_dims:
            return results[0]

        def score(result: dict[str, Any]) -> int:
            dims = result.get("dimension_json")
            if not isinstance(dims, dict):
                return 0
            points = 0
            for key, value in row_dims.items():
                if key not in dims:
                    continue
                if str(dims.get(key)) == str(value):
                    points += 1
            return points

        return max(results, key=score)

    async def _invoke_endpoint_callable(
        self,
        record: EndpointRecord,
        invocation: dict[str, Any],
    ) -> tuple[Any, str]:
        sig = inspect.signature(record.endpoint_callable)
        path_params = dict(invocation.get("path_params", {}) or {})
        query_params = dict(invocation.get("query_params", {}) or {})
        headers = dict(invocation.get("headers", {}) or {})
        api_version = headers.get("api_version") or headers.get("x-api-version") or headers.get("X-API-Version")
        if api_version in (None, ""):
            api_version = getattr(self.app, "version", None) or "1.0.0"
        headers["api_version"] = str(api_version)
        body = invocation.get("body", {})
        kwargs: dict[str, Any] = {}

        for key, value in path_params.items():
            if key in sig.parameters:
                kwargs[key] = value
        for key, value in query_params.items():
            if key in sig.parameters and key not in kwargs:
                kwargs[key] = value

        if body not in (None, {}, []):
            body_param_name = None
            for param in sig.parameters.values():
                if param.name not in kwargs and param.name != "request":
                    body_param_name = param.name
                    break
            if body_param_name:
                try:
                    resolved_hints = get_type_hints(record.endpoint_callable)
                except Exception:
                    resolved_hints = {}
                param_type = resolved_hints.get(body_param_name, sig.parameters[body_param_name].annotation)
                if hasattr(param_type, "model_validate") and isinstance(body, dict):
                    kwargs[body_param_name] = param_type.model_validate(body)
                else:
                    kwargs[body_param_name] = body

        response = record.endpoint_callable(**kwargs)
        if hasattr(response, "__await__"):
            response = await response
        data = response.model_dump() if hasattr(response, "model_dump") else response
        request_json = json.dumps(
            {
                "path": path_params,
                "query": query_params,
                "body": body if body not in (None,) else {},
                "headers": headers,
            }
        )
        return data, request_json

    async def run_upload_analysis(
        self,
        endpoint_path: str,
        normalized_rows: list[dict[str, Any]],
        max_runs: int = 25,
    ) -> dict[str, Any]:
        record = self.endpoint_registry.get(endpoint_path)
        if record is None:
            return {
                "status": "skipped",
                "requested_grains": len(normalized_rows),
                "attempted_runs": 0,
                "successful_runs": 0,
                "failed_runs": 0,
                "anomalies_detected": 0,
                "errors": [{"error": "endpoint_not_registered"}],
            }
        if not normalized_rows:
            return {
                "status": "skipped",
                "requested_grains": 0,
                "attempted_runs": 0,
                "successful_runs": 0,
                "failed_runs": 0,
                "anomalies_detected": 0,
                "errors": [],
            }

        attempted_runs = 0
        successful_runs = 0
        failed_runs = 0
        anomalies_detected = 0
        matched_runs = 0
        mismatch_runs = 0
        errors: list[dict[str, Any]] = []
        runs: list[dict[str, Any]] = []
        config_json = self._build_endpoint_config(record)
        safe_upload_analysis = os.getenv("JIN_UPLOAD_ANALYSIS_SAFE_MODE", "true").strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

        for row in normalized_rows[:max_runs]:
            attempted_runs += 1
            invocation = self._prepare_reference_invocation(record, row)
            try:
                data, request_json = await self._invoke_endpoint_callable(record, invocation)
                if safe_upload_analysis:
                    synthetic_result, selected_payload = self._build_safe_upload_analysis_result(record, row, data)
                    successful_runs += 1
                    anomalies_detected += len(synthetic_result.get("anomalies", []))
                    self._mirror_python_state(record, synthetic_result, selected_payload)
                    run_summary = self._analysis_run_from_result(record, row, invocation, synthetic_result)
                    runs.append(run_summary)
                    if run_summary["status"] == "match":
                        matched_runs += 1
                    else:
                        mismatch_runs += 1
                else:
                    array_items, prefixed_items = self._extract_array_items_for_result(record, data)
                    if array_items is not None and prefixed_items is not None:
                        results = self._run_native_process_observations(
                            record.path,
                            record.method,
                            request_json,
                            json.dumps(prefixed_items),
                            config_json,
                        )
                        successful_runs += 1
                        anomalies_detected += sum(len(result.get("anomalies", [])) for result in results)
                        for item, result in zip(array_items, results):
                            self._mirror_python_state(record, result, item)
                        selected = self._select_array_result_for_row(results, row)
                        if selected is not None:
                            run_summary = self._analysis_run_from_result(record, row, invocation, selected)
                            runs.append(run_summary)
                            if run_summary["status"] == "match":
                                matched_runs += 1
                            else:
                                mismatch_runs += 1
                    else:
                        result = self._record_processed_item(
                            record,
                            record.path,
                            record.method,
                            request_json,
                            data,
                            config_json,
                        )
                        successful_runs += 1
                        anomalies_detected += len(result.get("anomalies", []))
                        run_summary = self._analysis_run_from_result(record, row, invocation, result)
                        runs.append(run_summary)
                        if run_summary["status"] == "match":
                            matched_runs += 1
                        else:
                            mismatch_runs += 1
            except Exception as exc:
                failed_runs += 1
                self._record_error(
                    "upload.analysis",
                    "Reference upload analysis run failed.",
                    hint="Check endpoint default params and grain values in the uploaded reference rows.",
                    endpoint_path=record.path,
                    detail=str(exc),
                    level="warning",
                )
                if len(errors) < 5:
                    errors.append(
                        {
                            "grain": row.get("dimensions", {}),
                            "error": str(exc),
                        }
                    )
                runs.append(self._analysis_run_from_error(record, row, invocation, exc))

        if successful_runs and not failed_runs:
            status = "success"
        elif successful_runs and failed_runs:
            status = "partial"
        elif failed_runs:
            status = "failed"
        else:
            status = "skipped"

        if failed_runs and not successful_runs:
            verdict = "error"
        elif mismatch_runs:
            verdict = "mismatch"
        elif matched_runs:
            verdict = "matched"
        else:
            verdict = "skipped"

        if verdict == "matched":
            summary_message = f"Analysis complete: all {matched_runs} uploaded grain(s) matched the API response."
        elif verdict == "mismatch":
            summary_message = (
                f"Analysis complete: {mismatch_runs} grain(s) had mismatches and {matched_runs} grain(s) matched."
            )
        elif verdict == "error":
            summary_message = "Analysis could not be completed for the uploaded grains."
        else:
            summary_message = "No upload analysis was run."

        analysis_payload = {
            "status": status,
            "verdict": verdict,
            "requested_grains": len(normalized_rows),
            "attempted_runs": attempted_runs,
            "successful_runs": successful_runs,
            "failed_runs": failed_runs,
            "matched_runs": matched_runs,
            "mismatch_runs": mismatch_runs,
            "anomalies_detected": anomalies_detected,
            "summary_message": summary_message,
            "analyzed_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "),
            "runs": runs,
            "errors": errors,
        }

        endpoint_state = self._runtime_endpoint_state(record.path)
        endpoint_state["last_upload_analysis"] = analysis_payload
        history = endpoint_state.setdefault("upload_analysis_history", [])
        history.insert(0, analysis_payload)
        if len(history) > 20:
            del history[20:]
        self._persist_upload_analysis(record.path, analysis_payload)

        return analysis_payload

    async def run_watch_check(
        self,
        endpoint_path: str,
        *,
        trigger: str = "manual",
        source: str = "watch",
        default_params_override: dict[str, Any] | None = None,
        baseline_mode_override: str | None = None,
        scheduled_job_id: str | None = None,
    ) -> dict[str, Any]:
        record = self.endpoint_registry.get(endpoint_path)
        if record is None:
            raise KeyError(endpoint_path)

        watch_config = self._normalized_watch_config(record.watch_config or {})
        default_params = default_params_override if default_params_override is not None else watch_config.get("default_params", {})
        if not isinstance(default_params, dict) or not default_params:
            inferred_params = self._derive_default_params_from_reference(record)
            if not inferred_params:
                raise ValueError("Watch default params are required before running a check.")
            default_params = inferred_params
            if default_params_override is None:
                watch_config = self._normalized_watch_config(
                    {**watch_config, "default_params": default_params}
                )
                self._save_watch_override(record.path, watch_config)
                record.watch_config = watch_config
                self._register_scheduler_job_for_record(record, replace=True)
        baseline_mode = str(
            baseline_mode_override
            if baseline_mode_override is not None
            else watch_config.get("baseline_mode") or "fixed"
        ).lower()
        job_id = scheduled_job_id or f"jin:{endpoint_path}"
        run_payload = self._record_check_run_start(
            endpoint_path,
            job_id=job_id,
            trigger=trigger,
            source=source,
        )
        status = "success"
        error_detail: str | None = None
        grains_processed = 0
        anomalies_detected = 0
        try:
            if baseline_mode == "refresh_before_run" and promote_baseline is not None:
                try:
                    promote_baseline(self.db_path, record.path)
                except Exception as baseline_exc:
                    self._record_error(
                        "scheduler.baseline",
                        "Scheduled baseline refresh failed; continuing with existing baseline.",
                        hint="Check rollup history availability and baseline promotion compatibility.",
                        endpoint_path=record.path,
                        detail=str(baseline_exc),
                        level="warning",
                    )
            invocation = {
                "path_params": default_params.get("path_params", {}),
                "query_params": default_params.get("query_params", {}),
                "body": default_params.get("body", {}),
                "headers": default_params.get("headers", {}),
            }
            data, request_json = await self._invoke_endpoint_callable(record, invocation)
            config_json = self._build_endpoint_config(record)
            try:
                if isinstance(data, list):  # pragma: no cover
                    results = self._run_native_process_observations(
                        record.path,
                        record.method,
                        request_json,
                        json.dumps(data),
                        config_json,
                    )
                    grains_processed = len(results)
                    for item, result in zip(data, results):
                        anomalies_detected += len(result.get("anomalies", []))
                        self._mirror_python_state(record, result, item)
                        for anomaly in result.get("anomalies", []):
                            self.logger.warning(
                                "anomaly detected: %s %s %s%%",
                                result["grain_key"],
                                anomaly["kpi_field"],
                                anomaly["pct_change"],
                            )
                else:
                    result = self._record_processed_item(
                        record,
                        record.path,
                        record.method,
                        request_json,
                        data,
                        config_json,
                    )
                    grains_processed = 1
                    anomalies_detected = len(result.get("anomalies", []))
            except Exception as processing_exc:
                self._record_error(
                    "scheduler.run",
                    "Scheduled watch run failed." if trigger == "scheduler" else "Manual watch check failed.",
                    hint="Check watch default params and endpoint callable inputs for this API.",
                    endpoint_path=record.path,
                    detail=str(processing_exc),
                    level="warning",
                )
                dimensions = dict(default_params.get("path_params", {}) or {})
                fallback_item = data[0] if isinstance(data, list) and data else data
                fallback_result = {
                    "grain_key": self._grain_key_from_dimensions(record.path, dimensions),
                    "dimension_json": dimensions,
                    "kpi_json": self._flatten_item(fallback_item) if fallback_item is not None else {},
                    "comparisons": [],
                    "anomalies": [],
                }
                if isinstance(data, list):
                    grains_processed = len(data)
                    for item in data:
                        self._mirror_python_state(record, fallback_result, item)
                else:
                    grains_processed = 1
                    self._mirror_python_state(record, fallback_result, fallback_item)
            return {
                "ok": True,
                "endpoint_path": record.path,
                "trigger": trigger,
                "run_id": run_payload.get("run_id"),
                "status": "success",
                "grains_processed": grains_processed,
                "anomalies_detected": anomalies_detected,
            }
        except Exception as exc:
            status = "error"
            error_detail = str(exc)
            self._record_error(
                "scheduler.run",
                "Scheduled watch run failed." if trigger == "scheduler" else "Manual watch check failed.",
                hint="Check watch default params and endpoint callable inputs for this API.",
                endpoint_path=record.path,
                detail=error_detail,
            )
            raise
        finally:
            self._record_check_run_finish(
                str(run_payload.get("run_id") or ""),
                status=status,
                started_at=run_payload.get("started_at"),
                grains_processed=grains_processed,
                anomalies_detected=anomalies_detected,
                error=error_detail,
            )

    def upsert_watch_config(self, endpoint_path: str, payload: dict[str, Any]) -> dict[str, Any]:
        record = self.endpoint_registry.get(endpoint_path)
        if record is None:
            raise KeyError(endpoint_path)

        current = self._normalized_watch_config(record.watch_config or {})
        merged = {
            **current,
            **payload,
            "default_params": payload.get("default_params", current.get("default_params", {})),
        }
        normalized = self._normalized_watch_config(merged)
        schedule = normalized.get("schedule")
        if schedule and not self.scheduler.is_supported_schedule(str(schedule)):
            raise ValueError(
                "Unsupported schedule format. Use 'every Nh', 'daily HH:MM', or 'weekly mon[,tue] HH:MM'."
            )
        self._save_watch_override(endpoint_path, normalized)
        record.watch_config = normalized
        self._register_scheduler_job_for_record(record, replace=True)
        return normalized

    def _register_scheduler_job_for_record(self, record: EndpointRecord, replace: bool = False) -> None:
        watch_config = self._normalized_watch_config(record.watch_config or {})
        schedule = watch_config.get("schedule")
        job_id = f"jin:{record.path}"
        if replace:
            self.scheduler.remove(job_id)
        if not schedule:
            return
        if not self.scheduler.is_supported_schedule(str(schedule)):
            self.scheduler.record_skipped(job_id, str(schedule), "unsupported_schedule")
            return
        default_params = watch_config.get("default_params", {})
        if not default_params:
            self.scheduler.record_skipped(job_id, str(schedule), "missing_default_params")
            return
        baseline_mode = str(watch_config.get("baseline_mode") or "fixed").lower()

        async def job(
            record: EndpointRecord = record,
            default_params: dict[str, Any] = default_params,
            scheduled_job_id: str = job_id,
            baseline_mode: str = baseline_mode,
        ) -> None:
            with self._scheduler_job_lock(scheduled_job_id) as lock_acquired:
                if not lock_acquired:
                    self.logger.debug(
                        "Skipping watch run for %s because another worker is active.",
                        scheduled_job_id,
                    )
                    return
                await self.run_watch_check(
                    record.path,
                    trigger=self.scheduler.current_trigger(),
                    source="watch",
                    default_params_override=default_params,
                    baseline_mode_override=baseline_mode,
                    scheduled_job_id=scheduled_job_id,
                )

        self.scheduler.register(job_id, str(schedule), job)

    def _register_project_bundle_job(self, project_id: str | None = None, replace: bool = False) -> None:
        current_id = self._project_catalog_id(self.project_name, self.project_root, self.db_path)
        target_project_id = project_id or current_id
        job_id = f"jin:bundle:{target_project_id}"
        if replace:
            self.scheduler.remove(job_id)
        try:
            policy = self.project_monitor_policy(target_project_id)
        except ValueError:
            return
        bundle_enabled = bool(policy.get("bundle_enabled"))
        bundle_schedule = policy.get("bundle_schedule")
        if not bundle_enabled or not bundle_schedule:
            self.scheduler.remove(job_id)
            return
        if not self.scheduler.is_supported_schedule(str(bundle_schedule)):
            self.scheduler.record_skipped(job_id, str(bundle_schedule), "unsupported_schedule")
            return
        endpoint_rows = policy.get("bundle_endpoint_paths")
        endpoint_paths = endpoint_rows if isinstance(endpoint_rows, list) else None

        async def job(
            project_id: str = target_project_id,
            endpoint_paths: list[str] | None = endpoint_paths,
        ) -> None:
            try:
                await self.run_project_bundle(project_id, endpoint_paths=endpoint_paths, trigger="scheduler")
            except Exception as exc:
                self._record_error(
                    "scheduler.bundle",
                    "Scheduled bundle run failed.",
                    hint="Check project monitor policy and watched endpoint defaults for this project.",
                    detail=str(exc),
                    level="warning",
                )
                raise

        self.scheduler.register(job_id, str(bundle_schedule), job)

    def _register_scheduler_jobs(self) -> None:
        for record in self.endpoint_registry.values():
            self._register_scheduler_job_for_record(record, replace=False)
        self._register_project_bundle_job(replace=False)

    def scheduler_snapshot(self) -> list[dict[str, object]]:
        jobs = []
        for item in self.scheduler.job_status():
            raw_job_id = item.get("job_id")
            job_id = str(raw_job_id) if isinstance(raw_job_id, str) else ""
            is_bundle_job = job_id.startswith("jin:bundle:")
            endpoint_path = job_id.removeprefix("jin:") if job_id.startswith("jin:") and not is_bundle_job else None
            record = self.endpoint_registry.get(endpoint_path or "")
            bundle_policy: dict[str, Any] = {}
            if is_bundle_job:
                project_id = job_id.removeprefix("jin:bundle:")
                try:
                    bundle_policy = self.project_monitor_policy(project_id)
                except Exception:
                    bundle_policy = {}
            jobs.append(
                {
                    **item,
                    "endpoint_path": endpoint_path,
                    "job_type": "bundle" if is_bundle_job else "watch",
                    "http_method": record.method if record else None,
                    "schedule": (
                        (record.watch_config or {}).get("schedule")
                        if record
                        else bundle_policy.get("bundle_schedule")
                    ),
                    "default_params": (record.watch_config or {}).get("default_params", {}) if record else {},
                    "watch_threshold": (record.watch_config or {}).get("threshold") if record else None,
                    "baseline_mode": (
                        (record.watch_config or {}).get("baseline_mode", "fixed")
                        if record
                        else str(bundle_policy.get("baseline_mode") or "fixed")
                    ),
                    "project_id": job_id.removeprefix("jin:bundle:") if is_bundle_job else None,
                    "skip_reason": item.get("skip_reason"),
                    "paused_reason": item.get("paused_reason"),
                    "last_duration_ms": item.get("last_duration_ms"),
                    "consecutive_successes": item.get("consecutive_successes"),
                    "recent_runs": item.get("recent_runs", []),
                }
            )
        return jobs



    def _mirror_python_state(self, record: EndpointRecord, result: dict[str, Any], item: Any) -> None:
        grain_key = result["grain_key"]
        dims = result.get("dimension_json")
        if not isinstance(dims, dict):
            dims = self._dimensions_from_grain_key(record.path, grain_key)
        raw_kpi_json = result.get("kpi_json")
        if isinstance(raw_kpi_json, dict):
            kpi_values = dict(raw_kpi_json)
        else:
            flattened = self._flatten_item(item)
            kpi_values = {field: flattened[field] for field in record.kpi_fields if field in flattened}
        observed_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
        state = self._runtime_endpoint_state(record.path)
        state["grains"].add(grain_key)
        history_entry = {
            "grain_key": grain_key,
            "dimension_json": dims,
            "kpi_json": kpi_values,
            "comparisons": result.get("comparisons", []),
            "observed_at": observed_at,
        }
        state["history"].insert(0, history_entry)
        if len(state["history"]) > self.runtime_history_limit:
            del state["history"][self.runtime_history_limit :]
        state["recent_history"].insert(
            0,
            {"grain_key": grain_key, "kpi_json": kpi_values, "observed_at": observed_at},
        )
        state["recent_history"] = state["recent_history"][:50]
        state["last_checked"] = observed_at

        for anomaly in result.get("anomalies", []):
            existing = next(
                (
                    item
                    for item in state["anomalies"]
                    if item["grain_key"] == grain_key
                    and item["kpi_field"] == anomaly["kpi_field"]
                    and item["detection_method"] == anomaly["method"]
                    and item["is_active"]
                ),
                None,
            )
            if existing is None:
                state["anomalies"].insert(
                    0,
                    {
                        "id": self._next_runtime_anomaly_id,
                        "endpoint_path": record.path,
                        "grain_key": grain_key,
                        "kpi_field": anomaly["kpi_field"],
                        "actual_value": anomaly["actual"],
                        "expected_value": anomaly["expected"],
                        "pct_change": anomaly["pct_change"],
                        "detection_method": anomaly["method"],
                        "is_active": True,
                    },
                )
                self._next_runtime_anomaly_id += 1
            else:
                existing["actual_value"] = anomaly["actual"]
                existing["expected_value"] = anomaly["expected"]
                existing["pct_change"] = anomaly["pct_change"]
                existing["is_active"] = True
        if len(state["anomalies"]) > self.runtime_anomaly_limit:
            del state["anomalies"][self.runtime_anomaly_limit :]

    @staticmethod
    def _flatten_item(item: Any, prefix: str = "") -> dict[str, Any]:
        if isinstance(item, BaseModel):
            item = item.model_dump()
        result: dict[str, Any] = {}
        if isinstance(item, dict):
            for key, value in item.items():
                next_prefix = f"{prefix}.{key}" if prefix else key
                result.update(JinMiddleware._flatten_item(value, next_prefix))
            return result
        if isinstance(item, list):
            for index, value in enumerate(item):
                next_prefix = f"{prefix}.{index}" if prefix else str(index)
                result.update(JinMiddleware._flatten_item(value, next_prefix))
            return result
        if prefix:
            result[prefix] = item
        return result

    @staticmethod
    def _dimensions_from_grain_key(endpoint_path: str, grain_key: str) -> dict[str, str]:
        if grain_key == endpoint_path or "|" not in grain_key:
            return {}
        _, *parts = grain_key.split("|")
        dims = {}
        for part in parts:
            if "=" not in part:
                continue
            key, value = part.split("=", 1)
            dims[key] = value
        return dims

    def _build_request_json(self, request: Request, body: bytes) -> str:
        headers = {key: value for key, value in request.headers.items() if key.lower().startswith("x-")}
        headers["api_version"] = request.headers.get("x-api-version", getattr(request.app, "version", "1.0.0"))
        if request.method == "GET":
            payload = {
                "path": request.path_params,
                "query": dict(request.query_params),
                "body": {},
                "headers": headers,
            }
        else:
            try:
                body_dict = json.loads(body) if body else {}
            except Exception:
                body_dict = {}
            payload = {
                "path": request.path_params,
                "query": {},
                "body": body_dict,
                "headers": headers,
            }
        return json.dumps(payload)
