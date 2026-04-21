import duckdb
import os
import random
from datetime import datetime, timedelta

DB_PATH = "examples/fastapi_demo/app_data.duckdb"
ANCHOR_DATE_ENV = "JIN_DEMO_ANCHOR_DATE"

def seed_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    
    conn = duckdb.connect(DB_PATH)
    
    # Create revenue table
    conn.execute("""
        CREATE TABLE revenue (
            retailer TEXT,
            period TEXT,
            revenue DOUBLE,
            orders INTEGER,
            created_at TIMESTAMP DEFAULT now()
        )
    """)
    
    # Create inventory table
    conn.execute("""
        CREATE TABLE inventory (
            retailer TEXT,
            sku_group TEXT,
            in_stock INTEGER,
            sell_through DOUBLE,
            snapshot_date TEXT,
            updated_at TIMESTAMP DEFAULT now()
        )
    """)
    
    retailers = ["amazon", "shopify", "walmart", "target"]
    sku_groups = ["electronics", "apparel", "home", "outdoors"]
    
    # Seed revenue/inventory around a stable anchor date so Playwright E2E tests
    # can use fixed ISO dates regardless of when the demo is run.
    #
    # Default aligns with the E2E specs.
    anchor = os.getenv(ANCHOR_DATE_ENV, "2026-03-19")
    try:
        now = datetime.fromisoformat(anchor)
    except Exception:
        now = datetime.now()
    for i in range(30):
        date_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        for r in retailers:
            # Random but somewhat stable revenue
            base_rev = {"amazon": 5000, "shopify": 3000, "walmart": 4500, "target": 2500}[r]
            rev = base_rev + random.uniform(-500, 500)
            orders = int(rev / 50) + random.randint(-5, 5)
            conn.execute("INSERT INTO revenue (retailer, period, revenue, orders) VALUES (?, ?, ?, ?)", [r, date_str, rev, orders])
            
            # Also add some "YTD" records
            if i == 0:
                conn.execute("INSERT INTO revenue (retailer, period, revenue, orders) VALUES (?, ?, ?, ?)", [r, "YTD", base_rev * 100, orders * 100])
    
    # Seed inventory (last 30 days)
    for i in range(30):
        date_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        for r in retailers:
            for s in sku_groups:
                stock = random.randint(50, 500)
                sell_through = round(random.uniform(0.1, 0.9), 2)
                conn.execute(
                    "INSERT INTO inventory (retailer, sku_group, in_stock, sell_through, snapshot_date) VALUES (?, ?, ?, ?, ?)",
                    [r, s, stock, sell_through, date_str]
                )
                if i == 0:
                    conn.execute(
                        "INSERT INTO inventory (retailer, sku_group, in_stock, sell_through, snapshot_date) VALUES (?, ?, ?, ?, ?)",
                        [r, s, stock * 10, sell_through, "YTD"]
                    )
            
    conn.close()
    print(f"App database seeded at {DB_PATH}")

if __name__ == "__main__":
    seed_db()
