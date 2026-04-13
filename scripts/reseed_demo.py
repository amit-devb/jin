import os
import json
import random
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
import duckdb

# Import the demo app
import sys
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "python"))

from examples.fastapi_demo.app import app

DB_PATH = "demo-jin.duckdb"

def reset_license_usage():
    usage_path = os.path.expanduser("~/.jin/usage.json")
    if os.path.exists(usage_path):
        print(f"Resetting license usage at {usage_path}")
        try:
            with open(usage_path, "w") as f:
                json.dump({}, f)
        except Exception as e:
            print(f"Warning: Could not reset license usage: {e}")

def reseed():
    print(f"--- Reseeding {DB_PATH} ---")
    reset_license_usage()
    
    # 1. Clear the database
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    
    client = TestClient(app)
    
    # 2. Simulate traffic for /api/revenue
    print("Simulating /api/revenue...")
    retailers = ["amazon", "shopify", "walmart"]
    # Last 30 days
    now = datetime.now()
    for i in range(30):
        date_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        for r in retailers:
            val = 1000.0 + random.random() * 500.0
            client.get(f"/api/revenue/{r}/{date_str}?value={val}")

    # 3. Simulate traffic for /api/inventory
    print("Simulating /api/inventory...")
    sku_groups = ["electronics", "apparel", "home"]
    for i in range(10):
        for r in retailers:
            for s in sku_groups:
                stock = random.randint(50, 500)
                client.get(f"/api/inventory/{r}?sku_group={s}&in_stock={stock}")

    # 4. Simulate traffic for /api/watch
    print("Simulating /api/watch...")
    for i in range(5):
        client.get("/api/watch/amazon")

    # 5. Inject config + reference targets via jin_core
    print("Injecting config + reference targets via jin_core...")
    import jin_core
    jin_core.init_db(DB_PATH)
    
    # Endpoint 1 Config & References
    jin_core.save_endpoint_config(
        DB_PATH,
        '/api/revenue/{retailer}/{period}',
        'GET',
        json.dumps(['retailer', 'period']),
        json.dumps(['revenue', 'orders']),
        json.dumps({
            "time_field": "period",
            "time_granularity": "day",
            "confirmed": True
        })
    )
    
    ref_records = []
    for r in retailers:
        ref_records.append({
            "grain_key": f"{r}",
            "kpi_field": "revenue",
            "expected_value": 1250.0,
            "tolerance_pct": 15.0
        })
        ref_records.append({
            "grain_key": f"{r}",
            "kpi_field": "orders",
            "expected_value": 625.0,
            "tolerance_pct": 15.0
        })
    jin_core.save_references(DB_PATH, '/api/revenue/{retailer}/{period}', json.dumps(ref_records), "reseed")

    # Endpoint 2 Config & References
    jin_core.save_endpoint_config(
        DB_PATH,
        '/api/inventory/{retailer}',
        'GET',
        json.dumps(['retailer', 'sku_group']),
        json.dumps(['in_stock', 'sell_through']),
        json.dumps({"confirmed": True})
    )
    
    inv_records = []
    for r in retailers:
        for s in sku_groups:
            inv_records.append({
                "grain_key": f"{r}|{s}",
                "kpi_field": "in_stock",
                "expected_value": 250.0,
                "tolerance_pct": 20.0
            })
    jin_core.save_references(DB_PATH, '/api/inventory/{retailer}', json.dumps(inv_records), "reseed")

    print(f"--- Reseed complete! {DB_PATH} is ready. ---")

if __name__ == "__main__":
    reseed()
