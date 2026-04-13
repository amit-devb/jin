import urllib.request
import json
import csv
import os

# Base URL (app should be running or reachable)
BASE_URL = "http://127.0.0.1:8000" # Use 8000 as it's the default when running via python app.py directly without run_demo.py
DATE = "2026-04-13"
RETAILER = "amazon"

# Directory for test data
DATA_DIR = "/Users/amitdeb/development/jin/scratch/test_data"
os.makedirs(DATA_DIR, exist_ok=True)

def generate_csvs(revenue_truth, inventory_truth):
    # A) Revenue CSVs (separate columns)
    with open(os.path.join(DATA_DIR, "revenue_happy.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["retailer", "label", "date", "revenue", "orders", "tolerance_pct"])
        writer.writerow([RETAILER, "current", DATE, revenue_truth["revenue"], revenue_truth["orders"], 1])
    
    with open(os.path.join(DATA_DIR, "revenue_failed.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["retailer", "label", "date", "revenue", "orders", "tolerance_pct"])
        writer.writerow([RETAILER, "current", DATE, 6000.0, revenue_truth["orders"], 10])

    # B) Revenue CSVs (Group column)
    with open(os.path.join(DATA_DIR, "revenue_group_happy.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Group", "revenue", "orders", "Tolerance %"])
        writer.writerow([f"retailer={RETAILER} | label=current | date={DATE}", revenue_truth["revenue"], revenue_truth["orders"], 1])
    
    with open(os.path.join(DATA_DIR, "revenue_group_failed.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Group", "revenue", "orders", "Tolerance %"])
        writer.writerow([f"retailer={RETAILER} | label=current | date={DATE}", 6000.0, revenue_truth["orders"], 10])

    # C) Inventory CSVs (separate columns)
    with open(os.path.join(DATA_DIR, "inventory_happy.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["retailer", "label", "sku_group", "snapshot_date", "in_stock", "sell_through", "tolerance_pct"])
        writer.writerow([RETAILER, "current", "all", DATE, inventory_truth["in_stock"], inventory_truth["sell_through"], 1])
    
    with open(os.path.join(DATA_DIR, "inventory_failed.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["retailer", "label", "sku_group", "snapshot_date", "in_stock", "sell_through", "tolerance_pct"])
        writer.writerow([RETAILER, "current", "all", DATE, 1500, inventory_truth["sell_through"], 10])

    # D) Inventory CSVs (Group column)
    with open(os.path.join(DATA_DIR, "inventory_group_happy.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Group", "in_stock", "sell_through", "Tolerance %"])
        writer.writerow([f"retailer={RETAILER} | label=current | sku_group=all | snapshot_date={DATE}", inventory_truth["in_stock"], inventory_truth["sell_through"], 1])
    
    with open(os.path.join(DATA_DIR, "inventory_group_failed.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Group", "in_stock", "sell_through", "Tolerance %"])
        writer.writerow([f"retailer={RETAILER} | label=current | sku_group=all | snapshot_date={DATE}", 1500, inventory_truth["sell_through"], 10])

    # E) Negative CSVs
    with open(os.path.join(DATA_DIR, "malformed_group.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Group", "revenue", "orders", "Tolerance %"])
        writer.writerow([f"retailer {RETAILER} | date {DATE}", 6000.0, 102, 10])
    
    with open(os.path.join(DATA_DIR, "missing_metric.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["retailer", "label", "date", "revenue", "tolerance_pct"])
        writer.writerow([RETAILER, "current", DATE, revenue_truth["revenue"], 10])

    print(f"CSVs generated in {DATA_DIR}")

if __name__ == "__main__":
    def get_json(url):
        with urllib.request.urlopen(url) as response:
            return json.loads(response.read().decode())

    # Revenue hit
    rev_data = get_json(f"{BASE_URL}/api/revenue/{RETAILER}?dates={DATE}")["data"][0]
    
    # Inventory hit
    inv_data = get_json(f"{BASE_URL}/api/inventory/{RETAILER}?sku_group=all&dates={DATE}")["data"][0]
    
    generate_csvs(rev_data, inv_data)
