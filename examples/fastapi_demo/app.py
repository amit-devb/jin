from __future__ import annotations

import os
from pathlib import Path

import duckdb
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from jin import JinMiddleware
from jin.watch import watch


def load_local_env() -> None:
    if os.getenv("PYTEST_CURRENT_TEST"):
        return
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == "JIN_DB_PATH":
            continue
        os.environ.setdefault(key.strip(), value.strip())


load_local_env()

# Demo defaults. Real apps can either:
# - pass `db_path=` to `JinMiddleware`, or
# - set `JIN_DB_PATH` in the environment (which overrides the argument).
DEMO_DB_PATH = str(Path(".jin") / "demo-jin.duckdb")
os.environ.setdefault("JIN_DB_PATH", DEMO_DB_PATH)
os.environ.setdefault("JIN_DISABLE_NATIVE_CONFIG_LOAD", "1")
APP_DB_PATH = Path(__file__).parent / "app_data.duckdb"


class RevenueDataPoint(BaseModel):
    date: str
    revenue: float
    orders: int
    label: str = "current"


class RevenueResponse(BaseModel):
    retailer: str
    data: list[RevenueDataPoint]


class InventoryDataPoint(BaseModel):
    sku_group: str
    in_stock: int
    sell_through: float
    snapshot_date: str
    label: str = "current"


class InventoryResponse(BaseModel):
    retailer: str
    data: list[InventoryDataPoint]


class QueryRequest(BaseModel):
    dates: list[str] | None = None
    compared_dates: list[str] | None = None
    sku_group: str = "all"


class WatchPayload(BaseModel):
    order_id: str
    amount: float


app = FastAPI(title="Jin Demo")

# Standard integration: add the middleware once.
#
# The Jin middleware mounts the `/jin` router lazily on first request (and performs
# discovery + scheduler boot). Do not also create a separate JinMiddleware instance
# and mount its router manually, as that can double-open the DuckDB file and cause
# "file already open" errors on Windows.
app.add_middleware(JinMiddleware, db_path=DEMO_DB_PATH, global_threshold=10.0)


@app.get("/", include_in_schema=False)
async def home() -> RedirectResponse:
    return RedirectResponse(url="/jin", status_code=307)


def _get_revenue_data(retailer: str, dates: list[str] | None, compared_dates: list[str] | None) -> RevenueResponse:
    conn = duckdb.connect(str(APP_DB_PATH))
    try:
        data_points: list[RevenueDataPoint] = []
        def add_points(date_list: list[str] | None, label: str):
            if not date_list: return
            for d in date_list:
                row = conn.execute("SELECT revenue, orders FROM revenue WHERE retailer = ? AND period = ? LIMIT 1", [retailer, d]).fetchone()
                if row: data_points.append(RevenueDataPoint(date=d, revenue=row[0], orders=row[1], label=label))
        add_points(dates, "current")
        add_points(compared_dates, "comparison")
        if not data_points: raise HTTPException(status_code=404, detail="No revenue data found")
        return RevenueResponse(retailer=retailer, data=data_points)
    finally:
        conn.close()


@app.get("/api/revenue/{retailer}", response_model=RevenueResponse)
@watch(schedule="every 1h", default_params={"path_params": {"retailer": "amazon"}, "query_params": {"dates": ["2026-03-19"]}})
async def revenue_get(retailer: str, dates: list[str] = Query(None), compared_dates: list[str] = Query(None)) -> RevenueResponse:
    return _get_revenue_data(retailer, dates, compared_dates)


@app.post("/api/revenue/{retailer}", response_model=RevenueResponse)
@watch(schedule="every 1h", default_params={"path_params": {"retailer": "amazon"}, "body": {"dates": ["2026-03-19"]}})
async def revenue_post(retailer: str, req: QueryRequest) -> RevenueResponse:
    return _get_revenue_data(retailer, req.dates, req.compared_dates)


def _get_inventory_data(retailer: str, sku_group: str, dates: list[str] | None, compared_dates: list[str] | None) -> InventoryResponse:
    conn = duckdb.connect(str(APP_DB_PATH))
    try:
        data_points: list[InventoryDataPoint] = []
        def add_points(date_list: list[str] | None, label: str):
            if not date_list: return
            for d in date_list:
                if sku_group == "all":
                    row = conn.execute(
                        """
                        SELECT
                            COALESCE(SUM(in_stock), 0) AS in_stock_total,
                            COALESCE(AVG(sell_through), 0) AS sell_through_avg,
                            ? AS snapshot_date
                        FROM inventory
                        WHERE retailer = ? AND snapshot_date = ?
                        """,
                        [d, retailer, d],
                    ).fetchone()
                    if row and row[0] > 0:
                        data_points.append(
                            InventoryDataPoint(
                                sku_group="all",
                                in_stock=int(row[0]),
                                sell_through=float(row[1]),
                                snapshot_date=str(row[2]),
                                label=label,
                            )
                        )
                else:
                    row = conn.execute(
                        "SELECT in_stock, sell_through, snapshot_date FROM inventory WHERE retailer = ? AND sku_group = ? AND snapshot_date = ? LIMIT 1",
                        [retailer, sku_group, d],
                    ).fetchone()
                    if row:
                        data_points.append(
                            InventoryDataPoint(
                                sku_group=sku_group,
                                in_stock=row[0],
                                sell_through=row[1],
                                snapshot_date=row[2],
                                label=label,
                            )
                        )
        add_points(dates, "current")
        add_points(compared_dates, "comparison")
        if not data_points: raise HTTPException(status_code=404, detail="No inventory data found")
        return InventoryResponse(retailer=retailer, data=data_points)
    finally:
        conn.close()


@app.get("/api/inventory/{retailer}", response_model=InventoryResponse)
@watch(schedule="every 1h", default_params={"path_params": {"retailer": "amazon"}, "query_params": {"sku_group": "all", "dates": ["2026-03-19"]}})
async def inventory_get(retailer: str, sku_group: str = "all", dates: list[str] = Query(None), compared_dates: list[str] = Query(None)) -> InventoryResponse:
    return _get_inventory_data(retailer, sku_group, dates, compared_dates)


@app.post("/api/inventory/{retailer}", response_model=InventoryResponse)
@watch(schedule="every 1h", default_params={"path_params": {"retailer": "amazon"}, "body": {"sku_group": "all", "dates": ["2026-03-19"]}})
async def inventory_post(retailer: str, req: QueryRequest) -> InventoryResponse:
    return _get_inventory_data(retailer, req.sku_group, req.dates, req.compared_dates)


@app.get("/api/watch/{retailer}", response_model=WatchPayload)
@watch(schedule="every 2h", threshold=20, default_params={"path_params": {"retailer": "amazon"}})
async def watched(retailer: str) -> WatchPayload:
    return WatchPayload(order_id=retailer, amount=25.0)
