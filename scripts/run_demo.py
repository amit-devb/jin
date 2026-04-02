from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path


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

    demo_db_prefix = Path(__file__).resolve().parents[1] / "demo-jin.duckdb"
    print("Resetting demo state before launch.")
    for candidate in demo_db_prefix.parent.glob(demo_db_prefix.name + "*"):
        if candidate.is_file() or candidate.is_symlink():
            candidate.unlink(missing_ok=True)

    print("Starting internal maintainer demo harness at http://127.0.0.1:8000/jin")
    uvicorn.run(module.app, host="127.0.0.1", port=8000, reload=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
