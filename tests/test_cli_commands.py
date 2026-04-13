from __future__ import annotations

import json
from pathlib import Path

import duckdb

from jin.cli import main
import jin.cli_support as cli_support


APP_MODULE = """
from fastapi import FastAPI
from pydantic import BaseModel
from jin.watch import watch

class RevenuePayload(BaseModel):
    retailer: str
    period: str
    revenue: float

class WatchPayload(BaseModel):
    order_id: str
    amount: float

app = FastAPI()

@app.get("/api/revenue/{retailer}/{period}", response_model=RevenuePayload)
async def revenue(retailer: str, period: str, value: float = 100.0) -> RevenuePayload:
    return RevenuePayload(retailer=retailer, period=period, revenue=value)

@app.get("/api/watch/{retailer}", response_model=WatchPayload)
@watch(schedule="every 2h", threshold=20, default_params={"path_params": {"retailer": "amazon"}})
async def watched(retailer: str) -> WatchPayload:
    return WatchPayload(order_id=retailer, amount=25.0)
"""


APP_MODULE_WITH_JIN = """
from fastapi import FastAPI
from pydantic import BaseModel
from jin import JinMiddleware

class RevenuePayload(BaseModel):
    retailer: str
    period: str
    revenue: float

app = FastAPI()
app.add_middleware(JinMiddleware, db_path="./jin.duckdb", global_threshold=10.0)

@app.get("/api/revenue/{retailer}/{period}", response_model=RevenuePayload)
async def revenue(retailer: str, period: str, value: float = 100.0) -> RevenuePayload:
    return RevenuePayload(retailer=retailer, period=period, revenue=value)
"""

APP_MODULE_ANNOTATED_ONLY = """
from fastapi import FastAPI
from pydantic import BaseModel

class RevenueRow(BaseModel):
    retailer: str
    revenue: float

app = FastAPI()

@app.get("/api/annotated")
async def annotated() -> list[RevenueRow]:
    return [RevenueRow(retailer="amazon", revenue=100.0)]
"""


FACTORY_APP_MODULE = """
from fastapi import FastAPI

def create_app() -> FastAPI:
    app = FastAPI()

    @app.get("/health")
    async def health():
        return {"ok": True}

    return app
"""


def write_demo_module(tmp_path: Path, monkeypatch) -> str:
    module_path = tmp_path / "demo_cli_app.py"
    module_path.write_text(APP_MODULE)
    monkeypatch.syspath_prepend(str(tmp_path))
    return "demo_cli_app:app"


def write_demo_module_with_jin(tmp_path: Path, monkeypatch) -> str:
    module_path = tmp_path / "demo_cli_jin_app.py"
    module_path.write_text(APP_MODULE_WITH_JIN)
    monkeypatch.syspath_prepend(str(tmp_path))
    return "demo_cli_jin_app:app"


def write_annotated_only_module(tmp_path: Path, monkeypatch) -> str:
    module_path = tmp_path / "demo_cli_annotated_app.py"
    module_path.write_text(APP_MODULE_ANNOTATED_ONLY)
    monkeypatch.syspath_prepend(str(tmp_path))
    return "demo_cli_annotated_app:app"


def test_cli_patch_fastapi_inserts_middleware(tmp_path: Path, monkeypatch, capsys) -> None:
    app_dir = tmp_path / "app"
    app_dir.mkdir()
    target = app_dir / "main.py"
    monkeypatch.chdir(tmp_path)
    target.write_text(
        "\n".join(
            [
                "from fastapi import FastAPI",
                "",
                "app = FastAPI()",
                "",
                "@app.get('/health')",
                "async def health():",
                "    return {'ok': True}",
                "",
            ]
        )
    )
    exit_code = main(
        [
            "patch",
            "fastapi",
            "--app-file",
            "app.main",
            "--db-path",
            "./jin.duckdb",
            "--global-threshold",
            "10.0",
        ]
    )
    output = capsys.readouterr().out
    contents = target.read_text()
    assert exit_code == 0
    assert f"Patched {target}" in output
    assert "from jin import JinMiddleware" in contents
    assert "# jin: begin middleware" in contents
    assert 'app.add_middleware(JinMiddleware, db_path="./jin.duckdb", global_threshold=10.0)' in contents


def test_cli_patch_fastapi_requires_dot_notation_and_helpful_error(capsys) -> None:
    exit_code = main(["patch", "fastapi", "--app-file", "app/main.py"])
    output = capsys.readouterr().out
    assert exit_code == 1
    assert "Use dot notation for --app-file" in output
    assert "--app-file app.main" in output


def test_cli_patch_fastapi_reports_missing_module_path(tmp_path: Path, monkeypatch, capsys) -> None:
    monkeypatch.chdir(tmp_path)
    exit_code = main(["patch", "fastapi", "--app-file", "missing.main"])
    output = capsys.readouterr().out
    assert exit_code == 1
    assert "Could not find a FastAPI module for --app-file 'missing.main'" in output
    assert "Run the command from your project root" in output


def test_cli_patch_fastapi_check_dry_run_and_undo(tmp_path: Path, monkeypatch, capsys) -> None:
    app_dir = tmp_path / "app"
    app_dir.mkdir()
    target = app_dir / "main.py"
    monkeypatch.chdir(tmp_path)
    target.write_text("from fastapi import FastAPI\n\napp = FastAPI()\n")

    assert main(["patch", "fastapi", "--app-file", "app.main", "--check"]) == 1
    assert "not present" in capsys.readouterr().out

    assert main(["patch", "fastapi", "--app-file", "app.main", "--dry-run"]) == 0
    dry_run_output = capsys.readouterr().out
    assert "Patch preview" in dry_run_output
    assert "# jin: begin middleware" in dry_run_output
    assert "JinMiddleware" not in target.read_text()

    assert main(["patch", "fastapi", "--app-file", "app.main"]) == 0
    _ = capsys.readouterr()
    assert main(["patch", "fastapi", "--app-file", "app.main", "--check"]) == 0
    assert "already present" in capsys.readouterr().out

    assert main(["patch", "fastapi", "--app-file", "app.main", "--undo"]) == 0
    undo_output = capsys.readouterr().out
    assert "Removed Jin middleware patch" in undo_output
    assert "JinMiddleware" not in target.read_text()


def test_cli_patch_fastapi_supports_factory_layout(tmp_path: Path, monkeypatch, capsys) -> None:
    app_dir = tmp_path / "app"
    app_dir.mkdir()
    target = app_dir / "main.py"
    monkeypatch.chdir(tmp_path)
    monkeypatch.syspath_prepend(str(tmp_path))
    target.write_text(FACTORY_APP_MODULE)
    exit_code = main(["patch", "fastapi", "--app-file", "app.main"])
    output = capsys.readouterr().out
    contents = target.read_text()
    assert exit_code == 0
    assert "Patched" in output
    assert "# jin: begin middleware" in contents
    assert "app.add_middleware(JinMiddleware" in contents
    assert "return app" in contents


def test_cli_setup_runs_patch_init_and_auth(tmp_path: Path, monkeypatch, capsys) -> None:
    app_dir = tmp_path / "app"
    app_dir.mkdir()
    target = app_dir / "main.py"
    target.write_text(
        "\n".join(
            [
                "from fastapi import FastAPI",
                "",
                "app = FastAPI()",
                "",
                "@app.get('/health')",
                "async def health():",
                "    return {'ok': True}",
                "",
            ]
        )
    )
    monkeypatch.chdir(tmp_path)
    monkeypatch.syspath_prepend(str(tmp_path))
    db_path = tmp_path / "setup.duckdb"
    env_path = tmp_path / ".env"
    exit_code = main(["setup", "app.main", "--db-path", str(db_path), "--env-file", str(env_path)])
    output = capsys.readouterr().out
    content = target.read_text()
    env_content = env_path.read_text()
    assert exit_code == 0
    assert "Jin setup" in output
    assert "Setup complete." in output
    assert "from jin import JinMiddleware" in content
    assert "app.add_middleware(JinMiddleware" in content
    assert "JIN_PASSWORD_HASH=" in env_content
    assert "JIN_SESSION_SECRET=" in env_content
    assert "JIN_AUTH_ENABLED=true" in env_content


def test_cli_setup_auto_discovers_main_module(tmp_path: Path, monkeypatch, capsys) -> None:
    target = tmp_path / "main.py"
    target.write_text("from fastapi import FastAPI\n\napp = FastAPI()\n")
    monkeypatch.chdir(tmp_path)
    monkeypatch.syspath_prepend(str(tmp_path))
    exit_code = main(["setup", "--no-open"])
    output = capsys.readouterr().out
    assert exit_code == 0
    assert "Setup complete." in output
    assert "main:app" in output


def test_cli_init_writes_env_file(tmp_path: Path) -> None:
    env_path = tmp_path / ".env"
    exit_code = main(["init", "--write", "--env-file", str(env_path), "--project-name", "demo-cli"])
    assert exit_code == 0
    content = env_path.read_text()
    assert "JIN_PROJECT_NAME=demo-cli" in content
    assert "JIN_AUTH_ENABLED=true" in content
    assert "JIN_PASSWORD_HASH=" in content


def test_cli_init_interactive_writes_env_file(tmp_path: Path, monkeypatch) -> None:
    env_path = tmp_path / ".env"
    answers = iter(["interactive-demo", "./interactive.duckdb", "", "y", "y"])
    monkeypatch.setattr("builtins.input", lambda _prompt="": next(answers))
    exit_code = main(["init", "--interactive", "--env-file", str(env_path)])
    assert exit_code == 0
    content = env_path.read_text()
    assert "JIN_PROJECT_NAME=interactive-demo" in content
    assert "JIN_DB_PATH=./interactive.duckdb" in content
    assert "JIN_AUTH_ENABLED=true" in content


def test_cli_init_with_app_seeds_db(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    env_path = tmp_path / ".env"
    db_path = tmp_path / "seeded.duckdb"

    exit_code = main(
        [
            "init",
            "--write",
            "--env-file",
            str(env_path),
            "--db-path",
            str(db_path),
            "--app",
            app_path,
        ]
    )
    assert exit_code == 0
    output = capsys.readouterr().out
    assert f"Seeded 2 endpoints from {app_path}" in output
    assert f"Run your app: uvicorn {app_path} --host 127.0.0.1 --port 8000" in output
    assert f"Check setup with: jin doctor --db-path {db_path}" in output
    conn = duckdb.connect(str(db_path))
    try:
        count = conn.execute("SELECT COUNT(*) FROM jin_endpoints").fetchone()[0]
    finally:
        conn.close()
    assert count == 2
    content = env_path.read_text()
    assert f"JIN_DB_PATH={db_path}" in content


def test_cli_init_with_invalid_app_prints_helpful_error(tmp_path: Path, capsys) -> None:
    env_path = tmp_path / ".env"
    exit_code = main(
        [
            "init",
            "--write",
            "--env-file",
            str(env_path),
            "--app",
            "missing.module:app",
        ]
    )
    assert exit_code == 1
    output = capsys.readouterr().out
    assert "Could not import module 'missing.module'" in output
    assert "--app missing.module:app" in output
    assert "use a valid import path" in output


def test_cli_init_check_with_invalid_app_prints_guidance_not_error(tmp_path: Path, capsys) -> None:
    env_path = tmp_path / ".env"
    exit_code = main(
        [
            "init",
            "--check",
            "--env-file",
            str(env_path),
            "--app",
            "missing.module:app",
        ]
    )
    assert exit_code == 0
    output = capsys.readouterr().out
    assert "Jin init check" in output
    assert "Guidance:" in output
    assert "could not be loaded" in output
    assert "jin doctor --deep" in output


def test_cli_init_check_auto_detects_app_and_guides_mounting(tmp_path: Path, monkeypatch, capsys) -> None:
    main_py = tmp_path / "main.py"
    main_py.write_text(
        "\n".join(
            [
                "from fastapi import FastAPI",
                "",
                "app = FastAPI()",
                "",
                "@app.get('/health')",
                "async def health():",
                "    return {'ok': True}",
                "",
            ]
        )
    )
    monkeypatch.chdir(tmp_path)
    monkeypatch.syspath_prepend(str(tmp_path))

    exit_code = main(["init", "--check"])
    assert exit_code == 0
    output = capsys.readouterr().out
    assert "Auto-detected FastAPI app: main:app" in output
    assert "jin_mounted" in output
    assert "Guidance:" in output


def test_cli_init_serve_check_warns_when_jin_not_mounted(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "serve-check.duckdb"
    exit_code = main(["init", "--db-path", str(db_path), "--app", app_path, "--serve-check"])
    assert exit_code == 0
    output = capsys.readouterr().out
    assert "Serve check: Jin is not mounted yet." in output
    assert "Add JinMiddleware to your FastAPI app." in output


def test_cli_init_serve_check_confirms_when_jin_mounted(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module_with_jin(tmp_path, monkeypatch)
    db_path = tmp_path / "serve-check-ok.duckdb"
    exit_code = main(["init", "--db-path", str(db_path), "--app", app_path, "--serve-check"])
    assert exit_code == 0
    output = capsys.readouterr().out
    assert "Serve check: ok" in output
    assert "JinMiddleware is registered." in output


def test_cli_quickstart_runs_setup_and_doctor(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module_with_jin(tmp_path, monkeypatch)
    env_path = tmp_path / ".env"
    db_path = tmp_path / "quickstart.duckdb"
    exit_code = main(
        [
            "quickstart",
            "--write",
            "--env-file",
            str(env_path),
            "--db-path",
            str(db_path),
            "--app",
            app_path,
        ]
    )
    assert exit_code == 0
    output = capsys.readouterr().out
    assert "Jin quickstart" in output
    assert f"Seeded 1 endpoints from {app_path}" in output
    assert "Serve check: ok" in output
    assert "Quick doctor:" in output
    assert "duckdb_schema" in output
    assert "discovered_endpoints" in output


def test_cli_doctor_fix_creates_env_and_db(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    env_path = tmp_path / ".env"
    db_path = tmp_path / "doctor-fix.duckdb"
    exit_code = main(
        [
            "doctor",
            "--fix",
            "--env-file",
            str(env_path),
            "--db-path",
            str(db_path),
            "--project-name",
            "doctor-demo",
            "--app",
            app_path,
        ]
    )
    assert exit_code == 0
    output = capsys.readouterr().out
    assert "Applied fixes:" in output
    assert f"Wrote starter env file at {env_path}" in output
    assert f"Ensured DuckDB schema at {db_path}" in output
    assert "discovered_endpoints" in output
    assert env_path.exists()
    assert db_path.exists()
    content = env_path.read_text()
    assert "JIN_PROJECT_NAME=doctor-demo" in content
    assert f"JIN_DB_PATH={db_path}" in content
    assert "JIN_AUTH_ENABLED=false" in content


def test_cli_env_set_updates_project_env(tmp_path: Path, capsys) -> None:
    env_path = tmp_path / ".env"
    env_path.write_text("JIN_PROJECT_NAME=old\n")
    exit_code = main(
        [
            "env",
            "set",
            "--env-file",
            str(env_path),
            "--project-name",
            "new-name",
            "--db-path",
            str(tmp_path / "demo.duckdb"),
            "--auth-enabled",
            "--username",
            "owner",
        ]
    )
    output = capsys.readouterr().out
    contents = env_path.read_text()
    assert exit_code == 0
    assert f"Updated {env_path}" in output
    assert "JIN_PROJECT_NAME=new-name" in contents
    assert "JIN_DB_PATH=" in contents
    assert "JIN_AUTH_ENABLED=true" in contents
    assert "JIN_USERNAME=owner" in contents


def test_cli_doctor_json_output(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "doctor-json.duckdb"
    exit_code = main(
        [
            "doctor",
            "--db-path",
            str(db_path),
            "--app",
            app_path,
            "--format",
            "json",
        ]
    )
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["checks"]["duckdb_schema"] == "ok"
    assert payload["checks"]["app_import"] == "ok"
    assert payload["checks"]["discovered_endpoints"] == "2"


def test_cli_doctor_deep_json_uses_return_annotation_discovery(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_annotated_only_module(tmp_path, monkeypatch)
    db_path = tmp_path / "doctor-deep.duckdb"
    exit_code = main(
        [
            "doctor",
            "--db-path",
            str(db_path),
            "--app",
            app_path,
            "--deep",
            "--format",
            "json",
        ]
    )
    payload = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert payload["checks"]["app_import"] == "ok"
    assert payload["checks"]["discovered_endpoints"] == "1"
    deep = payload["deep"]
    assert deep["runtime"]["db_exists"] is True
    assert deep["discovery"]["summary"]["total"] == 1
    assert deep["discovery"]["summary"]["ready"] == 1
    assert deep["discovery"]["summary"]["runtime_infer"] == 0
    assert deep["discovery"]["problem_endpoints"] == []


def test_cli_benchmark_install_json_reports_speedup(tmp_path: Path, monkeypatch, capsys) -> None:
    created_dirs: list[Path] = []
    call_state = {"fast": 0, "native": 0}

    def fake_mkdtemp(prefix: str = "") -> str:
        path = tmp_path / f"{prefix}{len(created_dirs) + 1}"
        path.mkdir(parents=True, exist_ok=True)
        created_dirs.append(path)
        return str(path)

    def fake_fast(**_kwargs):
        call_state["fast"] += 1
        return {"tool": "uv", "install_seconds": 6.0}

    def fake_native(**_kwargs):
        call_state["native"] += 1
        return {"available": True, "reason": None, "native_compile_seconds": 60.0}

    monkeypatch.setattr(cli_support.tempfile, "mkdtemp", fake_mkdtemp)
    monkeypatch.setattr(cli_support, "_benchmark_fast_install_once", fake_fast)
    monkeypatch.setattr(cli_support, "_benchmark_native_baseline_once", fake_native)
    monkeypatch.setattr(cli_support.shutil, "rmtree", lambda *_args, **_kwargs: None)

    exit_code = main(["benchmark", "install", "--tool", "uv", "--runs", "2", "--format", "json"])
    assert exit_code == 0
    payload = json.loads(capsys.readouterr().out)

    assert payload["tool"] == "uv"
    assert payload["runs"] == 2
    assert payload["fast_path"]["avg_install_seconds"] == 6.0
    assert payload["legacy_native_baseline"]["avg_native_compile_seconds"] == 60.0
    assert payload["estimated_reduction_pct_vs_native"] == 90.0
    assert payload["estimated_speedup_x_vs_native"] == 10.0
    assert call_state["fast"] == 2
    assert call_state["native"] == 2


def test_cli_benchmark_install_without_native_baseline(tmp_path: Path, monkeypatch, capsys) -> None:
    run_calls = {"fast": 0, "native": 0}

    def fake_mkdtemp(prefix: str = "") -> str:
        path = tmp_path / f"{prefix}single"
        path.mkdir(parents=True, exist_ok=True)
        return str(path)

    def fake_fast(**_kwargs):
        run_calls["fast"] += 1
        return {"tool": "pip", "install_seconds": 3.5}

    def fake_native(**_kwargs):
        run_calls["native"] += 1
        return {"available": True, "reason": None, "native_compile_seconds": 10.0}

    monkeypatch.setattr(cli_support.tempfile, "mkdtemp", fake_mkdtemp)
    monkeypatch.setattr(cli_support, "_benchmark_fast_install_once", fake_fast)
    monkeypatch.setattr(cli_support, "_benchmark_native_baseline_once", fake_native)
    monkeypatch.setattr(cli_support.shutil, "rmtree", lambda *_args, **_kwargs: None)

    exit_code = main(
        ["benchmark", "install", "--tool", "pip", "--runs", "1", "--no-native-baseline", "--format", "table"]
    )
    assert exit_code == 0
    output = capsys.readouterr().out
    assert "Install benchmark" in output
    assert "Fast path runs:" in output
    assert "Native baseline runs:" not in output
    assert run_calls["fast"] == 1
    assert run_calls["native"] == 0


def test_cli_report_summary_and_ci_check_json(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "report-ci.duckdb"

    assert main(["endpoints", "list", "--app", app_path, "--db-path", str(db_path)]) == 0
    _ = capsys.readouterr()

    assert main(["report", "summary", "--db-path", str(db_path), "--format", "json"]) == 0
    report_payload = json.loads(capsys.readouterr().out)
    assert report_payload["endpoints"] == 2
    assert report_payload["active_issues"] == 0

    assert main(["ci", "check", "--app", app_path, "--db-path", str(db_path), "--format", "json"]) == 0
    ci_payload = json.loads(capsys.readouterr().out)
    assert ci_payload["endpoints"] == 2
    assert ci_payload["passed"] is True


def test_cli_doctor_strict_fails_for_unsafe_auth(monkeypatch, capsys) -> None:
    monkeypatch.setenv("JIN_AUTH_ENABLED", "true")
    monkeypatch.setenv("JIN_USERNAME", "operator")
    monkeypatch.setenv("JIN_PASSWORD", "change-me")
    monkeypatch.delenv("JIN_PASSWORD_HASH", raising=False)
    monkeypatch.delenv("JIN_SESSION_SECRET", raising=False)
    exit_code = main(["doctor", "--strict"])
    output = capsys.readouterr().out
    assert exit_code == 1
    assert "Strict mode failures:" in output
    assert "auth:" in output


def test_cli_verify_strict_fails_when_no_endpoints(tmp_path: Path, capsys) -> None:
    db_path = tmp_path / "verify-strict.duckdb"
    exit_code = main(["verify", "--db-path", str(db_path), "--strict", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 1
    assert payload["strict_failed"] is True


def test_cli_endpoints_list_and_watches_list(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "cli.duckdb"

    assert main(["endpoints", "list", "--app", app_path, "--db-path", str(db_path)]) == 0
    endpoint_output = capsys.readouterr().out
    assert "/api/revenue/{retailer}/{period}" in endpoint_output
    assert "/api/watch/{retailer}" in endpoint_output

    assert main(["watches", "list", "--app", app_path, "--db-path", str(db_path)]) == 0
    watch_output = capsys.readouterr().out
    assert "/api/watch/{retailer}" in watch_output
    assert "every 2h" in watch_output


def test_cli_endpoints_and_watches_list_json(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "cli-json.duckdb"

    assert main(["endpoints", "list", "--app", app_path, "--db-path", str(db_path), "--format", "json"]) == 0
    endpoint_output = json.loads(capsys.readouterr().out)
    assert endpoint_output[0]["endpoint"].startswith("/api/")

    assert main(["watches", "list", "--app", app_path, "--db-path", str(db_path), "--format", "json"]) == 0
    watch_output = json.loads(capsys.readouterr().out)
    assert watch_output[0]["endpoint"] == "/api/watch/{retailer}"
    assert watch_output[0]["schedule"] == "every 2h"


def test_cli_status_and_reference_validate(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "status.duckdb"
    csv_path = tmp_path / "refs.csv"
    csv_path.write_text(
        'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_revenue,tolerance_pct\n'
        '"/api/revenue/{retailer}/{period}","retailer,period","revenue",amazon,YTD,120,10\n'
    )

    assert main(["status", "--app", app_path, "--db-path", str(db_path), "--format", "json"]) == 0
    status_payload = json.loads(capsys.readouterr().out)
    assert status_payload["metrics"]["endpoints"] == 2
    assert status_payload["metrics"]["watches"] == 1

    assert (
        main(
            [
                "references",
                "validate",
                "--app",
                app_path,
                "--db-path",
                str(db_path),
                "--endpoint",
                "/api/revenue/{retailer}/{period}",
                "--file",
                str(csv_path),
                "--format",
                "json",
            ]
        )
        == 0
    )
    validate_payload = json.loads(capsys.readouterr().out)
    assert validate_payload["rows"] == 1
    assert validate_payload["valid_rows"] == 1


def test_cli_config_set_and_show(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "config.duckdb"

    exit_code = main(
        [
            "config",
            "set",
            "--app",
            app_path,
            "--db-path",
            str(db_path),
            "--endpoint",
            "/api/revenue/{retailer}/{period}",
            "--dimensions",
            "retailer,period",
            "--kpis",
            "revenue",
            "--normal",
            "12",
        ]
    )
    assert exit_code == 0
    output = capsys.readouterr().out
    assert '"tolerance_pct": 12.0' in output
    assert '"revenue"' in output


def test_cli_templates_generate_json_and_issue_update_json(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "template-json.duckdb"
    output_path = tmp_path / "template.csv"

    assert (
        main(
            [
                "templates",
                "generate",
                "--app",
                app_path,
                "--db-path",
                str(db_path),
                "--endpoint",
                "/api/revenue/{retailer}/{period}",
                "--format",
                "csv",
                "--output",
                str(output_path),
                "--format-output",
                "json",
            ]
        )
        == 0
    )
    template_payload = json.loads(capsys.readouterr().out)
    assert template_payload["ok"] is True
    assert template_payload["output"] == str(output_path)
    assert output_path.exists()

    conn = duckdb.connect(str(db_path))
    try:
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
              reviewed_at TIMESTAMP,
              note TEXT,
              ai_explanation TEXT,
              impact DOUBLE DEFAULT 0.0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jin_incident_state (
              anomaly_id BIGINT PRIMARY KEY,
              incident_status TEXT,
              note TEXT,
              owner TEXT,
              resolution_reason TEXT,
              snoozed_until TIMESTAMP,
              suppressed_until TIMESTAMP,
              updated_at TIMESTAMP
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
        conn.execute(
            """
            INSERT INTO jin_anomalies (
                id, endpoint_path, grain_key, kpi_field, expected_value, actual_value, pct_change, detection_method, detected_at, resolved_at, is_active, ai_explanation, impact
            ) VALUES (7, '/api/revenue/{retailer}/{period}', 'grain', 'revenue', 100, 150, 50, 'threshold', now(), NULL, true, 'flagged', 0.0)
            """
        )
    finally:
        conn.close()

    assert main(["issues", "update", "--db-path", str(db_path), "--id", "7", "--action", "acknowledged", "--format", "json"]) == 0
    issue_payload = json.loads(capsys.readouterr().out)
    assert issue_payload["ok"] is True
    assert issue_payload["id"] == 7
    assert issue_payload["action"] == "acknowledged"


def test_cli_references_import_and_export(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "refs.duckdb"
    csv_path = tmp_path / "refs.csv"
    csv_path.write_text(
        'endpoint,dimension_fields,kpi_fields,grain_retailer,grain_period,expected_revenue,tolerance_pct\n'
        '"/api/revenue/{retailer}/{period}","retailer,period","revenue",amazon,YTD,120,10\n'
    )

    assert main(["endpoints", "list", "--app", app_path, "--db-path", str(db_path)]) == 0
    capsys.readouterr()
    assert (
        main(
            [
                "references",
                "import",
                "--app",
                app_path,
                "--db-path",
                str(db_path),
                "--endpoint",
                "/api/revenue/{retailer}/{period}",
                "--file",
                str(csv_path),
            ]
        )
        == 0
    )
    import_output = capsys.readouterr().out
    assert '"imported": 1' in import_output

    assert (
        main(
            [
                "references",
                "export",
                "--db-path",
                str(db_path),
                "--endpoint",
                "/api/revenue/{retailer}/{period}",
                "--format",
                "json",
            ]
        )
        == 0
    )
    export_output = capsys.readouterr().out
    assert '"expected_value": 120.0' in export_output


def test_cli_issues_list_and_update(tmp_path: Path, capsys) -> None:
    db_path = tmp_path / "issues.duckdb"
    conn = duckdb.connect(str(db_path))
    try:
        conn.execute(
            """
            CREATE TABLE jin_anomalies (
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
              reviewed_at TIMESTAMP,
              note TEXT,
              ai_explanation TEXT,
              impact DOUBLE DEFAULT 0.0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE jin_incident_state (
              anomaly_id BIGINT PRIMARY KEY,
              incident_status TEXT,
              note TEXT,
              owner TEXT,
              resolution_reason TEXT,
              snoozed_until TIMESTAMP,
              suppressed_until TIMESTAMP,
              updated_at TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE jin_incident_events (
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
        conn.execute(
            """
            INSERT INTO jin_anomalies (
                id, endpoint_path, grain_key, kpi_field, expected_value, actual_value, pct_change, detection_method, detected_at, resolved_at, is_active, ai_explanation, impact
            ) VALUES (1, '/api/revenue/{retailer}/{period}', 'grain', 'revenue', 100, 150, 50, 'threshold', now(), NULL, true, 'flagged', 0.0)
            """
        )
    finally:
        conn.close()

    assert main(["issues", "list", "--db-path", str(db_path)]) == 0
    listed = capsys.readouterr().out
    assert "/api/revenue/{retailer}/{period}" in listed

    assert main(["issues", "update", "--db-path", str(db_path), "--id", "1", "--action", "acknowledged", "--note", "seen"]) == 0
    updated = capsys.readouterr().out
    assert "Updated issue 1 -> acknowledged" in updated


def test_cli_doctor_and_verify(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "doctor.duckdb"

    assert main(["doctor", "--app", app_path, "--db-path", str(db_path)]) == 0
    doctor_output = capsys.readouterr().out
    assert "duckdb_schema" in doctor_output
    assert "discovered_endpoints" in doctor_output

    assert main(["verify", "--app", app_path, "--db-path", str(db_path)]) == 0
    verify_output = capsys.readouterr().out
    assert "endpoints" in verify_output


def test_cli_watch_run_and_serve(tmp_path: Path, monkeypatch, capsys) -> None:
    app_path = write_demo_module(tmp_path, monkeypatch)
    db_path = tmp_path / "watch.duckdb"

    assert main(["watches", "run", "--app", app_path, "--db-path", str(db_path), "--endpoint", "/api/watch/{retailer}"]) == 0
    run_output = capsys.readouterr().out
    assert '"amount": 25.0' in run_output

    called: dict[str, object] = {}

    def fake_call(cmd):
        called["cmd"] = cmd
        return 0

    monkeypatch.setattr("jin.cli_support.subprocess.call", fake_call)
    assert main(["serve", "--app", app_path, "--port", "9001"]) == 0
    assert called["cmd"] == ["uvicorn", app_path, "--host", "127.0.0.1", "--port", "9001"]
