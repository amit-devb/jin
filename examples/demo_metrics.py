import asyncio
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from jin import JinMiddleware, Metric, Dimension, Sum

app = FastAPI(version="2.0.0")

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python')))


db_path = "demo.duckdb"
if os.path.exists(db_path):
    os.remove(db_path)

app.add_middleware(
    JinMiddleware,
    db_path=db_path,
    log_level="INFO",
)

class OrderResponse:
    def __init__(self, order_id: str, amount: float, region: str):
        self.order_id = order_id
        self.amount = amount
        self.region = region

@app.post("/api/orders", response_model=None)
@app.router.post("/api/orders", response_model=None)
async def create_order(request: Request):
    return {"order_id": "ORD-123", "amount": 150.0, "region": "US-East"}

# We can manually set the metrics if we are simulating
create_order._jin_metrics = [
    Metric(
        name="daily_revenue", 
        calculation=Sum("amount"), 
        dimensions=[Dimension("region")]
    )
]

def run_demo():
    print("--- Starting Jin Metrics Demo ---")
    client = TestClient(app)
    
    # 1. Simulate traffic with different API versions
    print("\\nSimulating traffic...")
    client.post("/api/orders", headers={"x-api-version": "1.0.0"})
    client.post("/api/orders", headers={"x-api-version": "1.0.0"})
    client.post("/api/orders", headers={"x-api-version": "2.0.0"})
    
    import time
    time.sleep(1)

    # 2. Query the metrics
    print("\\nQuerying analytics API...")
    response = client.post("/jin/api/v1/query", json={
        "measures": ["amount"],
        "dimensions": ["region", "api_version"]
    })
    
    print("Query Results:")
    import json
    print(json.dumps(response.json(), indent=2))
    
    print("\\nDemo completed successfully!")

if __name__ == "__main__":
    run_demo()
