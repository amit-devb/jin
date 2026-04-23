from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    argv = list(argv or sys.argv[1:])
    smoke_mode = str(os.getenv("JIN_SMOKE_MODE", "user")).strip().lower()
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

        os.environ["PYTHONPATH"] = str(root)
        os.environ["JIN_PROJECT_NAME"] = "sandbox-smoke"
        os.environ["JIN_DB_PATH"] = str(db_path)
        os.environ["JIN_AUTH_ENABLED"] = "0"
        # CI runs can disable scheduler/background activity for determinism.
        if smoke_mode in {"ci", "github", "gha"}:
            os.environ["JIN_DISABLE_SCHEDULER"] = "1"

        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from pydantic import BaseModel

        from jin.middleware import JinMiddleware

        class SalesRow(BaseModel):
            region: str
            sku: str
            timestamp: str
            revenue: float

        app = FastAPI()
        app.add_middleware(JinMiddleware, db_path=str(db_path), log_level="WARNING")

        @app.get("/sales", response_model=list[SalesRow])
        def sales() -> list[SalesRow]:
            return [
                SalesRow(region="NA", sku="sku-1", timestamp="2026-01-01", revenue=120.0),
            ]

        with TestClient(app) as client:
            _ = client.get("/openapi.json")

            status_resp = client.get("/jin/api/v2/status")
            assert status_resp.status_code == 200, status_resp.text
            status = status_resp.json()
            project = status.get("project") if isinstance(status, dict) else None
            if not isinstance(project, dict):
                raise RuntimeError(f"Unexpected status payload: {json.dumps(status)[:400]}")
            if project.get("native_available") is not True:
                raise RuntimeError(f"Native backend unavailable: {json.dumps(project)[:400]}")

            config_resp = client.post(
                "/jin/api/v2/config/sales",
                json={
                    "dimension_fields": ["region", "sku", "timestamp"],
                    "kpi_fields": ["revenue"],
                    "time_field": "timestamp",
                    "confirmed": True,
                },
            )
            assert config_resp.status_code == 200, config_resp.text

            with baseline_csv.open("rb") as handle:
                upload_resp = client.post(
                    "/jin/api/v2/upload/sales",
                    files={"file": ("baseline.csv", handle, "text/csv")},
                )
            assert upload_resp.status_code == 200, upload_resp.text
            upload_payload = upload_resp.json()
            if upload_payload.get("ok") is not True:
                raise RuntimeError(f"Upload failed: {json.dumps(upload_payload)[:400]}")

            sales_resp = client.get("/sales")
            assert sales_resp.status_code == 200, sales_resp.text

            status_after_resp = client.get("/jin/api/v2/status")
            assert status_after_resp.status_code == 200, status_after_resp.text
            status_after = status_after_resp.json()
            if not isinstance(status_after, dict):
                raise RuntimeError(f"Unexpected status-after payload: {status_after}")
            project_after = status_after.get("project") if isinstance(status_after, dict) else None
            if isinstance(project_after, dict) and project_after.get("recent_errors"):
                raise RuntimeError(f"Unexpected recent_errors: {json.dumps(project_after.get('recent_errors'))[:800]}")
            summary = status_after.get("summary")
            if not isinstance(summary, dict):
                raise RuntimeError(f"Missing summary: {status_after}")
            anomalies = int(summary.get("anomalies", 0) or 0)
            if anomalies < 1:
                raise RuntimeError(f"Expected >=1 anomaly after observation, got {anomalies}. Payload={status_after}")

        return 0


if __name__ == "__main__":
    raise SystemExit(main())
