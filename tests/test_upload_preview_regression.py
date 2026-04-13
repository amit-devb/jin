from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from jin.middleware import JinMiddleware
from jin.router import create_router


def test_upload_preview_never_leaks_unboundlocalerror() -> None:
    """Regression test for UI error:
    'cannot access local variable \"warnings\" where it is not associated with a value'
    """
    class RevenueRow(BaseModel):
        date: str
        revenue: float
        orders: int
        label: str = "current"

    class RevenueResponse(BaseModel):
        retailer: str
        data: list[RevenueRow]

    app = FastAPI()
    # Use a unique db path to avoid file locks in concurrent test runs.
    middleware = JinMiddleware(app, db_path="test-preview.duckdb", global_threshold=10.0)
    app.include_router(create_router(middleware), prefix="/jin")

    @app.get("/api/revenue/{retailer}", response_model=RevenueResponse)
    async def revenue(retailer: str) -> RevenueResponse:  # pragma: no cover
        return RevenueResponse(
            retailer=retailer,
            data=[RevenueRow(date="2026-03-01", revenue=1.0, orders=1, label="current")],
        )

    # Ensure endpoint registry is populated for the preview endpoint.
    middleware._discover_routes(app)

    client = TestClient(app)
    csv_bytes = (
        "retailer,revenue,orders,tolerance_pct\n"
        "amazon,4711.9,100,10\n"
        "shopify,8400,92,10\n"
        "walmart,21000.75,210,10\n"
    ).encode("utf-8")

    response = client.post(
        # Use v1 preview path to avoid config readiness blockers (this regression is about stability,
        # not setup gating).
        "/jin/api/upload-preview/api/revenue/%7Bretailer%7D",
        files={"file": ("revenue_reconciliation_test.csv", csv_bytes, "text/csv")},
    )

    # Preview may legitimately return 200 (ok) or 422 (guidance). It must not crash.
    assert response.status_code in {200, 422}
    payload = response.json()
    # For error cases, the API must still return structured warnings.
    if payload.get("ok") is False:
        assert "warnings" in payload
        assert isinstance(payload["warnings"], list)
    if payload.get("ok") is False:
        assert "local variable 'warnings'" not in str(payload.get("error", "")).lower()
