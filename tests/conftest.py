from __future__ import annotations

from pathlib import Path
from urllib.parse import quote

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.testclient import TestClient
from pydantic import BaseModel

from jin import JinMiddleware
from jin.watch import watch
from unittest.mock import patch


class Metrics(BaseModel):
    RSV: float
    units: int


class SalesResponse(BaseModel):
    retailer: str
    period: str
    data: Metrics


class OrderResponse(BaseModel):
    order_id: str
    amount: float


@pytest.fixture(autouse=True)
def isolate_license_registry(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JIN_LICENSE_PROJECTS_PATH", str(tmp_path / "license-projects.json"))


@pytest.fixture()
def app(tmp_path: Path) -> FastAPI:
    application = FastAPI()

    @application.get("/api/sales/{retailer}/{period}", response_model=SalesResponse)
    async def sales(retailer: str, period: str, value: float = 100.0) -> SalesResponse:
        return SalesResponse(
            retailer=retailer,
            period=period,
            data=Metrics(RSV=value, units=int(value / 2)),
        )

    @application.post("/api/orders", response_model=OrderResponse)
    async def orders(payload: dict) -> OrderResponse:
        return OrderResponse(order_id=payload["order_id"], amount=float(payload["amount"]))

    @application.get("/api/watch/{retailer}", response_model=OrderResponse)
    @watch(schedule="every 2h", threshold=20, default_params={"path_params": {"retailer": "amazon"}})
    async def watched(retailer: str) -> OrderResponse:
        return OrderResponse(order_id=retailer, amount=25.0)

    @application.get("/plain")
    async def plain() -> PlainTextResponse:
        return PlainTextResponse("ok")

    @application.get("/raw")
    async def raw() -> PlainTextResponse:
        return PlainTextResponse("raw")

    class InfoResponse(BaseModel):
        label: str

    @application.get("/api/info", response_model=InfoResponse)
    async def info() -> InfoResponse:
        return InfoResponse(label="ready")

    @application.get("/boom")
    async def boom() -> None:
        raise HTTPException(status_code=500, detail="boom")

    application.add_middleware(
        JinMiddleware,
        db_path=str(tmp_path / "test.duckdb"),
        global_threshold=10.0,
        exclude_paths=["/plain"],
        log_level="INFO",
    )
    # Mock license check to avoid limit errors during tests
    with patch("jin.middleware.LicenseClient.check_usage", return_value=True):
        yield application


@pytest.fixture()
def client(app: FastAPI) -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def encoded_sales_path() -> str:
    return quote("/api/sales/{retailer}/{period}", safe="")
