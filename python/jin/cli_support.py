from __future__ import annotations

import argparse
import csv
import importlib
import inspect
import json
import shutil
import shlex
import os
import re
import subprocess
import sys
import tempfile
import time
import webbrowser
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.routing import APIRoute

from jin.auth_utils import generate_auth_lines
from jin.config import EndpointModelInfo, build_schema_contract, classify_model
from jin.middleware import JinMiddleware
from jin.templates import generate_csv_template, generate_xlsx_template
from jin.uploader import parse_csv_upload, parse_xlsx_upload, validate_upload_rows
try:
    from jin_core import (  # type: ignore
        auth_status as native_auth_status,
        config_show as native_config_show,
        doctor_core as native_doctor_core,
        endpoints_list as native_endpoints_list,
        env_check as native_env_check,
        get_endpoint_detail as native_get_endpoint_detail,
        init_db as native_init_db,
        import_reference_rows as native_import_reference_rows,
        issues_list as native_issues_list,
        issues_update as native_issues_update,
        local_urls as native_local_urls,
        project_status as native_project_status,
        references_export as native_references_export,
        report_summary as native_report_summary,
        save_endpoint_config as native_save_endpoint_config,
        sync_registry as native_sync_registry,
        template_spec as native_template_spec,
        validate_reference_rows as native_validate_reference_rows,
        verify_core as native_verify_core,
    )
except ImportError:  # pragma: no cover
    native_auth_status = None
    native_config_show = None
    native_doctor_core = None
    native_endpoints_list = None
    native_env_check = None
    native_get_endpoint_detail = None
    native_init_db = None
    native_import_reference_rows = None
    native_issues_list = None
    native_issues_update = None
    native_local_urls = None
    native_project_status = None
    native_references_export = None
    native_report_summary = None
    native_save_endpoint_config = None
    native_sync_registry = None
    native_template_spec = None
    native_validate_reference_rows = None
    native_verify_core = None

def _env_truthy(name: str) -> bool:
    return str(os.getenv(name, "")).strip().lower() in {"1", "true", "yes", "on"}


if _env_truthy("JIN_DISABLE_NATIVE"):
    native_auth_status = None
    native_config_show = None
    native_doctor_core = None
    native_endpoints_list = None
    native_env_check = None
    native_get_endpoint_detail = None
    native_init_db = None
    native_import_reference_rows = None
    native_issues_list = None
    native_issues_update = None
    native_local_urls = None
    native_project_status = None
    native_references_export = None
    native_report_summary = None
    native_save_endpoint_config = None
    native_sync_registry = None
    native_template_spec = None
    native_validate_reference_rows = None
    native_verify_core = None

try:
    import duckdb
except ImportError:  # pragma: no cover
    duckdb = None

def load_local_env(env_file: str = ".env") -> dict[str, str | None]:
    env_path = Path(env_file)
    if not env_path.exists():
        return {}
    previous: dict[str, str | None] = {}
    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key in os.environ:
            continue
        previous[key] = None
        os.environ[key] = value.strip()
    return previous


def env_db_path(cli_value: str | None = None) -> str:
    return cli_value or os.getenv("JIN_DB_PATH", "./jin.duckdb")


def ensure_db_parent_dir(db_path: str) -> None:
    path = Path(db_path).expanduser()
    parent = path.parent
    if not str(parent) or str(parent) == ".":
        return
    try:
        parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        # Don't fail init on read-only or restricted filesystems.
        return


def env_project_name(cli_value: str | None = None) -> str:
    return cli_value or os.getenv("JIN_PROJECT_NAME", Path.cwd().name or "jin-project")


def ensure_project_root_cwd() -> None:
    """Fail fast when CLI is executed from a subdirectory.

    Jin stores project-local state (like `.env` and `./jin.duckdb`) relative to the
    current working directory. Running from a nested folder commonly leads to confusing
    setup drift (multiple `.jin` dirs, missing DB warnings, etc.).
    """
    cwd = Path.cwd().resolve()
    markers = (
        "pyproject.toml",
        "uv.lock",
        "poetry.lock",
        "requirements.txt",
        "setup.py",
        ".git",
    )
    if any((cwd / marker).exists() for marker in markers):
        return
    for parent in cwd.parents:
        if any((parent / marker).exists() for marker in markers):
            raise RuntimeError(
                "Run Jin from your project root.\n"
                f"Detected project markers at: {parent}\n"
                f"Current directory is: {cwd}\n"
                f"Fix: cd {parent} && jin init"
            )
    raise RuntimeError(
        "Run Jin from your project root.\n"
        f"Current directory is: {cwd}\n"
        "Fix: cd to the folder containing your `pyproject.toml` (or `.git`) and retry."
    )

def native_env_payload() -> str:
    keys = [
        "JIN_AUTH_ENABLED",
        "JIN_USERNAME",
        "JIN_PASSWORD",
        "JIN_PASSWORD_HASH",
        "JIN_SESSION_SECRET",
        "JIN_SESSION_TTL_MINUTES",
    ]
    return json.dumps({key: os.getenv(key, "") for key in keys})


def require_duckdb() -> None:
    if duckdb is None:  # pragma: no cover
        raise RuntimeError("duckdb is required for Jin CLI commands that touch the project database")


def require_native(name: str, value: Any) -> Any:
    if value is None:  # pragma: no cover
        raise RuntimeError(f"Native Jin command support is unavailable for '{name}'. Reinstall the Rust extension.")
    return value


def load_app(app_path: str) -> FastAPI:
    module_name, _, attr_name = app_path.partition(":")
    if not module_name or not attr_name:
        raise RuntimeError(
            "App path must look like 'package.module:app'. "
            "Example: --app myservice.main:app"
        )
    try:
        module = importlib.import_module(module_name)
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            f"Could not import module '{module_name}' from --app {app_path}. "
            "Make sure you run the command from your project root and use a valid import path, "
            "for example --app myservice.main:app."
        ) from exc
    except Exception as exc:
        raise RuntimeError(
            f"Failed while importing '{module_name}' from --app {app_path}: {exc}"
        ) from exc
    app = getattr(module, attr_name, None)
    if app is None:
        raise RuntimeError(
            f"Module '{module_name}' does not define '{attr_name}'. "
            f"Update --app to point at your FastAPI object, for example {module_name}:app."
        )
    if callable(app) and not isinstance(app, FastAPI):
        try:
            maybe_app = app()
        except TypeError as exc:
            raise RuntimeError(
                f"'{app_path}' points to a callable that needs arguments. "
                "Point --app at a FastAPI instance or a zero-argument app factory."
            ) from exc
        if isinstance(maybe_app, FastAPI):
            app = maybe_app
    if not isinstance(app, FastAPI):
        raise RuntimeError(
            f"'{app_path}' did not resolve to a FastAPI app. "
            "Point --app at the FastAPI instance or a zero-argument factory, for example package.module:app."
        )
    return app


def resolve_module_file(module_path: str) -> Path:
    if "/" in module_path or module_path.endswith(".py"):
        raise RuntimeError(
            f"Use dot notation for --app-file, not a filesystem path. "
            f"Example: --app-file app.main (received {module_path!r})."
        )
    parts = [part for part in module_path.split(".") if part]
    if not parts:
        raise RuntimeError("App module path is empty. Use dot notation like --app-file app.main.")
    file_candidate = Path.cwd().joinpath(*parts).with_suffix(".py")
    package_candidate = Path.cwd().joinpath(*parts, "__init__.py")
    if file_candidate.exists():
        return file_candidate
    if package_candidate.exists():
        return package_candidate
    raise RuntimeError(
        f"Could not find a FastAPI module for --app-file {module_path!r}. "
        f"Expected {file_candidate} or {package_candidate}. "
        "Run the command from your project root and use dot notation like app.main."
    )


def discover_module_path() -> str:
    candidates = [
        "app.main",
        "main",
        "src.main",
        "api.main",
        "backend.main",
    ]
    for candidate in candidates:
        try:
            resolve_module_file(candidate)
            return candidate
        except RuntimeError:
            continue
    raise RuntimeError(
        "Could not auto-discover your FastAPI module. "
        "Try: jin setup app.main or jin patch fastapi --app-file app.main"
    )


def load_module(module_name: str):
    try:
        return importlib.import_module(module_name)
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            f"Could not import module '{module_name}'. "
            "Make sure you run the command from your project root and use a valid import path."
        ) from exc


def detect_fastapi_binding(module_name: str) -> tuple[str, str]:
    module = load_module(module_name)
    common_names = ["app", "api", "application", "fastapi_app"]
    for name in common_names:
        value = getattr(module, name, None)
        if isinstance(value, FastAPI):
            return ("instance", name)
    factory_names = ["create_app", "build_app", "get_app"]
    for name in factory_names:
        value = getattr(module, name, None)
        if callable(value):
            try:
                built = value()
            except TypeError:
                continue
            if isinstance(built, FastAPI):
                return ("factory", name)
    raise RuntimeError(
        f"Could not find a FastAPI app or factory in module '{module_name}'. "
        "Tried common names like app, api, application, and create_app."
    )


def detect_fastapi_binding_in_source(content: str, preferred_name: str | None = None) -> tuple[str, str]:
    if preferred_name:
        if re.search(rf"^\s*{re.escape(preferred_name)}\s*=\s*FastAPI\(", content, flags=re.MULTILINE):
            return ("instance", preferred_name)
        if re.search(rf"^\s*return\s+{re.escape(preferred_name)}\s*$", content, flags=re.MULTILINE):
            return ("factory", preferred_name)
    for name in ["app", "api", "application", "fastapi_app"]:
        if re.search(rf"^\s*{re.escape(name)}\s*=\s*FastAPI\(", content, flags=re.MULTILINE):
            return ("instance", name)
    for factory_name in ["create_app", "build_app", "get_app"]:
        factory_match = re.search(
            rf"^\s*def\s+{re.escape(factory_name)}\s*\([^)]*\)\s*(?:->\s*[^:]+)?\s*:\n(?P<body>(?:^[ \t].*\n?)*)",
            content,
            flags=re.MULTILINE,
        )
        if not factory_match:
            continue
        body = factory_match.group("body")
        assign_match = re.search(r"^\s*(\w+)\s*=\s*FastAPI\(", body, flags=re.MULTILINE)
        return_match = re.search(r"^\s*return\s+(\w+)\s*$", body, flags=re.MULTILINE)
        if assign_match and return_match and assign_match.group(1) == return_match.group(1):
            return ("factory", assign_match.group(1))
    raise RuntimeError(
        "Could not find a FastAPI app or factory in the target file. "
        "Tried common names like app, api, application, and create_app."
    )


def detect_fastapi_entrypoint_in_source(content: str, preferred_name: str | None = None) -> tuple[str, str]:
    if preferred_name:
        if re.search(rf"^\s*{re.escape(preferred_name)}\s*=\s*FastAPI\(", content, flags=re.MULTILINE):
            return ("instance", preferred_name)
        if re.search(rf"^\s*def\s+{re.escape(preferred_name)}\s*\(", content, flags=re.MULTILINE):
            return ("factory", preferred_name)
    for name in ["app", "api", "application", "fastapi_app"]:
        if re.search(rf"^\s*{re.escape(name)}\s*=\s*FastAPI\(", content, flags=re.MULTILINE):
            return ("instance", name)
    for factory_name in ["create_app", "build_app", "get_app"]:
        if re.search(rf"^\s*def\s+{re.escape(factory_name)}\s*\(", content, flags=re.MULTILINE):
            return ("factory", factory_name)
    raise RuntimeError(
        "Could not find a FastAPI app entrypoint in the target file. "
        "Tried common names like app, api, application, and create_app."
    )


def ensure_schema(db_path: str) -> None:
    if native_init_db is not None:
        native_init_db(db_path)
        return
    require_duckdb()
    assert duckdb is not None
    conn = duckdb.connect(db_path)
    try:
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
            CREATE TABLE IF NOT EXISTS jin_observations (
              id BIGINT PRIMARY KEY,
              endpoint_path TEXT,
              grain_key TEXT,
              dimension_json TEXT,
              kpi_json TEXT,
              observed_at TIMESTAMP DEFAULT now(),
              source TEXT
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
        try:
            conn.execute("CHECKPOINT")
        except Exception:
            pass
    finally:
        conn.close()


def route_records(app: FastAPI) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if route.path.startswith("/jin"):
            continue
        response_model = JinMiddleware._resolve_response_model(route)
        fields, dims, kpis, array_field_path = classify_model(response_model)
        methods = sorted(route.methods or {"GET"})
        method = methods[0] if methods else "GET"
        records.append(
            {
                "endpoint_path": route.path,
                "http_method": method,
                "fields": fields,
                "dimension_fields": dims,
                "kpi_fields": kpis,
                "schema_contract": build_schema_contract(
                    EndpointModelInfo(
                        method=method,
                        path=route.path,
                        fields=fields,
                        dimension_fields=dims,
                        kpi_fields=kpis,
                        array_field_path=array_field_path,
                    )
                ),
                "watch_config": getattr(route.endpoint, "_jin_watch", {}),
                "endpoint_callable": route.endpoint,
            }
        )
    return records


def sync_app_to_db(app_path: str, db_path: str) -> list[dict[str, Any]]:
    app = load_app(app_path)
    ensure_schema(db_path)
    records = route_records(app)
    payload = [
        {
            "endpoint_path": record["endpoint_path"],
            "http_method": record["http_method"],
            "schema_contract": record["schema_contract"],
            "dimension_fields": record["dimension_fields"],
            "kpi_fields": record["kpi_fields"],
        }
        for record in records
    ]
    if native_sync_registry is not None:
        native_sync_registry(db_path, json.dumps(payload))
    else:
        require_duckdb()
        assert duckdb is not None
        conn = duckdb.connect(db_path)
        try:
            for record in records:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO jin_endpoints (
                      endpoint_path, http_method, pydantic_schema, dimension_fields, kpi_fields, config_source, created_at
                    ) VALUES (
                      ?,
                      COALESCE((SELECT http_method FROM jin_endpoints WHERE endpoint_path = ? LIMIT 1), ?),
                      ?,
                      ?,
                      ?,
                      COALESCE((SELECT config_source FROM jin_endpoints WHERE endpoint_path = ? LIMIT 1), 'auto'),
                      COALESCE((SELECT created_at FROM jin_endpoints WHERE endpoint_path = ? LIMIT 1), now())
                    )
                    """,
                    [
                        record["endpoint_path"],
                        record["endpoint_path"],
                        record["http_method"],
                        json.dumps(record["schema_contract"]),
                        json.dumps(record["dimension_fields"]),
                        json.dumps(record["kpi_fields"]),
                        record["endpoint_path"],
                        record["endpoint_path"],
                    ],
                )
            try:
                conn.execute("CHECKPOINT")
            except Exception:
                pass
        finally:
            conn.close()
    return records


def ensure_endpoint_seeded(db_path: str, app_path: str | None = None) -> None:
    if app_path:
        sync_app_to_db(app_path, db_path)
    else:
        ensure_schema(db_path)


def render_text_table(rows: list[list[str]]) -> str:
    if not rows:
        return ""
    widths = [max(len(str(row[index])) for row in rows) for index in range(len(rows[0]))]
    return "\n".join("  ".join(str(cell).ljust(widths[idx]) for idx, cell in enumerate(row)) for row in rows)


def print_json(data: Any) -> int:
    print(json.dumps(data, indent=2, sort_keys=False, default=str))
    return 0


def _supports_color() -> bool:
    return os.getenv("TERM") not in {None, "dumb"} and os.getenv("NO_COLOR") is None


def _style(text: str, code: str) -> str:
    if not _supports_color():
        return text
    return f"\033[{code}m{text}\033[0m"


def print_section(title: str) -> None:
    print(_style(title, "1;37"))


def print_success(message: str) -> None:
    print(f"{_style('OK', '1;32')} {message}")


def print_warning(message: str) -> None:
    print(f"{_style('WARN', '1;33')} {message}")


def prompt_value(message: str, default: str) -> str:
    raw = input(f"{message} [{default}]: ").strip()
    return raw or default


def prompt_yes_no(message: str, default: bool = True) -> bool:
    suffix = "Y/n" if default else "y/N"
    raw = input(f"{message} [{suffix}]: ").strip().lower()
    if not raw:
        return default
    return raw in {"y", "yes"}


def local_urls(host: str = "127.0.0.1", port: int = 8000, scheme: str = "http") -> dict[str, str]:
    base = f"{scheme}://{host}:{port}"
    return {
        "app_root": f"{base}/",
        "jin_console": f"{base}/jin",
        "jin_login": f"{base}/jin/login",
        "example_revenue": f"{base}/api/revenue/amazon/YTD",
        "example_inventory": f"{base}/api/inventory/amazon",
    }


def print_init_next_steps(app_path: str | None, db_path: str, auth_enabled: bool) -> None:
    print("")
    print("Next steps:")
    if app_path:
        print(f"  1. Run your app: uvicorn {app_path} --host 127.0.0.1 --port 8000")
        print("  2. Open: http://127.0.0.1:8000/jin")
    else:
        print("  1. Add JinMiddleware to your FastAPI app.")
        print("  2. Run your app and open: http://127.0.0.1:8000/jin")
    if auth_enabled:
        print("  3. Rotate login credentials with: jin auth rotate --write-env")
    print(f"  4. Check setup with: jin doctor --db-path {db_path}")


def print_serve_check(app_path: str) -> None:
    app = load_app(app_path)
    has_jin_middleware = any(getattr(middleware, "cls", None) is JinMiddleware for middleware in app.user_middleware)
    has_jin_routes = any(
        isinstance(route, APIRoute) and str(getattr(route, "path", "")).startswith("/jin")
        for route in app.routes
    )
    if has_jin_middleware or has_jin_routes:
        print("Serve check: ok")
        if has_jin_middleware:
            print("  - JinMiddleware is registered.")
        if has_jin_routes:
            print("  - /jin routes are already present.")
        print("  - Start the app and open /jin.")
        return
    print("Serve check: Jin is not mounted yet.")
    print("  - Add JinMiddleware to your FastAPI app.")
    print("  - Example: app.add_middleware(JinMiddleware, db_path='./jin.duckdb')")
    print("  - Then restart the app and open /jin.")


def _infer_app_import_for_check(explicit_app_path: str | None) -> tuple[str | None, str | None]:
    if explicit_app_path:
        return explicit_app_path, None
    try:
        module_path = discover_module_path()
        file_path = resolve_module_file(module_path)
        _, import_attr = detect_fastapi_entrypoint_in_source(file_path.read_text(), None)
        return f"{module_path}:{import_attr}", None
    except Exception as exc:
        return None, str(exc)


def command_init_check(args: argparse.Namespace) -> int:
    project_name = env_project_name(getattr(args, "project_name", None))
    db_path = env_db_path(getattr(args, "db_path", None))
    env_file = getattr(args, "env_file", ".env")
    env_data = env_check_data(env_file, db_path, project_name)
    auth = auth_status_data()

    app_import, app_detection_error = _infer_app_import_for_check(getattr(args, "app", None))
    app_load_error: str | None = None
    has_jin_middleware = False
    has_jin_routes = False
    discovery_summary: dict[str, int] = {
        "total": 0,
        "ready": 0,
        "partial": 0,
        "runtime_infer": 0,
    }
    discovery_examples: list[tuple[str, str, list[str]]] = []

    if app_import:
        try:
            app = load_app(app_import)
            has_jin_middleware = any(
                getattr(middleware, "cls", None) is JinMiddleware for middleware in app.user_middleware
            )
            has_jin_routes = any(
                isinstance(route, APIRoute) and str(getattr(route, "path", "")).startswith("/jin")
                for route in app.routes
            )
            for route in app.routes:
                if not isinstance(route, APIRoute):
                    continue
                if str(route.path).startswith("/jin"):
                    continue
                response_model = JinMiddleware._resolve_response_model(route)
                fields, dims, kpis, _array = classify_model(response_model)
                status, reasons = JinMiddleware._discovery_profile(
                    response_model=response_model,
                    fields=fields,
                    dimension_fields=dims,
                    kpi_fields=kpis,
                )
                discovery_summary["total"] += 1
                discovery_summary[status] = int(discovery_summary.get(status, 0)) + 1
                if status != "ready" and len(discovery_examples) < 5:
                    discovery_examples.append((route.path, status, reasons))
        except Exception as exc:
            app_load_error = str(exc)

    mounted = has_jin_middleware or has_jin_routes
    guidance: list[str] = []
    if app_import:
        guidance.append(f"App target: {app_import}")
    else:
        guidance.append("App target: not detected")
    if app_detection_error:
        guidance.append(
            "Could not auto-detect a FastAPI app in this folder. "
            "Run: jin init --check --app package.module:app"
        )
    if app_load_error:
        guidance.append(
            "The app import path could not be loaded. "
            f"Details: {app_load_error}"
        )
    if app_import and not app_load_error and not mounted:
        module_path = app_import.split(":", 1)[0]
        guidance.append(
            "Jin is not mounted yet. "
            f"Run: jin patch fastapi --app-file {module_path}"
        )
    if discovery_summary["total"] == 0:
        guidance.append(
            "No non-/jin API routes were discovered. "
            "Add at least one FastAPI route with a structured response model."
        )
    if discovery_summary["runtime_infer"] > 0:
        guidance.append(
            "Some routes will be inferred from runtime traffic. "
            "Adding FastAPI `response_model=...` improves discovery, but you can also configure mappings from samples."
        )
    if discovery_summary["partial"] > 0:
        guidance.append(
            "Some routes are partially inferred. "
            "Confirm dimensions/KPIs in the Jin UI or via `jin config set`."
        )
    if not bool(env_data.get("env_exists")):
        guidance.append(
            f"Create project env defaults with: jin init --write --env-file {env_file}"
        )
    if not bool(env_data.get("db_exists")):
        guidance.append(
            f"Initialize local DB schema with: jin doctor --fix --db-path {db_path}"
        )
    if auth.get("warnings"):
        guidance.append(
            "Auth settings are incomplete or unsafe. "
            "Run: jin auth rotate --write-env"
        )
    guidance.append(
        f"Re-check readiness with: jin doctor --deep --app {app_import or 'package.module:app'} --db-path {db_path}"
    )

    summary_rows = [
        ["check", "status"],
        ["project", project_name],
        ["env_file", "yes" if bool(env_data.get("env_exists")) else "no"],
        ["db_file", "yes" if bool(env_data.get("db_exists")) else "no"],
        ["auth_ready", "yes" if not auth.get("warnings") else "needs attention"],
        ["app_detected", "yes" if app_import else "no"],
        ["app_loadable", "yes" if app_import and not app_load_error else "no"],
        ["jin_mounted", "yes" if mounted else "no"],
        ["apis_total", str(discovery_summary["total"])],
        ["apis_ready", str(discovery_summary["ready"])],
        ["apis_partial", str(discovery_summary["partial"])],
        ["apis_runtime_infer", str(discovery_summary["runtime_infer"])],
    ]
    print("Jin init check")
    print("--------------")
    if app_import and not getattr(args, "app", None):
        print(f"Auto-detected FastAPI app: {app_import}")
    output_format = str(getattr(args, "format", "table") or "table").strip().lower()
    if output_format == "json":
        return print_json(
            {
                "ok": True,
                "project_name": project_name,
                "db_path": db_path,
                "env_file": env_file,
                "auth": auth,
                "app": {
                    "target": app_import,
                    "auto_detected": bool(app_import and not getattr(args, "app", None)),
                    "detection_error": app_detection_error,
                    "load_error": app_load_error,
                    "jin_mounted": mounted,
                },
                "discovery": {
                    "summary": discovery_summary,
                    "examples": [
                        {"endpoint": endpoint_path, "status": status, "reasons": reasons}
                        for endpoint_path, status, reasons in discovery_examples
                    ],
                },
                "guidance": guidance,
            }
        )
    print(render_text_table(summary_rows))

    if discovery_examples:
        detail_rows = [["endpoint", "status", "reasons"]]
        for endpoint_path, status, reasons in discovery_examples:
            detail_rows.append([endpoint_path, status, ",".join(reasons) if reasons else "-"])
        print("")
        print("Discovery samples:")
        print(render_text_table(detail_rows))

    print("")
    print("Guidance:")
    for item in guidance:
        print(f"- {item}")
    return 0


def command_init(args: argparse.Namespace) -> int:
    if bool(getattr(args, "check", False)):
        return command_init_check(args)
    ensure_project_root_cwd()
    interactive = bool(getattr(args, "interactive", False))
    project_name = env_project_name(args.project_name)
    db_path = env_db_path(args.db_path)
    ensure_db_parent_dir(db_path)
    app_path = getattr(args, "app", None)
    auth_enabled = bool(args.auth)
    env_file = args.env_file
    if interactive:
        project_name = prompt_value("Project name", project_name)
        db_path = prompt_value("DuckDB path", db_path)
        if not app_path:
            app_path = prompt_value("FastAPI app import path (optional)", "").strip() or None
        auth_enabled = prompt_yes_no("Enable login?", auth_enabled)
        if not getattr(args, "write", False):
            setattr(args, "write", prompt_yes_no(f"Write settings to {env_file}?", True))
    auth_lines: list[str] = generate_auth_lines()[1] if auth_enabled else []
    env_lines = [
        f"JIN_PROJECT_NAME={project_name}",
        f"JIN_DB_PATH={db_path}",
        "JIN_LOG_LEVEL=INFO",
        f"JIN_AUTH_ENABLED={'true' if auth_enabled else 'false'}",
    ]
    if auth_enabled:
        env_lines.append("JIN_USERNAME=operator")
        if len(auth_lines) > 1:
            env_lines.extend(auth_lines[1:])
    output = "\n".join(env_lines) + "\n"
    if args.write:
        env_path = Path(args.env_file)
        if env_path.exists() and not args.force:
            raise RuntimeError(f"{env_path} already exists. Use --force to overwrite.")
        env_path.write_text(output)
        print(f"Wrote {env_path}")
    else:
        print(output.rstrip())
    if app_path:
        records = sync_app_to_db(app_path, db_path)
        print(f"Seeded {len(records)} endpoints from {app_path} into {db_path}")
        if getattr(args, "serve_check", False):
            print_serve_check(app_path)
    print_init_next_steps(app_path, db_path, auth_enabled)
    if getattr(args, "open", False):
        print("")
        command_urls(argparse.Namespace(host="127.0.0.1", port=8000, scheme="http", format="table", launch=None))
    return 0


def command_quickstart(args: argparse.Namespace) -> int:
    print("Jin quickstart")
    print("---------------")
    init_args = argparse.Namespace(
        project_name=args.project_name,
        db_path=args.db_path,
        app=args.app,
        serve_check=True,
        env_file=args.env_file,
        write=args.write,
        force=args.force,
        auth=args.auth,
        interactive=args.interactive,
    )
    command_init(init_args)
    print("")
    print("Quick doctor:")
    doctor_args = argparse.Namespace(db_path=args.db_path, app=args.app)
    command_doctor(doctor_args)
    if getattr(args, "open", False):
        print("")
        command_urls(argparse.Namespace(host="127.0.0.1", port=8000, scheme="http", format="table", launch=None))
    return 0


def command_setup(args: argparse.Namespace) -> int:
    ensure_project_root_cwd()
    module_path = getattr(args, "app_file", None) or discover_module_path()
    app_var = getattr(args, "app_var", None)
    db_path = env_db_path(getattr(args, "db_path", None))
    env_file = getattr(args, "env_file", ".env")
    project_name = env_project_name(getattr(args, "project_name", None))
    global_threshold = float(getattr(args, "global_threshold", 10.0))
    auth_enabled = not bool(getattr(args, "no_auth", False))
    should_open = not bool(getattr(args, "no_open", False))
    if app_var is None:
        file_path = resolve_module_file(module_path)
        _, app_var = detect_fastapi_binding_in_source(file_path.read_text(), None)
        _, import_attr = detect_fastapi_entrypoint_in_source(file_path.read_text(), None)
    else:
        import_attr = app_var
    app_import = f"{module_path}:{import_attr}"

    print_section("Jin setup")
    print("----------")
    command_patch_fastapi(
        argparse.Namespace(
            app_file=module_path,
            app_var=app_var,
            db_path=db_path,
            global_threshold=global_threshold,
        )
    )
    print("")
    command_init(
        argparse.Namespace(
            project_name=project_name,
            db_path=db_path,
            app=app_import,
            serve_check=True,
            env_file=env_file,
            write=True,
            force=False,
            auth=auth_enabled,
            interactive=False,
            open=False,
        )
    )
    if auth_enabled:
        print("")
        command_auth_rotate(
            argparse.Namespace(
                password=None,
                iterations=120000,
                env_file=env_file,
                write_env=True,
                force=True,
            )
        )
    print("")
    print_success("Setup complete.")
    print(f"- FastAPI app: {app_import}")
    print(f"- Env file: {env_file}")
    print(f"- DuckDB: {db_path}")
    if should_open:
        print("")
        command_urls(argparse.Namespace(host="127.0.0.1", port=8000, scheme="http", format="table", launch=None))
    return 0


def command_auth_status(_args: argparse.Namespace) -> int:
    data = auth_status_data()
    if getattr(_args, "format", "table") == "json":
        return print_json(data)
    rows = [
        ["setting", "value"],
        ["auth_enabled", "yes" if data["auth_enabled"] else "no"],
        ["username", data["username"] or "not set"],
        ["password_hash", "configured" if data["password_hash"] else "not set"],
        ["plaintext_password", "set" if data["plaintext_password"] else "not set"],
        ["session_secret", "configured" if data["session_secret"] else "not set"],
        ["session_ttl_minutes", str(data["session_ttl_minutes"])],
    ]
    print(render_text_table(rows))
    if data["warnings"]:
        print("")
        print("Warnings:")
        for warning in data["warnings"]:
            print(f"- {warning}")
        print("")
        print("Suggested fix:")
        print("- Run: jin auth rotate --write-env")
        print("- Restart the app after the env file is updated")
    else:
        print("")
        print("Auth looks ready.")
    return 0


def command_env_check(args: argparse.Namespace) -> int:
    env_file = getattr(args, "env_file", ".env")
    db_path = env_db_path(getattr(args, "db_path", None))
    project_name = env_project_name(getattr(args, "project_name", None))
    data = env_check_data(env_file, db_path, project_name)
    if getattr(args, "format", "table") == "json":
        return print_json(data)
    rows = [
        ["setting", "value"],
        ["env_file", data["env_file"]],
        ["env_exists", "yes" if data["env_exists"] else "no"],
        ["project_name", project_name],
        ["db_path", db_path],
        ["db_exists", "yes" if data["db_exists"] else "no"],
        ["auth_enabled", "yes" if data["auth_enabled"] else "no"],
        ["username", data["username"] or "not set"],
        ["password_hash", "configured" if data["password_hash"] else "not set"],
        ["session_secret", "configured" if data["session_secret"] else "not set"],
    ]
    print(render_text_table(rows))
    if data["warnings"]:
        print("")
        print("Warnings:")
        for warning in data["warnings"]:
            print(f"- {warning}")
    else:
        print("")
        print("Environment looks ready.")
    return 0


def command_env_set(args: argparse.Namespace) -> int:
    env_file = getattr(args, "env_file", ".env")
    values: dict[str, str] = {}
    if getattr(args, "project_name", None):
        values["JIN_PROJECT_NAME"] = str(args.project_name)
    if getattr(args, "db_path", None):
        values["JIN_DB_PATH"] = str(args.db_path)
    if getattr(args, "log_level", None):
        values["JIN_LOG_LEVEL"] = str(args.log_level)
    if getattr(args, "auth_enabled", None) is not None:
        values["JIN_AUTH_ENABLED"] = "true" if bool(args.auth_enabled) else "false"
    if getattr(args, "username", None):
        values["JIN_USERNAME"] = str(args.username)
    if getattr(args, "session_ttl_minutes", None) is not None:
        values["JIN_SESSION_TTL_MINUTES"] = str(int(args.session_ttl_minutes))

    if not values:
        raise RuntimeError("No env values were provided. Pass flags like --project-name or --db-path.")

    changes = upsert_env_values(env_file, values, overwrite=True)
    payload = {"env_file": str(Path(env_file)), "applied": changes, "values": values}
    if getattr(args, "format", "table") == "json":
        return print_json(payload)
    print(f"Updated {env_file}")
    for item in changes:
        print(f"- {item}")
    return 0


def command_urls(args: argparse.Namespace) -> int:
    host = getattr(args, "host", "127.0.0.1")
    port = int(getattr(args, "port", 8000))
    scheme = getattr(args, "scheme", "http")
    data = json.loads(require_native("urls", native_local_urls)(host, port, scheme))
    launch = getattr(args, "launch", None)
    if launch == "console":
        webbrowser.open(data["jin_console"])
    elif launch == "login":
        webbrowser.open(data["jin_login"])
    elif launch == "root":
        webbrowser.open(data["app_root"])
    if getattr(args, "format", "table") == "json":
        return print_json(data)
    rows = [["surface", "url"], *[[key, value] for key, value in data.items()]]
    print(render_text_table(rows))
    return 0


def command_open(args: argparse.Namespace) -> int:
    url = f'{getattr(args, "scheme", "http")}://{getattr(args, "host", "127.0.0.1")}:{int(getattr(args, "port", 8000))}{getattr(args, "path", "/jin")}'
    if getattr(args, "launch", False):
        webbrowser.open(url)
    if getattr(args, "format", "text") == "json":
        return print_json({"url": url})
    print(url)
    return 0


def command_patch_fastapi(args: argparse.Namespace) -> int:
    module_path = getattr(args, "app_file", None) or discover_module_path()
    requested_app_var = getattr(args, "app_var", None)
    file_path = resolve_module_file(module_path)
    content = file_path.read_text()
    binding_kind, app_var = detect_fastapi_binding_in_source(content, requested_app_var)

    middleware_line = (
        f'{app_var}.add_middleware(JinMiddleware, db_path="{getattr(args, "db_path", "./jin.duckdb")}", '
        f'global_threshold={float(getattr(args, "global_threshold", 10.0))})'
    )
    marker_begin = "# jin: begin middleware"
    marker_end = "# jin: end middleware"

    already_patched = marker_begin in content or f"{app_var}.add_middleware(JinMiddleware" in content
    if getattr(args, "check", False):
        if already_patched:
            print_success(f"Jin middleware is already present in {file_path}.")
            return 0
        print_warning(f"Jin middleware is not present in {file_path}.")
        return 1

    if getattr(args, "undo", False):
        updated = content
        updated = re.sub(
            rf"\n?{re.escape(marker_begin)}\n{re.escape(middleware_line)}\n{re.escape(marker_end)}\n?",
            "\n",
            updated,
            flags=re.MULTILINE,
        )
        updated = updated.replace(f"\nfrom jin import JinMiddleware", "")
        updated = updated.replace("from jin import JinMiddleware\n", "")
        if updated == content:
            print_warning(f"No Jin middleware patch found in {file_path}.")
            return 1
        if getattr(args, "dry_run", False):
            print_section("Undo preview")
            print(updated)
            return 0
        file_path.write_text(updated.rstrip() + "\n")
        print_success(f"Removed Jin middleware patch from {file_path}")
        return 0

    if already_patched:
        print_success(f"{file_path} already includes Jin middleware for {app_var}.")
        return 0

    lines = content.splitlines()
    fastapi_import_index = next((idx for idx, line in enumerate(lines) if line.startswith("from fastapi import ")), None)
    import_already_present = any("JinMiddleware" in line and "from jin import" in line for line in lines)
    app_assignment_index = None
    if binding_kind == "instance":
        app_assignment_index = next(
            (
                idx
                for idx, line in enumerate(lines)
                if re.match(rf"^{re.escape(app_var)}\s*=\s*FastAPI\(", line.strip())
            ),
            None,
        )
    return_index = None
    if binding_kind == "factory":
        return_index = next(
            (
                idx
                for idx, line in enumerate(lines)
                if re.match(rf"^\s*return\s+{re.escape(app_var)}\s*$", line)
            ),
            None,
        )

    if app_assignment_index is None and return_index is None:
        raise RuntimeError(
            f"Could not find a patch point for '{app_var}' in {file_path}. "
            "Jin looked for either `app = FastAPI(...)` or `return app` in a factory. "
                "Use --app-var if your FastAPI object has a different name."
        )

    patched_lines = list(lines)
    if not import_already_present:
        if fastapi_import_index is not None:
            patched_lines.insert(fastapi_import_index + 1, "from jin import JinMiddleware")
            if app_assignment_index is not None:
                app_assignment_index += 1
            if return_index is not None:
                return_index += 1
        else:
            insert_at = 0
            while insert_at < len(patched_lines) and (
                patched_lines[insert_at].startswith("from ")
                or patched_lines[insert_at].startswith("import ")
                or not patched_lines[insert_at].strip()
            ):
                insert_at += 1
            patched_lines.insert(insert_at, "from jin import JinMiddleware")
            if app_assignment_index is not None and insert_at <= app_assignment_index:
                app_assignment_index += 1
            if return_index is not None and insert_at <= return_index:
                return_index += 1

    if app_assignment_index is not None:
        insert_index = app_assignment_index + 1
        while insert_index < len(patched_lines) and not patched_lines[insert_index].strip():
            insert_index += 1
        indent = ""
    else:
        insert_index = return_index
        indent_match = re.match(r"^(\s*)return\s+", patched_lines[return_index])
        indent = indent_match.group(1) if indent_match else "    "
    patched_lines.insert(insert_index, f"{indent}{marker_begin}")
    patched_lines.insert(insert_index + 1, f"{indent}{middleware_line}")
    patched_lines.insert(insert_index + 2, f"{indent}{marker_end}")

    patched_text = "\n".join(patched_lines).rstrip() + "\n"
    if getattr(args, "dry_run", False):
        print_section("Patch preview")
        print(patched_text)
        return 0

    file_path.write_text(patched_text)
    print_success(f"Patched {file_path}")
    print("Inserted:")
    if not import_already_present:
        print("- from jin import JinMiddleware")
    print(f"- {middleware_line}")
    return 0


def command_completion(args: argparse.Namespace) -> int:
    commands = [
        "quickstart",
        "init",
        "setup",
        "open",
        "patch",
        "completion",
        "status",
        "env",
        "urls",
        "auth",
        "doctor",
        "verify",
        "endpoints",
        "config",
        "templates",
        "references",
        "issues",
        "watches",
        "serve",
        "benchmark",
    ]
    subcommands = {
        "env": "check",
        "auth": "rotate status",
        "patch": "fastapi",
        "endpoints": "list",
        "config": "show set",
        "templates": "generate",
        "references": "import validate export",
        "issues": "list update",
        "watches": "list run",
        "benchmark": "install",
    }
    option_map = {
        "init": "--project-name --db-path --app --serve-check --env-file --write --force --check --auth --no-auth --interactive --open",
        "quickstart": "--project-name --db-path --app --env-file --write --force --auth --no-auth --interactive --open",
        "setup": "--app-var --project-name --db-path --env-file --global-threshold --no-auth --no-open",
        "open": "--host --port --scheme --path --format --launch",
        "patch": "",
        "status": "--db-path --env-file --project-name --app --format",
        "urls": "--host --port --scheme --format --launch",
        "doctor": "--db-path --env-file --project-name --app --format --strict --fix --deep",
        "verify": "--db-path --env-file --project-name --app --format --strict",
        "serve": "--app --host --port --reload",
        "benchmark": "",
    }
    subcommand_options = {
        "env check": "--env-file --db-path --project-name --format",
        "env set": "--env-file --project-name --db-path --log-level --auth-enabled --no-auth-enabled --username --session-ttl-minutes --format",
        "auth rotate": "--password --iterations --env-file --write-env --force",
        "auth status": "--format",
        "patch fastapi": "--app-file --app-var --db-path --global-threshold --check --dry-run --undo",
        "endpoints list": "--db-path --app --format",
        "config show": "--endpoint --db-path --app",
        "config set": "--endpoint --dimensions --kpis --active-tolerance --relaxed --normal --strict --confirmed --db-path --app --format",
        "templates generate": "--endpoint --format --output --db-path --app --format-output",
        "references import": "--endpoint --file --db-path --app",
        "references validate": "--endpoint --file --db-path --app --format",
        "references export": "--endpoint --format --db-path",
        "issues list": "--endpoint --status --format --db-path",
        "issues update": "--id --action --note --owner --resolution-reason --db-path --format",
        "watches list": "--app --db-path --format",
        "watches run": "--app --endpoint --db-path",
        "benchmark install": "--python --runs --tool --with-deps --native-baseline --no-native-baseline --format --keep-temp",
    }
    joined = " ".join(commands)
    if args.shell == "bash":
        option_cases = "\n".join(
            f'    {name}) COMPREPLY=( $(compgen -W "{options}" -- "$cur") ); return ;;'
            for name, options in option_map.items()
        )
        case_lines = "\n".join(
            f'    {name}) COMPREPLY=( $(compgen -W "{options}" -- "$cur") ); return ;;'
            for name, options in subcommands.items()
        )
        nested_cases = "\n".join(
            f'        {sub}) COMPREPLY=( $(compgen -W "{options}" -- "$cur") ); return ;;'
            for key, options in subcommand_options.items()
            for _parent, sub in [key.split(" ", 1)]
        )
        script = f"""_jin_completions() {{
  local cur="${{COMP_WORDS[COMP_CWORD]}}"
  local prev="${{COMP_WORDS[1]}}"
  local sub="${{COMP_WORDS[2]}}"
  if [[ "$cur" == -* ]]; then
    case "$prev" in
{option_cases}
      env|auth|endpoints|config|templates|references|issues|watches|benchmark)
        case "$sub" in
{nested_cases}
        esac
        ;;
    esac
  fi
  case "$prev" in
{case_lines}
  esac
  COMPREPLY=( $(compgen -W "{joined}" -- "$cur") )
}}
complete -F _jin_completions jin
"""
    else:
        top_specs = "\n".join(
            f'      {name}) _describe "{name} option" ({options}) ;;'
            for name, options in option_map.items()
        )
        sub_specs = "\n".join(
            f'      {name}) _describe "{name} subcommand" ({options}) ;;'
            for name, options in subcommands.items()
        )
        nested_specs = "\n".join(
            f'        {sub}) _describe "{parent} {sub} option" ({options}) ;;'
            for key, options in subcommand_options.items()
            for parent, sub in [key.split(" ", 1)]
        )
        script = f"""#compdef jin
_jin() {{
  local -a commands
  commands=({joined})
  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi
  if [[ "$words[CURRENT]" == -* ]]; then
    case "$words[2]" in
{top_specs}
      env|auth|endpoints|config|templates|references|issues|watches)
        case "$words[3]" in
{nested_specs}
        esac
        ;;
    esac
  fi
  case "$words[2]" in
{sub_specs}
  esac
  _describe 'command' commands
}}
compdef _jin jin
"""
    print(script.rstrip())
    return 0


def write_env_stub(env_file: str, project_name: str, db_path: str) -> None:
    env_path = Path(env_file)
    env_path.write_text(
        "\n".join(
            [
                f"JIN_PROJECT_NAME={project_name}",
                f"JIN_DB_PATH={db_path}",
                "JIN_LOG_LEVEL=INFO",
                "JIN_AUTH_ENABLED=false",
                "",
            ]
        )
    )


def upsert_env_values(
    env_file: str,
    values: dict[str, str],
    *,
    remove_keys: list[str] | None = None,
    overwrite: bool = True,
) -> list[str]:
    env_path = Path(env_file)
    existing_lines = env_path.read_text().splitlines() if env_path.exists() else []
    updated_lines: list[str] = []
    changed_keys: list[str] = []
    seen_keys: set[str] = set()
    remove = set(remove_keys or [])

    for raw_line in existing_lines:
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#") or "=" not in raw_line:
            updated_lines.append(raw_line)
            continue
        key, _ = raw_line.split("=", 1)
        key = key.strip()
        if key in remove:
            seen_keys.add(key)
            changed_keys.append(f"removed:{key}")
            continue
        if key in values:
            if overwrite:
                updated_lines.append(f"{key}={values[key]}")
                changed_keys.append(f"set:{key}")
            else:
                updated_lines.append(raw_line)
            seen_keys.add(key)
            continue
        updated_lines.append(raw_line)

    for key, value in values.items():
        if key not in seen_keys:
            updated_lines.append(f"{key}={value}")
            changed_keys.append(f"added:{key}")

    env_path.write_text("\n".join(updated_lines).rstrip() + "\n")
    return changed_keys


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _resolve_bin(name: str) -> str | None:
    return shutil.which(name)


def _resolve_python_bin(candidate: str) -> str:
    if Path(candidate).exists():
        return str(Path(candidate))
    located = shutil.which(candidate)
    if located:
        return located
    return sys.executable


def _venv_python_path(venv_dir: Path) -> Path:
    scripts_dir = venv_dir / "Scripts"
    if scripts_dir.exists():
        return scripts_dir / "python.exe"
    return venv_dir / "bin" / "python"


def _timed_run(command: list[str], *, env: dict[str, str] | None = None, cwd: Path | None = None) -> float:
    started = time.perf_counter()
    try:
        subprocess.run(
            command,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            cwd=cwd,
        )
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        if stderr:
            stderr = stderr.splitlines()[-1]
        raise RuntimeError(
            f"Command failed: {' '.join(command)}"
            + (f" | {stderr}" if stderr else "")
        ) from exc
    return max(time.perf_counter() - started, 0.0)


def _benchmark_fast_install_once(
    *,
    temp_root: Path,
    python_bin: str,
    install_tool: str,
    package_root: Path,
    include_deps: bool,
) -> dict[str, Any]:
    venv_dir = temp_root / "fast-venv"
    if install_tool == "uv":
        uv_bin = _resolve_bin("uv")
        if uv_bin is None:
            raise RuntimeError("uv is not installed. Install uv or use --tool pip.")
        uv_env = dict(os.environ)
        uv_env.setdefault("UV_CACHE_DIR", str(temp_root / "uv-cache"))
        _timed_run([uv_bin, "venv", str(venv_dir), "--python", python_bin], env=uv_env)
        venv_python = str(_venv_python_path(venv_dir))
        _timed_run([venv_python, "-m", "ensurepip", "--upgrade"], env=uv_env)
        command = [venv_python, "-m", "pip", "install"]
        if not include_deps:
            command.append("--no-deps")
        command.append(str(package_root))
        install_seconds = _timed_run(command, env=uv_env)
    else:
        _timed_run([python_bin, "-m", "venv", "--system-site-packages", str(venv_dir)])
        venv_python = str(_venv_python_path(venv_dir))
        command = [venv_python, "-m", "pip", "install"]
        if not include_deps:
            command.append("--no-deps")
        command.append(str(package_root))
        install_seconds = _timed_run(command)

    return {
        "tool": install_tool,
        "install_seconds": round(install_seconds, 3),
    }


def _benchmark_native_baseline_once(*, temp_root: Path, package_root: Path) -> dict[str, Any]:
    cargo_bin = _resolve_bin("cargo")
    if cargo_bin is None:
        return {
            "available": False,
            "reason": "cargo is not installed; skipped native baseline.",
            "native_compile_seconds": None,
        }
    baseline_env = dict(os.environ)
    baseline_env.setdefault("PYO3_USE_ABI3_FORWARD_COMPATIBILITY", "1")
    baseline_env["CARGO_TARGET_DIR"] = str(temp_root / "cargo-target")
    compile_seconds = _timed_run(
        [
            cargo_bin,
            "build",
            "--release",
            "--features",
            "extension-module",
            "--manifest-path",
            str(package_root / "Cargo.toml"),
        ],
        env=baseline_env,
        cwd=package_root,
    )
    return {
        "available": True,
        "reason": None,
        "native_compile_seconds": round(compile_seconds, 3),
    }


def _select_install_tool(requested_tool: str) -> str:
    if requested_tool in {"uv", "pip"}:
        return requested_tool
    return "uv" if _resolve_bin("uv") else "pip"


def command_benchmark_install(args: argparse.Namespace) -> int:
    runs = int(getattr(args, "runs", 1))
    if runs < 1:
        raise RuntimeError("--runs must be >= 1")

    python_bin = _resolve_python_bin(str(getattr(args, "python", "python3")))
    requested_tool = str(getattr(args, "tool", "auto"))
    selected_tool = _select_install_tool(str(getattr(args, "tool", "auto")))
    include_native_baseline = bool(getattr(args, "native_baseline", True))
    include_deps = bool(getattr(args, "with_deps", False))
    package_root = _repo_root()
    keep_temp = bool(getattr(args, "keep_temp", False))

    run_rows: list[dict[str, Any]] = []
    native_rows: list[dict[str, Any]] = []
    temp_roots: list[str] = []

    for run_index in range(1, runs + 1):
        temp_root = Path(tempfile.mkdtemp(prefix=f"jin-install-benchmark-{run_index}-"))
        temp_roots.append(str(temp_root))
        try:
            fast_row = _benchmark_fast_install_once(
                temp_root=temp_root,
                python_bin=python_bin,
                install_tool=selected_tool,
                package_root=package_root,
                include_deps=include_deps,
            )
        except Exception as exc:
            if requested_tool == "auto" and selected_tool == "uv":
                selected_tool = "pip"
                try:
                    fast_row = _benchmark_fast_install_once(
                        temp_root=temp_root,
                        python_bin=python_bin,
                        install_tool=selected_tool,
                        package_root=package_root,
                        include_deps=include_deps,
                    )
                    fast_row["fallback_reason"] = str(exc)
                except Exception as pip_exc:
                    raise RuntimeError(
                        "Install benchmark failed for both uv and pip modes. "
                        "Check network access and Python build tooling, or rerun with "
                        "`--tool pip --with-deps`."
                    ) from pip_exc
            else:
                raise RuntimeError(
                    "Install benchmark failed. "
                    "Check network access and Python build tooling, or rerun with "
                    "`--with-deps`."
                ) from exc
        run_rows.append({"run": run_index, **fast_row})
        if include_native_baseline:
            native_row = _benchmark_native_baseline_once(temp_root=temp_root, package_root=package_root)
            native_rows.append({"run": run_index, **native_row})
        if not keep_temp:
            shutil.rmtree(temp_root, ignore_errors=True)

    fast_values = [float(item["install_seconds"]) for item in run_rows]
    fast_avg = round(sum(fast_values) / len(fast_values), 3) if fast_values else None

    native_values = [
        float(item["native_compile_seconds"])
        for item in native_rows
        if item.get("available") and item.get("native_compile_seconds") is not None
    ]
    native_avg = round(sum(native_values) / len(native_values), 3) if native_values else None
    speedup_pct = None
    speedup_x = None
    if native_avg is not None and fast_avg is not None and native_avg > 0:
        speedup_pct = round(((native_avg - fast_avg) / native_avg) * 100.0, 2)
        speedup_x = round(native_avg / max(fast_avg, 0.001), 2)

    payload = {
        "tool": selected_tool,
        "runs": runs,
        "with_deps": include_deps,
        "fast_path": {
            "runs": run_rows,
            "avg_install_seconds": fast_avg,
        },
        "legacy_native_baseline": {
            "enabled": include_native_baseline,
            "runs": native_rows,
            "avg_native_compile_seconds": native_avg,
            "note": "Native baseline approximates legacy Rust-compile install overhead.",
        },
        "estimated_reduction_pct_vs_native": speedup_pct,
        "estimated_speedup_x_vs_native": speedup_x,
        "temp_dirs": temp_roots if keep_temp else [],
    }

    if getattr(args, "format", "table") == "json":
        return print_json(payload)

    print("Install benchmark")
    print("-----------------")
    print(
        render_text_table(
            [
                ["metric", "value"],
                ["tool", selected_tool],
                ["runs", str(runs)],
                ["with_deps", "yes" if include_deps else "no"],
                ["avg_fast_install_seconds", str(fast_avg)],
            ]
        )
    )

    fast_table = [["run", "tool", "fast_install_seconds"]]
    for item in run_rows:
        fast_table.append([str(item["run"]), str(item["tool"]), str(item["install_seconds"])])
    print("")
    print("Fast path runs:")
    print(render_text_table(fast_table))

    if include_native_baseline:
        native_table = [["run", "available", "native_compile_seconds", "reason"]]
        for item in native_rows:
            native_table.append(
                [
                    str(item["run"]),
                    "yes" if bool(item.get("available")) else "no",
                    str(item.get("native_compile_seconds") or "-"),
                    str(item.get("reason") or "-"),
                ]
            )
        print("")
        print("Native baseline runs:")
        print(render_text_table(native_table))

        if speedup_pct is not None and speedup_x is not None:
            print("")
            print(
                f"Estimated install-time reduction vs native baseline: {speedup_pct}% ({speedup_x}x faster)"
            )
        else:
            print("")
            print("Estimated install-time reduction is unavailable because native baseline could not run.")

    if keep_temp and temp_roots:
        print("")
        print("Kept temp benchmark dirs:")
        for path in temp_roots:
            print(f"- {path}")
    return 0


def auth_status_data() -> dict[str, Any]:
    if native_auth_status is not None:
        return json.loads(native_auth_status(native_env_payload()))

    auth_enabled = os.getenv("JIN_AUTH_ENABLED", "").lower() in {"1", "true", "yes", "on"}
    username = os.getenv("JIN_USERNAME", "")
    password = os.getenv("JIN_PASSWORD", "")
    password_hash = os.getenv("JIN_PASSWORD_HASH", "")
    session_secret = os.getenv("JIN_SESSION_SECRET", "")
    ttl = os.getenv("JIN_SESSION_TTL_MINUTES", "480")

    warnings: list[str] = []
    if auth_enabled and not username:
        warnings.append("JIN_USERNAME is missing.")
    if auth_enabled and not password and not password_hash:
        warnings.append("Set JIN_PASSWORD_HASH or JIN_PASSWORD.")
    if auth_enabled and password:
        warnings.append("Plaintext JIN_PASSWORD is set. Prefer JIN_PASSWORD_HASH.")
    if auth_enabled and username == "operator" and (password == "change-me" or not password_hash):
        warnings.append("Default login is still in use.")
    if auth_enabled and not session_secret:
        warnings.append("JIN_SESSION_SECRET is missing.")

    return {
        "auth_enabled": auth_enabled,
        "username": username or None,
        "password_hash": bool(password_hash),
        "plaintext_password": bool(password),
        "session_secret": bool(session_secret),
        "session_ttl_minutes": int(ttl),
        "warnings": warnings,
        "ready": not warnings,
    }


def command_auth_rotate(args: argparse.Namespace) -> int:
    password, auth_lines = generate_auth_lines(
        password=getattr(args, "password", None),
        iterations=int(getattr(args, "iterations", 120000)),
    )
    if not getattr(args, "write_env", False):
        print("\n".join(auth_lines))
        return 0

    env_file = getattr(args, "env_file", ".env")
    values = {
        "JIN_AUTH_ENABLED": "true",
        "JIN_USERNAME": os.getenv("JIN_USERNAME", "operator") or "operator",
        "JIN_PASSWORD_HASH": next(
            line.split("=", 1)[1] for line in auth_lines if line.startswith("JIN_PASSWORD_HASH=")
        ),
        "JIN_SESSION_SECRET": next(
            line.split("=", 1)[1] for line in auth_lines if line.startswith("JIN_SESSION_SECRET=")
        ),
        "JIN_SESSION_TTL_MINUTES": next(
            line.split("=", 1)[1] for line in auth_lines if line.startswith("JIN_SESSION_TTL_MINUTES=")
        ),
    }
    changes = upsert_env_values(
        env_file,
        values,
        remove_keys=["JIN_PASSWORD"],
        overwrite=True,
    )
    print(f"Updated {env_file}")
    print(f"Password: {password}")
    print("Applied:")
    for change in changes:
        print(f"- {change}")
    print("Next:")
    print("- Restart your app")
    print("- Sign in with the password above")
    print("- Run: jin auth status")
    return 0


def env_check_data(env_file: str, db_path: str, project_name: str) -> dict[str, Any]:
    if native_env_check is not None:
        return json.loads(native_env_check(native_env_payload(), env_file, db_path, project_name))

    env_path = Path(env_file)
    auth = auth_status_data()
    warnings = list(auth["warnings"])
    if not env_path.exists():
        warnings.insert(0, f"{env_file} does not exist yet.")
    if not Path(db_path).exists():
        warnings.append(f"DuckDB file does not exist yet at {db_path}.")
    return {
        "env_file": str(env_path),
        "env_exists": env_path.exists(),
        "project_name": project_name,
        "db_path": db_path,
        "db_exists": Path(db_path).exists(),
        "auth_enabled": auth["auth_enabled"],
        "username": auth["username"],
        "password_hash": auth["password_hash"],
        "session_secret": auth["session_secret"],
        "warnings": warnings,
        "ready": not warnings,
    }


def command_doctor(args: argparse.Namespace) -> int:
    db_path = env_db_path(args.db_path)
    env_file = getattr(args, "env_file", ".env")
    env_path = Path(env_file)
    project_name = env_project_name(getattr(args, "project_name", None))
    applied_fixes: list[str] = []
    if getattr(args, "fix", False):
        ensure_schema(db_path)
        applied_fixes.append(f"Ensured DuckDB schema at {db_path}")
        if not env_path.exists():
            write_env_stub(env_file, project_name, db_path)
            applied_fixes.append(f"Wrote starter env file at {env_path}")
        if args.app:
            records = sync_app_to_db(args.app, db_path)
            applied_fixes.append(f"Seeded {len(records)} endpoints from {args.app}")
    env_data = env_check_data(env_file, db_path, project_name)
    auth = auth_status_data()
    if native_doctor_core is not None:
        try:
            core = json.loads(native_doctor_core(db_path, native_env_payload(), env_file, project_name))
            checks: list[tuple[str, str]] = [(name, str(status)) for name, status in core["checks"].items()]
        except Exception as exc:
            checks = [("native_doctor", f"error: {exc}")]
    else:
        checks = []
    native_doctor_failed = bool(checks) and checks[0][0] == "native_doctor"
    if not checks or native_doctor_failed:
        checks.append(("python", "ok"))
        checks.append(("project", project_name))
        checks.append(("env_file", str(env_path)))
        checks.append(("env_exists", "yes" if env_path.exists() else "no"))
        checks.append(("db_path", db_path))
        checks.append(("db_exists", "yes" if Path(db_path).exists() else "no"))
        checks.append(("auth_enabled", os.getenv("JIN_AUTH_ENABLED", "false")))
        checks.append(("password_hash", "yes" if os.getenv("JIN_PASSWORD_HASH") else "no"))
        checks.append(("session_secret", "yes" if os.getenv("JIN_SESSION_SECRET") else "no"))
        try:
            ensure_schema(db_path)
            checks.append(("duckdb_schema", "ok"))
        except Exception as exc:
            checks.append(("duckdb_schema", f"error: {exc}"))
        try:
            import jin_core  # noqa: F401

            checks.append(("native_extension", "ok"))
        except Exception as exc:  # pragma: no cover
            checks.append(("native_extension", f"error: {exc}"))
    if args.app:
        try:
            records = sync_app_to_db(args.app, db_path)
            checks.append(("app_import", "ok"))
            checks.append(("discovered_endpoints", str(len(records))))
        except Exception as exc:
            checks.append(("app_import", f"error: {exc}"))
    strict_failures = [
        name
        for name, status in checks
        if isinstance(status, str) and status.startswith("error")
    ]
    if getattr(args, "strict", False):
        if auth["warnings"]:
            strict_failures.extend([f"auth:{warning}" for warning in auth["warnings"]])
        if not Path(db_path).exists():
            strict_failures.append("db_path")
    silent = bool(getattr(args, "_silent", False))
    if applied_fixes:
        if getattr(args, "format", "table") == "table" and not silent:
            print("Applied fixes:")
            for item in applied_fixes:
                print(f"- {item}")
            print("")
    data = {
        "applied_fixes": applied_fixes,
        "checks": {name: status for name, status in checks},
        "strict_failures": strict_failures,
    }
    if bool(getattr(args, "deep", False)):
        deep_payload: dict[str, Any] = {
            "install": {
                "distribution": "jin-monitor",
                "native_runtime_expected": native_doctor_core is not None,
                "native_support_available": {
                    "doctor_core": native_doctor_core is not None,
                    "project_status": native_project_status is not None,
                    "verify_core": native_verify_core is not None,
                },
            },
            "runtime": {
                "env_file": str(env_path),
                "env_exists": env_path.exists(),
                "db_exists": Path(db_path).exists(),
                "db_size_bytes": Path(db_path).stat().st_size if Path(db_path).exists() else 0,
            },
            "slo_targets": {
                "install_seconds": float(os.getenv("JIN_INSTALL_SLO_SECONDS", "30")),
                "startup_seconds": float(os.getenv("JIN_STARTUP_SLO_SECONDS", "5")),
            },
        }
        if args.app:
            try:
                app = load_app(args.app)
                route_rows: list[dict[str, Any]] = []
                reason_counts: dict[str, int] = {}
                summary = {"ready": 0, "partial": 0, "runtime_infer": 0, "total": 0}
                for route in app.routes:
                    if not isinstance(route, APIRoute):
                        continue
                    if str(route.path).startswith("/jin"):
                        continue
                    response_model = JinMiddleware._resolve_response_model(route)
                    fields, dims, kpis, _array = classify_model(response_model)
                    status, reasons = JinMiddleware._discovery_profile(
                        response_model=response_model,
                        fields=fields,
                        dimension_fields=dims,
                        kpi_fields=kpis,
                    )
                    summary["total"] += 1
                    summary[status] = int(summary.get(status, 0)) + 1
                    for code in reasons:
                        reason_counts[code] = int(reason_counts.get(code, 0)) + 1
                    route_rows.append(
                        {
                            "endpoint_path": route.path,
                            "http_method": sorted(route.methods or {"GET"})[0],
                            "discovery_status": status,
                            "discovery_reason_codes": reasons,
                            "dimensions": dims,
                            "kpis": kpis,
                        }
                    )
                deep_payload["discovery"] = {
                    "summary": summary,
                    "reason_counts": reason_counts,
                    "problem_endpoints": [
                        row for row in route_rows if row.get("discovery_status") != "ready"
                    ][:12],
                }
            except Exception as exc:
                deep_payload["discovery"] = {"error": str(exc)}
        data["deep"] = deep_payload
    if getattr(args, "format", "table") == "json":
        if not silent:
            print_json(data)
        return 1 if strict_failures else 0
    if not silent:
        formatted_checks = [[str(k), str(v)] for k, v in checks]
        print(render_text_table([["check", "status"]] + formatted_checks))
        if bool(getattr(args, "deep", False)):
            deep = data.get("deep", {})
            print("")
            print("Deep diagnostics:")
            print(render_text_table([["section", "status"], ["install", "ok"], ["runtime", "ok"], ["discovery", "ok" if isinstance(deep.get("discovery"), dict) and not deep["discovery"].get("error") else "warning"]]))
            discovery = deep.get("discovery", {})
            if isinstance(discovery, dict) and isinstance(discovery.get("summary"), dict):
                summary = discovery["summary"]
                print(
                    f"Discovery summary: total={summary.get('total', 0)} "
                    f"ready={summary.get('ready', 0)} "
                    f"partial={summary.get('partial', 0)} "
                    f"runtime_infer={summary.get('runtime_infer', 0)}"
                )
    if getattr(args, "strict", False) and strict_failures:
        if not silent:
            print("")
            print("Strict mode failures:")
            for item in strict_failures:
                print(f"- {item}")
        return 1
    return 0


def command_verify(args: argparse.Namespace) -> int:
    doctor_args = argparse.Namespace(**vars(args))
    setattr(doctor_args, "_silent", getattr(args, "format", "table") == "json")
    doctor_exit = command_doctor(doctor_args)
    db_path = env_db_path(args.db_path)
    metrics = json.loads(
        require_native("verify", native_verify_core)(db_path, env_project_name(getattr(args, "project_name", None)))
    )["metrics"]
    if getattr(args, "format", "table") == "json":
        print_json({"metrics": metrics, "strict_failed": bool(getattr(args, "strict", False) and (doctor_exit != 0 or metrics["endpoints"] == 0))})
    else:
        print(render_text_table([["metric", "value"], *[[key, str(value)] for key, value in metrics.items()]]))
    if getattr(args, "strict", False) and (doctor_exit != 0 or metrics["endpoints"] == 0):
        return 1
    return doctor_exit


def command_status(args: argparse.Namespace) -> int:
    db_path = env_db_path(getattr(args, "db_path", None))
    project_name = env_project_name(getattr(args, "project_name", None))
    env_file = getattr(args, "env_file", ".env")
    if args.app:
        ensure_endpoint_seeded(db_path, args.app)
    watch_count = 0
    if args.app:
        records = sync_app_to_db(args.app, db_path)
        watch_count = len([record for record in records if (record["watch_config"] or {}).get("schedule")])
    data = json.loads(
        require_native("status", native_project_status)(
            db_path,
            native_env_payload(),
            env_file,
            project_name,
            watch_count,
        )
    )
    if getattr(args, "format", "table") == "json":
        return print_json(data)
    env_data = data["env"]
    auth_data = data["auth"]
    metrics = data["metrics"]
    table = [
        ["metric", "value"],
        ["project_name", project_name],
        ["env_ready", "yes" if env_data["ready"] else "no"],
        ["auth_ready", "yes" if auth_data["ready"] else "no"],
        ["endpoints", str(metrics["endpoints"])],
        ["active_issues", str(metrics["active_issues"])],
        ["references", str(metrics["references"])],
        ["watches", str(metrics["watches"])],
    ]
    print(render_text_table(table))
    return 0


def command_report_summary(args: argparse.Namespace) -> int:
    db_path = env_db_path(getattr(args, "db_path", None))
    project_name = env_project_name(getattr(args, "project_name", None))
    payload = json.loads(require_native("report summary", native_report_summary)(db_path, project_name))
    endpoint_count = int(payload["endpoints"])
    issue_count = int(payload["active_issues"])
    reference_count = int(payload["references"])
    config_count = int(payload["configs"])
    output_format = getattr(args, "format", "table")
    if output_format == "json":
        return print_json(payload)
    if output_format == "markdown":
        lines = [
            f"# Jin Summary: {project_name}",
            "",
            f"- Endpoints: {endpoint_count}",
            f"- Active issues: {issue_count}",
            f"- References: {reference_count}",
            f"- Configs: {config_count}",
        ]
        if payload["recent_issue"]:
            lines.extend(
                [
                    "",
                    "## Latest Active Issue",
                    f"- Endpoint: {payload['recent_issue']['endpoint']}",
                    f"- KPI: {payload['recent_issue']['kpi']}",
                    f"- Actual: {payload['recent_issue']['actual']}",
                    f"- Expected: {payload['recent_issue']['expected']}",
                ]
            )
        print("\n".join(lines))
        return 0
    rows = [
        ["metric", "value"],
        ["project_name", project_name],
        ["endpoints", str(endpoint_count)],
        ["active_issues", str(issue_count)],
        ["references", str(reference_count)],
        ["configs", str(config_count)],
    ]
    if payload["recent_issue"]:
        rows.append(["latest_issue", f"{payload['recent_issue']['endpoint']}::{payload['recent_issue']['kpi']}"])
    print(render_text_table(rows))
    return 0


def command_ci_check(args: argparse.Namespace) -> int:
    doctor_args = argparse.Namespace(
        db_path=getattr(args, "db_path", None),
        env_file=getattr(args, "env_file", ".env"),
        project_name=getattr(args, "project_name", None),
        app=getattr(args, "app", None),
        format=getattr(args, "format", "table"),
        strict=True,
        _silent=True,
    )
    doctor_exit = command_doctor(doctor_args)
    db_path = env_db_path(getattr(args, "db_path", None))
    metrics = json.loads(
        require_native("ci check", native_verify_core)(db_path, env_project_name(getattr(args, "project_name", None)))
    )["metrics"]
    endpoint_count = int(metrics["endpoints"])
    issue_count = int(metrics["active_issues"])
    strict_failed = doctor_exit != 0 or endpoint_count == 0
    if getattr(args, "format", "table") == "json":
        print_json(
            {
                "strict_failed": strict_failed,
                "endpoints": endpoint_count,
                "active_issues": issue_count,
                "fail_on_issues": bool(getattr(args, "fail_on_issues", False)),
                "passed": not (strict_failed or (getattr(args, "fail_on_issues", False) and issue_count > 0)),
            }
        )
    else:
        print(render_text_table([["metric", "value"], ["endpoints", str(endpoint_count)], ["active_issues", str(issue_count)], ["strict_failed", "yes" if strict_failed else "no"]]))
    if getattr(args, "fail_on_issues", False) and getattr(args, "format", "table") != "json":
        print("")
        print(f"active_issues  {issue_count}")
    if strict_failed:
        return 1
    if getattr(args, "fail_on_issues", False) and issue_count > 0:
        return 1
    return 0


def command_endpoints_list(args: argparse.Namespace) -> int:
    db_path = env_db_path(args.db_path)
    ensure_endpoint_seeded(db_path, args.app)
    payload = json.loads(require_native("endpoints list", native_endpoints_list)(db_path))
    if getattr(args, "format", "table") == "json":
        return print_json(payload)
    table = [["method", "endpoint", "dimensions", "kpis", "source"]]
    for item in payload:
        table.append([item["method"], item["endpoint"], ",".join(item["dimensions"]), ",".join(item["kpis"]), item["source"]])
    print(render_text_table(table))
    return 0


def command_config_show(args: argparse.Namespace) -> int:
    db_path = env_db_path(args.db_path)
    ensure_endpoint_seeded(db_path, args.app)
    payload = json.loads(require_native("config show", native_config_show)(db_path, args.endpoint))
    return print_json(payload)


def command_config_set(args: argparse.Namespace) -> int:
    db_path = env_db_path(args.db_path)
    ensure_endpoint_seeded(db_path, args.app)
    detail = json.loads(require_native("config set", native_config_show)(db_path, args.endpoint))
    metadata = {
        "endpoint_path": detail.get("endpoint_path", args.endpoint),
        "http_method": detail.get("http_method", "GET"),
        "dimension_fields": (detail.get("config") or {}).get("dimension_fields", []),
        "kpi_fields": (detail.get("config") or {}).get("kpi_fields", []),
    }
    dimensions = [item.strip() for item in (args.dimensions or "").split(",") if item.strip()] or metadata["dimension_fields"]
    kpis = [item.strip() for item in (args.kpis or "").split(",") if item.strip()] or metadata["kpi_fields"]
    payload = {
        "dimension_fields": dimensions,
        "kpi_fields": kpis,
        "tolerance_relaxed": args.relaxed,
        "tolerance_normal": args.normal,
        "tolerance_strict": args.strict,
        "active_tolerance": args.active_tolerance,
        "tolerance_pct": args.normal,
        "confirmed": bool(args.confirmed),
    }
    require_native("config set", native_save_endpoint_config)(
        db_path,
        args.endpoint,
        metadata["http_method"],
        json.dumps(metadata["dimension_fields"]),
        json.dumps(metadata["kpi_fields"]),
        json.dumps(payload),
    )
    if getattr(args, "format", "json") == "json":
        return command_config_show(args)
    return command_config_show(args)


def command_templates_generate(args: argparse.Namespace) -> int:
    db_path = env_db_path(args.db_path)
    ensure_endpoint_seeded(db_path, args.app)
    metadata = json.loads(require_native("templates generate", native_template_spec)(db_path, args.endpoint))
    if args.format == "xlsx":
        data = generate_xlsx_template(args.endpoint, metadata["dimension_fields"], metadata["kpi_fields"])
    else:
        data = generate_csv_template(args.endpoint, metadata["dimension_fields"], metadata["kpi_fields"])
    output = Path(args.output) if args.output else Path(f"jin-template{'.xlsx' if args.format == 'xlsx' else '.csv'}")
    output.write_bytes(data)
    payload = {"ok": True, "output": str(output), "format": args.format, "endpoint": args.endpoint}
    if getattr(args, "format_output", "text") == "json":
        return print_json(payload)
    print(f"Wrote {output}")
    return 0


def command_references_import(args: argparse.Namespace) -> int:
    db_path = env_db_path(args.db_path)
    ensure_endpoint_seeded(db_path, args.app)
    content = Path(args.file).read_bytes()
    rows = parse_xlsx_upload(content) if args.file.endswith(".xlsx") else parse_csv_upload(content)
    detail = json.loads(require_native("references import", native_get_endpoint_detail)(db_path, args.endpoint))
    fields = (detail.get("schema_contract") or {}).get("fields") or (detail.get("endpoint") or {}).get("fields") or []
    field_names = {field["name"] for field in fields if isinstance(field, dict) and field.get("name")}
    validation = json.loads(
        require_native("references import", native_validate_reference_rows)(
            json.dumps(sorted(field_names)),
            json.dumps(rows),
            None,
        )
    )
    dimensions = validation["dimension_fields"]
    kpis = validation["kpi_fields"]
    normalized = validation["normalized"]
    warnings = validation["warnings"]
    payload = json.loads(
        require_native("references import", native_import_reference_rows)(
            db_path,
            args.endpoint,
            json.dumps(dimensions),
            json.dumps(kpis),
            json.dumps(normalized),
            "cli",
        )
    )
    payload["warnings"] = warnings
    return print_json(payload)


def command_references_validate(args: argparse.Namespace) -> int:
    db_path = env_db_path(args.db_path)
    ensure_endpoint_seeded(db_path, args.app)
    content = Path(args.file).read_bytes()
    rows = parse_xlsx_upload(content) if args.file.endswith(".xlsx") else parse_csv_upload(content)
    detail = json.loads(require_native("references validate", native_get_endpoint_detail)(db_path, args.endpoint))
    fields = (detail.get("schema_contract") or {}).get("fields") or (detail.get("endpoint") or {}).get("fields") or []
    field_names = {field["name"] for field in fields if isinstance(field, dict) and field.get("name")}
    validation = json.loads(
        require_native("references validate", native_validate_reference_rows)(
            json.dumps(sorted(field_names)),
            json.dumps(rows),
            None,
        )
    )
    dimensions = validation["dimension_fields"]
    kpis = validation["kpi_fields"]
    normalized = validation["normalized"]
    warnings = validation["warnings"]
    payload = {
        "ok": True,
        "rows": len(rows),
        "valid_rows": len(normalized),
        "dimensions": dimensions,
        "kpis": kpis,
        "warnings": warnings,
    }
    if getattr(args, "format", "table") == "json":
        return print_json(payload)
    table = [
        ["field", "value"],
        ["rows", str(payload["rows"])],
        ["valid_rows", str(payload["valid_rows"])],
        ["dimensions", ",".join(dimensions)],
        ["kpis", ",".join(kpis)],
        ["warnings", "; ".join(warnings) or "none"],
    ]
    print(render_text_table(table))
    return 0


def command_references_export(args: argparse.Namespace) -> int:
    db_path = env_db_path(args.db_path)
    payload = json.loads(require_native("references export", native_references_export)(db_path, args.endpoint))
    if args.format == "json":
        return print_json(payload)
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=list(payload[0].keys()) if payload else ["grain_key", "kpi_field", "expected_value", "tolerance_pct", "upload_source", "uploaded_at"])
    writer.writeheader()
    writer.writerows(payload)
    print(output.getvalue().rstrip())
    return 0


def command_issues_list(args: argparse.Namespace) -> int:
    db_path = env_db_path(args.db_path)
    payload = json.loads(require_native("issues list", native_issues_list)(db_path, args.endpoint, args.status))
    if args.format == "json":
        return print_json(payload)
    table = [["id", "status", "endpoint", "kpi", "change"]]
    for item in payload:
        table.append([str(item["id"]), item["status"], item["endpoint_path"], item["kpi_field"], f'{float(item["pct_change"] or 0):.2f}%'])
    print(render_text_table(table))
    return 0


def command_issues_update(args: argparse.Namespace) -> int:
    db_path = env_db_path(args.db_path)
    native_update = require_native("issues update", native_issues_update)
    update_payload: str
    try:
        update_payload = native_update(
            db_path,
            int(args.id),
            args.action,
            args.note,
            args.owner,
            args.resolution_reason,
            None,
        )
    except TypeError:
        # Compatibility fallback for older native builds that do not support owner.
        update_payload = native_update(
            db_path,
            int(args.id),
            args.action,
            args.note,
            args.resolution_reason,
            None,
        )
    payload = json.loads(
        update_payload
    )
    if getattr(args, "format", "text") == "json":
        return print_json(payload)
    print(f"Updated issue {args.id} -> {args.action}")
    return 0


def command_watches_list(args: argparse.Namespace) -> int:
    if not args.app:
        raise RuntimeError("--app is required for watch commands")
    records = sync_app_to_db(args.app, env_db_path(args.db_path))
    watched = [record for record in records if (record["watch_config"] or {}).get("schedule")]
    payload = [
        {
            "endpoint": record["endpoint_path"],
            "method": record["http_method"],
            "schedule": record["watch_config"].get("schedule"),
            "threshold": record["watch_config"].get("threshold"),
        }
        for record in watched
    ]
    if getattr(args, "format", "table") == "json":
        return print_json(payload)
    table = [["endpoint", "method", "schedule", "threshold"]]
    for item in payload:
        table.append([item["endpoint"], item["method"], str(item["schedule"]), str(item["threshold"] or "")])
    print(render_text_table(table))
    return 0


async def run_watch_endpoint(record: dict[str, Any]) -> Any:
    watch_config = record.get("watch_config") or {}
    default_params = watch_config.get("default_params") or {}
    kwargs: dict[str, Any] = {}
    kwargs.update(default_params.get("path_params") or {})
    kwargs.update(default_params.get("query_params") or {})
    body = default_params.get("body") or {}
    endpoint_callable = record["endpoint_callable"]
    if body and "payload" in endpoint_callable.__code__.co_varnames:
        kwargs["payload"] = body
    response = endpoint_callable(**kwargs)
    if inspect.isawaitable(response):
        response = await response
    return response.model_dump() if hasattr(response, "model_dump") else response


def command_watches_run(args: argparse.Namespace) -> int:
    if not args.app:
        raise RuntimeError("--app is required for watch commands")
    records = sync_app_to_db(args.app, env_db_path(args.db_path))
    target = next((record for record in records if record["endpoint_path"] == args.endpoint), None)
    if target is None:
        raise RuntimeError(f"Watch endpoint not found: {args.endpoint}")
    if not (target["watch_config"] or {}).get("schedule"):
        raise RuntimeError(f"Endpoint is not decorated with @watch: {args.endpoint}")
    import asyncio

    result = asyncio.run(run_watch_endpoint(target))
    return print_json({"ok": True, "endpoint_path": args.endpoint, "result": result})


def command_serve(args: argparse.Namespace) -> int:
    if not args.app:
        raise RuntimeError("--app is required for serve")
    cmd = [
        "uvicorn",
        args.app,
        "--host",
        args.host,
        "--port",
        str(args.port),
    ]
    if args.reload:
        cmd.append("--reload")
    return subprocess.call(cmd)
