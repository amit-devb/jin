from __future__ import annotations

import argparse
import os
import traceback

from .cli_support import (
    command_benchmark_install,
    command_auth_rotate,
    command_auth_status,
    command_ci_check,
    command_completion,
    command_config_set,
    command_config_show,
    command_doctor,
    command_init_check,
    command_endpoints_list,
    command_env_check,
    command_env_set,
    command_init,
    command_issues_list,
    command_issues_update,
    command_open,
    command_patch_fastapi,
    command_quickstart,
    command_references_validate,
    command_references_export,
    command_references_import,
    command_report_summary,
    command_serve,
    command_setup,
    command_status,
    command_templates_generate,
    command_urls,
    command_verify,
    command_watches_list,
    command_watches_run,
    load_local_env,
)
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Jin command line interface.")
    parser.add_argument("--debug", action="store_true", help="Show full tracebacks for CLI failures.")
    subparsers = parser.add_subparsers(dest="command")

    check_parser = subparsers.add_parser(
        "check",
        help="Guided readiness check (FastAPI discovery + local Jin setup).",
    )
    check_parser.add_argument("--project-name")
    check_parser.add_argument("--db-path")
    check_parser.add_argument("--app", help="FastAPI app import path, e.g. package.module:app")
    check_parser.add_argument("--env-file", default=".env")
    check_parser.add_argument("--format", choices=["table", "json"], default="table")
    check_parser.set_defaults(handler=command_init_check)

    init_parser = subparsers.add_parser("init", help="Create starter Jin environment settings.")
    init_parser.add_argument("--project-name")
    init_parser.add_argument("--db-path")
    init_parser.add_argument("--app", help="FastAPI app import path, e.g. package.module:app")
    init_parser.add_argument("--serve-check", action="store_true", help="Check whether the app appears to have Jin mounted.")
    init_parser.add_argument("--env-file", default=".env")
    init_parser.add_argument("--format", choices=["table", "json"], default="table")
    init_parser.add_argument("--write", action="store_true", help="Write the generated config to .env.")
    init_parser.add_argument("--force", action="store_true", help="Overwrite .env when used with --write.")
    init_parser.add_argument(
        "--check",
        action="store_true",
        help="Read-only readiness check for FastAPI + Jin with guided next steps.",
    )
    init_parser.add_argument("--auth", action=argparse.BooleanOptionalAction, default=True)
    init_parser.add_argument("--interactive", action="store_true", help="Prompt for setup values instead of relying only on flags.")
    init_parser.add_argument("--open", action="store_true", help="Print the local console URLs after setup.")
    init_parser.set_defaults(handler=command_init)

    quickstart_parser = subparsers.add_parser("quickstart", help="Run the easiest first-time Jin setup flow.")
    quickstart_parser.add_argument("--project-name")
    quickstart_parser.add_argument("--db-path")
    quickstart_parser.add_argument("--app", required=True, help="FastAPI app import path, e.g. package.module:app")
    quickstart_parser.add_argument("--env-file", default=".env")
    quickstart_parser.add_argument("--write", action="store_true", help="Write the generated config to .env.")
    quickstart_parser.add_argument("--force", action="store_true", help="Overwrite .env when used with --write.")
    quickstart_parser.add_argument("--auth", action=argparse.BooleanOptionalAction, default=True)
    quickstart_parser.add_argument("--interactive", action="store_true", help="Prompt for setup values instead of relying only on flags.")
    quickstart_parser.add_argument("--open", action="store_true", help="Print the local console URLs after setup.")
    quickstart_parser.set_defaults(handler=command_quickstart)

    setup_parser = subparsers.add_parser("setup", help="Run the one-command Jin setup flow for FastAPI.")
    setup_parser.add_argument("app_file", nargs="?", help="FastAPI module in dot notation, for example app.main")
    setup_parser.add_argument("--app-var", help="FastAPI variable name. Auto-detected when omitted.")
    setup_parser.add_argument("--project-name")
    setup_parser.add_argument("--db-path", default="./jin.duckdb")
    setup_parser.add_argument("--env-file", default=".env")
    setup_parser.add_argument("--global-threshold", type=float, default=10.0)
    setup_parser.add_argument("--no-auth", action="store_true", help="Skip auth rotation and leave auth disabled in .env.")
    setup_parser.add_argument("--no-open", action="store_true", help="Skip printing local URLs after setup.")
    setup_parser.set_defaults(handler=command_setup)

    open_parser = subparsers.add_parser("open", help="Print the URL to open for the Jin console.")
    open_parser.add_argument("--host", default="127.0.0.1")
    open_parser.add_argument("--port", type=int, default=8000)
    open_parser.add_argument("--scheme", default="http")
    open_parser.add_argument("--path", default="/jin")
    open_parser.add_argument("--format", choices=["text", "json"], default="text")
    open_parser.add_argument("--launch", action="store_true", help="Open the URL in your default browser.")
    open_parser.set_defaults(handler=command_open)

    patch_parser = subparsers.add_parser("patch", help="Apply small Jin source-code integrations.")
    patch_subparsers = patch_parser.add_subparsers(dest="patch_command")
    patch_fastapi = patch_subparsers.add_parser("fastapi", help="Insert Jin middleware into a FastAPI app module.")
    patch_fastapi.add_argument("--app-file", help="FastAPI module in dot notation, for example app.main. Auto-detected when omitted.")
    patch_fastapi.add_argument("--app-var", help="FastAPI variable name to patch. Auto-detected when omitted.")
    patch_fastapi.add_argument("--db-path", default="./jin.duckdb")
    patch_fastapi.add_argument("--global-threshold", type=float, default=10.0)
    patch_fastapi.add_argument("--check", action="store_true", help="Only check whether Jin middleware is already present.")
    patch_fastapi.add_argument("--dry-run", action="store_true", help="Show the patch without writing the file.")
    patch_fastapi.add_argument("--undo", action="store_true", help="Remove a previously added Jin middleware patch.")
    patch_fastapi.set_defaults(handler=command_patch_fastapi)

    completion_parser = subparsers.add_parser("completion", help="Print shell completion helpers.")
    completion_parser.add_argument("shell", choices=["bash", "zsh"])
    completion_parser.set_defaults(handler=command_completion)

    status_parser = subparsers.add_parser("status", help="Show one combined project status snapshot.")
    status_parser.add_argument("--db-path")
    status_parser.add_argument("--env-file", default=".env")
    status_parser.add_argument("--project-name")
    status_parser.add_argument("--app", help="FastAPI app import path, e.g. package.module:app")
    status_parser.add_argument("--format", choices=["table", "json"], default="table")
    status_parser.set_defaults(handler=command_status)

    env_parser = subparsers.add_parser("env", help="Inspect project-local environment setup.")
    env_subparsers = env_parser.add_subparsers(dest="env_command")
    env_check = env_subparsers.add_parser("check", help="Show env, DB, and auth setup status.")
    env_check.add_argument("--env-file", default=".env")
    env_check.add_argument("--db-path")
    env_check.add_argument("--project-name")
    env_check.add_argument("--format", choices=["table", "json"], default="table")
    env_check.set_defaults(handler=command_env_check)
    env_set = env_subparsers.add_parser("set", help="Write or update project-local Jin env settings.")
    env_set.add_argument("--env-file", default=".env")
    env_set.add_argument("--project-name")
    env_set.add_argument("--db-path")
    env_set.add_argument("--log-level")
    env_set.add_argument("--auth-enabled", action=argparse.BooleanOptionalAction, default=None)
    env_set.add_argument("--username")
    env_set.add_argument("--session-ttl-minutes", type=int)
    env_set.add_argument("--format", choices=["table", "json"], default="table")
    env_set.set_defaults(handler=command_env_set)

    urls_parser = subparsers.add_parser("urls", help="Print the local URLs you can open for Jin.")
    urls_parser.add_argument("--host", default="127.0.0.1")
    urls_parser.add_argument("--port", type=int, default=8000)
    urls_parser.add_argument("--scheme", default="http")
    urls_parser.add_argument("--format", choices=["table", "json"], default="table")
    urls_parser.add_argument(
        "--launch",
        choices=["console", "login", "root"],
        help="Open one local Jin URL in your default browser.",
    )
    urls_parser.set_defaults(handler=command_urls)

    auth_parser = subparsers.add_parser("auth", help="Generate or rotate local auth credentials.")
    auth_subparsers = auth_parser.add_subparsers(dest="auth_command")
    rotate_parser = auth_subparsers.add_parser("rotate", help="Generate a password hash and session secret.")
    rotate_parser.add_argument("--password")
    rotate_parser.add_argument("--iterations", type=int, default=120000)
    rotate_parser.add_argument("--env-file", default=".env")
    rotate_parser.add_argument("--write-env", action="store_true", help="Write generated auth values directly into the env file.")
    rotate_parser.add_argument("--force", action="store_true", help="Allow auth values to overwrite existing env keys.")
    rotate_parser.set_defaults(handler=command_auth_rotate)
    status_parser = auth_subparsers.add_parser("status", help="Inspect current auth configuration.")
    status_parser.add_argument("--format", choices=["table", "json"], default="table")
    status_parser.set_defaults(handler=command_auth_status)

    for name, help_text, handler in [
        ("doctor", "Check project-local Jin setup.", command_doctor),
        ("verify", "Run a lightweight Jin project verification.", command_verify),
    ]:
        cmd = subparsers.add_parser(name, help=help_text)
        cmd.add_argument("--db-path")
        cmd.add_argument("--env-file", default=".env")
        cmd.add_argument("--project-name")
        cmd.add_argument("--app", help="FastAPI app import path, e.g. package.module:app")
        cmd.add_argument("--format", choices=["table", "json"], default="table")
        cmd.add_argument("--strict", action="store_true", help="Return a non-zero exit code when checks report warnings or errors.")
        if name == "doctor":
            cmd.add_argument("--fix", action="store_true", help="Apply safe local fixes like creating a starter .env and DuckDB schema.")
            cmd.add_argument("--deep", action="store_true", help="Include deep diagnostics for install, discovery, and runtime readiness.")
        cmd.set_defaults(handler=handler)

    endpoints_parser = subparsers.add_parser("endpoints", help="Inspect discovered APIs.")
    endpoints_subparsers = endpoints_parser.add_subparsers(dest="endpoints_command")
    endpoints_list = endpoints_subparsers.add_parser("list", help="List tracked APIs.")
    endpoints_list.add_argument("--db-path")
    endpoints_list.add_argument("--app", help="FastAPI app import path for route discovery.")
    endpoints_list.add_argument("--format", choices=["table", "json"], default="table")
    endpoints_list.set_defaults(handler=command_endpoints_list)

    config_parser = subparsers.add_parser("config", help="Inspect or update endpoint configuration.")
    config_subparsers = config_parser.add_subparsers(dest="config_command")
    config_show = config_subparsers.add_parser("show", help="Show config for one endpoint.")
    config_show.add_argument("--endpoint", required=True)
    config_show.add_argument("--db-path")
    config_show.add_argument("--app")
    config_show.set_defaults(handler=command_config_show)
    config_set = config_subparsers.add_parser("set", help="Set config for one endpoint.")
    config_set.add_argument("--endpoint", required=True)
    config_set.add_argument("--dimensions")
    config_set.add_argument("--kpis")
    config_set.add_argument("--active-tolerance", default="normal")
    config_set.add_argument("--relaxed", type=float, default=20.0)
    config_set.add_argument("--normal", type=float, default=10.0)
    config_set.add_argument("--strict", type=float, default=5.0)
    config_set.add_argument("--confirmed", action="store_true", default=True)
    config_set.add_argument("--db-path")
    config_set.add_argument("--app")
    config_set.add_argument("--format", choices=["table", "json"], default="json")
    config_set.set_defaults(handler=command_config_set)

    templates_parser = subparsers.add_parser("templates", help="Generate reference templates.")
    templates_subparsers = templates_parser.add_subparsers(dest="templates_command")
    templates_generate = templates_subparsers.add_parser("generate", help="Generate a CSV or XLSX template.")
    templates_generate.add_argument("--endpoint", required=True)
    templates_generate.add_argument("--format", choices=["csv", "xlsx"], default="csv")
    templates_generate.add_argument("--output")
    templates_generate.add_argument("--db-path")
    templates_generate.add_argument("--app")
    templates_generate.add_argument("--format-output", choices=["text", "json"], default="text")
    templates_generate.set_defaults(handler=command_templates_generate)

    references_parser = subparsers.add_parser("references", help="Import or export reference data.")
    references_subparsers = references_parser.add_subparsers(dest="references_command")
    references_import = references_subparsers.add_parser("import", help="Import reference rows from CSV/XLSX.")
    references_import.add_argument("--endpoint", required=True)
    references_import.add_argument("--file", required=True)
    references_import.add_argument("--db-path")
    references_import.add_argument("--app")
    references_import.set_defaults(handler=command_references_import)
    references_validate = references_subparsers.add_parser("validate", help="Validate reference rows without importing them.")
    references_validate.add_argument("--endpoint", required=True)
    references_validate.add_argument("--file", required=True)
    references_validate.add_argument("--db-path")
    references_validate.add_argument("--app")
    references_validate.add_argument("--format", choices=["table", "json"], default="table")
    references_validate.set_defaults(handler=command_references_validate)
    references_export = references_subparsers.add_parser("export", help="Export references for one endpoint.")
    references_export.add_argument("--endpoint", required=True)
    references_export.add_argument("--format", choices=["json", "csv"], default="json")
    references_export.add_argument("--db-path")
    references_export.set_defaults(handler=command_references_export)

    issues_parser = subparsers.add_parser("issues", help="List and update incidents.")
    issues_subparsers = issues_parser.add_subparsers(dest="issues_command")
    issues_list = issues_subparsers.add_parser("list", help="List issues.")
    issues_list.add_argument("--endpoint")
    issues_list.add_argument("--status")
    issues_list.add_argument("--format", choices=["table", "json"], default="table")
    issues_list.add_argument("--db-path")
    issues_list.set_defaults(handler=command_issues_list)
    issues_update = issues_subparsers.add_parser("update", help="Update one issue.")
    issues_update.add_argument("--id", type=int, required=True)
    issues_update.add_argument("--action", required=True, choices=["active", "acknowledged", "snoozed", "suppressed", "resolved", "reopened"])
    issues_update.add_argument("--note")
    issues_update.add_argument("--owner")
    issues_update.add_argument("--resolution-reason")
    issues_update.add_argument("--db-path")
    issues_update.add_argument("--format", choices=["text", "json"], default="text")
    issues_update.set_defaults(handler=command_issues_update)

    watches_parser = subparsers.add_parser("watches", help="Inspect and run watch-decorated endpoints.")
    watches_subparsers = watches_parser.add_subparsers(dest="watches_command")
    watches_list = watches_subparsers.add_parser("list", help="List watch endpoints from an app.")
    watches_list.add_argument("--app", required=True)
    watches_list.add_argument("--db-path")
    watches_list.add_argument("--format", choices=["table", "json"], default="table")
    watches_list.set_defaults(handler=command_watches_list)
    watches_run = watches_subparsers.add_parser("run", help="Run one watch endpoint immediately.")
    watches_run.add_argument("--app", required=True)
    watches_run.add_argument("--endpoint", required=True)
    watches_run.add_argument("--db-path")
    watches_run.set_defaults(handler=command_watches_run)

    serve_parser = subparsers.add_parser("serve", help="Run a local FastAPI app with Uvicorn.")
    serve_parser.add_argument("--app", required=True)
    serve_parser.add_argument("--host", default="127.0.0.1")
    serve_parser.add_argument("--port", type=int, default=8000)
    serve_parser.add_argument("--reload", action="store_true")
    serve_parser.set_defaults(handler=command_serve)

    report_parser = subparsers.add_parser("report", help="Generate small local Jin reports.")
    report_subparsers = report_parser.add_subparsers(dest="report_command")
    report_summary = report_subparsers.add_parser("summary", help="Show a compact project summary report.")
    report_summary.add_argument("--db-path")
    report_summary.add_argument("--project-name")
    report_summary.add_argument("--format", choices=["table", "json", "markdown"], default="table")
    report_summary.set_defaults(handler=command_report_summary)

    ci_parser = subparsers.add_parser("ci", help="CI-friendly Jin checks.")
    ci_subparsers = ci_parser.add_subparsers(dest="ci_command")
    ci_check = ci_subparsers.add_parser("check", help="Run strict setup and data checks for CI.")
    ci_check.add_argument("--db-path")
    ci_check.add_argument("--env-file", default=".env")
    ci_check.add_argument("--project-name")
    ci_check.add_argument("--app")
    ci_check.add_argument("--format", choices=["table", "json"], default="table")
    ci_check.add_argument("--fail-on-issues", action="store_true", help="Fail when active issues exist.")
    ci_check.set_defaults(handler=command_ci_check)

    benchmark_parser = subparsers.add_parser("benchmark", help="Run local Jin benchmarks.")
    benchmark_subparsers = benchmark_parser.add_subparsers(dest="benchmark_command")
    benchmark_install = benchmark_subparsers.add_parser(
        "install",
        help="Measure local install time for fast path and optional native-build baseline.",
    )
    benchmark_install.add_argument("--python", default="python3", help="Python executable used to create venvs.")
    benchmark_install.add_argument("--runs", type=int, default=1, help="Number of benchmark runs per mode.")
    benchmark_install.add_argument("--tool", choices=["auto", "uv", "pip"], default="auto")
    benchmark_install.add_argument(
        "--with-deps",
        action="store_true",
        help="Include dependency installation in benchmark timings.",
    )
    benchmark_install.add_argument(
        "--native-baseline",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Include native compile benchmark as legacy baseline approximation.",
    )
    benchmark_install.add_argument("--format", choices=["table", "json"], default="table")
    benchmark_install.add_argument("--keep-temp", action="store_true", help="Keep temp benchmark directories for inspection.")
    benchmark_install.set_defaults(handler=command_benchmark_install)

    return parser


def main(argv: list[str] | None = None) -> int:
    injected_env = load_local_env()
    parser = build_parser()
    args = parser.parse_args(argv)
    handler = getattr(args, "handler", None)
    if handler is None:
        parser.print_help()
        for key, previous_value in injected_env.items():
            if previous_value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = previous_value
        return 1
    try:
        return int(handler(args) or 0)
    except Exception as exc:
        if getattr(args, "debug", False):
            traceback.print_exc()
        else:
            print(f"jin: {exc}")
        return 1
    finally:
        for key, previous_value in injected_env.items():
            if previous_value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = previous_value


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
