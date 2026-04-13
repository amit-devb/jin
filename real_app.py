from fastapi import FastAPI, Query
from pydantic import BaseModel
from jin import JinMiddleware
import os

app = FastAPI(title="Real Business API")

# Setup Jin on a different DB to avoid interference
os.environ["JIN_DB_PATH"] = "./real-jin.duckdb"

app.add_middleware(JinMiddleware, db_path="./real-jin.duckdb")

class SalesItem(BaseModel):
    product_id: str
    category: str
    amount: float
    timestamp: str

class SalesResponse(BaseModel):
    items: list[SalesItem]
    total: float

@app.get("/sales/{category}", response_model=SalesResponse)
async def get_sales(category: str, date: str = Query(...)):
    # Mock data
    return SalesResponse(
        items=[
            SalesItem(product_id="p1", category=category, amount=100.0, timestamp=date),
            SalesItem(product_id="p2", category=category, amount=250.0, timestamp=date),
        ],
        total=350.0
    )

class ProductStats(BaseModel):
    revenue: float
    orders: int

class ProductItem(BaseModel):
    sku: str
    stats: ProductStats

class CategoryItem(BaseModel):
    name: str
    products: list[ProductItem]

class CatalogContent(BaseModel):
    categories: list[CategoryItem]

class DeepResponse(BaseModel):
    region: str
    snapshot_date: str
    catalog: CatalogContent

@app.get("/metrics/deep", response_model=DeepResponse)
async def get_deep_metrics(date: str = Query(...)):
    return DeepResponse(
        region="North America",
        snapshot_date=date,
        catalog=CatalogContent(
            categories=[
                CategoryItem(
                    name="Electronics",
                    products=[
                        ProductItem(sku="E001", stats=ProductStats(revenue=1200.50, orders=42)),
                        ProductItem(sku="E002", stats=ProductStats(revenue=850.00, orders=30))
                    ]
                ),
                CategoryItem(
                    name="Home",
                    products=[
                        ProductItem(sku="H001", stats=ProductStats(revenue=450.25, orders=15))
                    ]
                )
            ]
        )
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8023)
