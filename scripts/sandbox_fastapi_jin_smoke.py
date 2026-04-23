from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def _pick_free_port() -> int:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    _host, port = sock.getsockname()
    sock.close()
    return int(port)


def _wait_for_http_ok(url: str, *, timeout_s: float = 25.0) -> None:
    import httpx

    started = time.monotonic()
    last_error: str | None = None
    while True:
        try:
            response = httpx.get(url, timeout=2.0)
            if response.status_code < 500:
                return
            last_error = f"status={response.status_code} body={response.text[:200]}"
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
        if time.monotonic() - started > timeout_s:
            raise RuntimeError(f"Timed out waiting for server: {url}. Last error: {last_error}")
        time.sleep(0.25)


def _post_json(url: str, payload: dict[str, object]) -> dict[str, object]:
    import httpx

    response = httpx.post(url, json=payload, timeout=15.0)
    response.raise_for_status()
    parsed = response.json()
    return parsed if isinstance(parsed, dict) else {"raw": parsed}


def _get_json(url: str) -> dict[str, object]:
    import httpx

    response = httpx.get(url, timeout=15.0)
    response.raise_for_status()
    parsed = response.json()
    return parsed if isinstance(parsed, dict) else {"raw": parsed}


def _post_multipart(url: str, *, file_path: Path) -> dict[str, object]:
    import httpx

    with file_path.open("rb") as handle:
        files = {"file": (file_path.name, handle, "text/csv")}
        response = httpx.post(url, files=files, timeout=60.0)
        response.raise_for_status()
        parsed = response.json()
        return parsed if isinstance(parsed, dict) else {"raw": parsed}


def main(argv: list[str] | None = None) -> int:
    argv = list(argv or sys.argv[1:])
    python_bin = os.environ.get("JIN_SMOKE_PYTHON", sys.executable)

    with tempfile.TemporaryDirectory(prefix="jin-fastapi-smoke-") as tmp:
        root = Path(tmp)
        db_path = root / ".jin" / "jin.duckdb"
        db_path.parent.mkdir(parents=True, exist_ok=True)

        app_py = root / "app.py"
        app_py.write_text(
            """
from __future__ import annotations

from fastapi import FastAPI

from jin.middleware import JinMiddleware

app = FastAPI()
app.add_middleware(
    JinMiddleware,
    db_path="./.jin/jin.duckdb",
    log_level="WARNING",
)


@app.get("/sales")
def sales() -> list[dict[str, object]]:
    return [
        {"region": "NA", "sku": "sku-1", "timestamp": "2026-01-01", "revenue": 120.0},
    ]
""".lstrip(),
            encoding="utf-8",
        )

        baseline_csv = root / "baseline.csv"
        baseline_csv.write_text(
            "\n".join(
                [
                    "endpoint,dimension_fields,kpi_fields,grain_region,grain_sku,grain_timestamp,expected_revenue,tolerance_pct",
                    '"/sales","region,sku,timestamp","revenue","NA","sku-1","2026-01-01","100","1"',
                ]
            )
            + "\n",
            encoding="utf-8",
        )

        port = _pick_free_port()
        env = {
            **os.environ,
            "PYTHONPATH": str(root),
            "JIN_PROJECT_NAME": "sandbox-smoke",
            "JIN_DB_PATH": str(db_path),
            "JIN_AUTH_ENABLED": "0",
        }

        server = subprocess.Popen(
            [
                python_bin,
                "-m",
                "uvicorn",
                "app:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--log-level",
                "warning",
            ],
            cwd=str(root),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        try:
            base = f"http://127.0.0.1:{port}"
            _wait_for_http_ok(f"{base}/openapi.json")

            # 1) Ensure Jin mounted and native backend reachable.
            status = _get_json(f"{base}/jin/api/v2/status")
            project = status.get("project") if isinstance(status, dict) else None
            if not isinstance(project, dict):
                raise RuntimeError(f"Unexpected status payload: {json.dumps(status)[:400]}")
            if project.get("native_available") is not True:
                raise RuntimeError(f"Native backend unavailable: {json.dumps(project)[:400]}")

            # 2) Configure endpoint (Segment + Metric + Time).
            _post_json(
                f"{base}/jin/api/v2/config/sales",
                {
                    "dimension_fields": ["region", "sku", "timestamp"],
                    "kpi_fields": ["revenue"],
                    "time_field": "timestamp",
                    "confirmed": True,
                },
            )

            # 3) Upload baseline file.
            upload_result = _post_multipart(f"{base}/jin/api/v2/upload/sales", file_path=baseline_csv)
            if upload_result.get("ok") is not True:
                raise RuntimeError(f"Upload failed: {json.dumps(upload_result)[:400]}")

            # 4) Trigger one observation that should violate baseline (120 vs 100 at 1% tolerance).
            import httpx

            response = httpx.get(f"{base}/sales", timeout=10.0)
            response.raise_for_status()

            # 5) Assert anomaly shows up in status.
            status_after = httpx.get(f"{base}/jin/api/v2/status", timeout=15.0).json()
            if not isinstance(status_after, dict):
                raise RuntimeError(f"Unexpected status-after payload: {status_after}")
            summary = status_after.get("summary")
            if not isinstance(summary, dict):
                raise RuntimeError(f"Missing summary: {status_after}")
            anomalies = int(summary.get("anomalies", 0) or 0)
            if anomalies < 1:
                raise RuntimeError(f"Expected >=1 anomaly after observation, got {anomalies}. Payload={status_after}")

            return 0
        finally:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
            if server.stdout is not None:
                output = server.stdout.read()
                if output.strip():
                    sys.stderr.write("\n[jin-smoke] uvicorn output:\n")
                    sys.stderr.write(output[-4000:])
                    sys.stderr.write("\n")


if __name__ == "__main__":
    raise SystemExit(main())
