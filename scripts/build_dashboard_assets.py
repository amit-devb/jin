from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_SRC = ROOT / "frontend" / "src"
STATIC_DIR = ROOT / "python" / "jin" / "static"
GENERATED_STATIC_DIR = STATIC_DIR / "generated"
TSCONFIG = ROOT / "frontend" / "tsconfig.json"
NODE_BIN = ROOT / "node_modules" / ".bin"


def build_dashboard_assets() -> None:
    GENERATED_STATIC_DIR.mkdir(parents=True, exist_ok=True)

    css_source = FRONTEND_SRC / "dashboard.css"
    js_entry = FRONTEND_SRC / "dashboard" / "index.ts"
    subprocess.run(
        [str(NODE_BIN / "tsc"), "--project", str(TSCONFIG)],
        check=True,
        cwd=ROOT,
    )
    subprocess.run(
        [
            str(NODE_BIN / "esbuild"),
            str(js_entry),
            "--bundle",
            "--format=iife",
            "--target=es2021",
            "--minify",
            f"--outfile={GENERATED_STATIC_DIR / 'dashboard.js'}",
        ],
        check=True,
        cwd=ROOT,
    )
    subprocess.run(
        [
            str(NODE_BIN / "esbuild"),
            str(css_source),
            "--minify",
            f"--outfile={GENERATED_STATIC_DIR / 'dashboard.css'}",
        ],
        check=True,
        cwd=ROOT,
    )


if __name__ == "__main__":
    build_dashboard_assets()
