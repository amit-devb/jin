from __future__ import annotations

import importlib.util
import os
import socket
import sys
from pathlib import Path


def can_bind(host: str, port: int) -> tuple[bool, str | None]:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind((host, port))
        return True, None
    except OSError as exc:
        return False, str(exc)


def main() -> int:
    try:
        import uvicorn
    except ModuleNotFoundError:
        print(
            "uvicorn is not installed in the current environment.\n"
            "Install the dev dependencies with `make develop` or install uvicorn directly with:\n"
            "  uv pip install --python .venv/bin/python 'uvicorn>=0.30'",
            file=sys.stderr,
        )
        return 1

    app_path = Path(__file__).resolve().parents[1] / "examples" / "fastapi_demo" / "app.py"
    spec = importlib.util.spec_from_file_location("jin_demo_app", app_path)
    if spec is None or spec.loader is None:
        print(f"Unable to load demo app from {app_path}", file=sys.stderr)
        return 1

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    os.environ.setdefault("JIN_DISABLE_NATIVE_CONFIG_LOAD", "1")
    spec.loader.exec_module(module)

    host = os.getenv("JIN_DEMO_HOST", "127.0.0.1").strip() or "127.0.0.1"
    try:
        port = int(os.getenv("JIN_DEMO_PORT", "8080"))
    except ValueError:
        port = 8080

    ok, error = can_bind(host, port)
    if not ok:
        print(
            f"Unable to bind the demo server on {host}:{port}: {error}\n"
            "Try a different port via `JIN_DEMO_PORT=8000 make demo-run`, or stop the process using that port.",
            file=sys.stderr,
        )
        return 1

    print(f"Starting internal maintainer demo harness at http://{host}:{port}/jin")
    uvicorn.run(module.app, host=host, port=port, reload=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
