from __future__ import annotations

import csv
import json
import os
from pathlib import Path
import urllib.request

# Helper script for manual QA: generates "happy" and "failed" CSVs for the demo app.
#
# This file intentionally avoids any side effects at import-time (pytest collects files
# named test_*.py; this script used to be named that and broke CI on Windows/Linux).


BASE_URL = os.environ.get("JIN_TESTDATA_BASE_URL", "http://127.0.0.1:8000")
DATE = os.environ.get("JIN_TESTDATA_DATE", "2026-04-13")
RETAILER = os.environ.get("JIN_TESTDATA_RETAILER", "amazon")


def data_dir() -> Path:
    return Path(__file__).resolve().parent / "test_data"


def get_json(url: str) -> dict:
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode())


def generate_csvs(*, revenue_truth: dict, inventory_truth: dict, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # A) Revenue CSVs (separate columns)
    with (out_dir / "revenue_happy.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["retailer", "label", "date", "revenue", "orders", "tolerance_pct"])
        writer.writerow([RETAILER, "current", DATE, revenue_truth["revenue"], revenue_truth["orders"], 1])

    with (out_dir / "revenue_failed.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["retailer", "label", "date", "revenue", "orders", "tolerance_pct"])
        writer.writerow([RETAILER, "current", DATE, 6000.0, revenue_truth["orders"], 10])

    # B) Revenue CSVs (Group column)
    with (out_dir / "revenue_group_happy.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Group", "revenue", "orders", "Tolerance %"])
        writer.writerow(
            [f"retailer={RETAILER} | label=current | date={DATE}", revenue_truth["revenue"], revenue_truth["orders"], 1]
        )

    with (out_dir / "revenue_group_failed.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Group", "revenue", "orders", "Tolerance %"])
        writer.writerow([f"retailer={RETAILER} | label=current | date={DATE}", 6000.0, revenue_truth["orders"], 10])

    # C) Inventory CSVs (separate columns)
    with (out_dir / "inventory_happy.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["retailer", "label", "sku_group", "snapshot_date", "in_stock", "sell_through", "tolerance_pct"]
        )
        writer.writerow([RETAILER, "current", "all", DATE, inventory_truth["in_stock"], inventory_truth["sell_through"], 1])

    with (out_dir / "inventory_failed.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["retailer", "label", "sku_group", "snapshot_date", "in_stock", "sell_through", "tolerance_pct"]
        )
        writer.writerow([RETAILER, "current", "all", DATE, 1500, inventory_truth["sell_through"], 10])

    # D) Inventory CSVs (Group column)
    with (out_dir / "inventory_group_happy.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Group", "in_stock", "sell_through", "Tolerance %"])
        writer.writerow(
            [
                f"retailer={RETAILER} | label=current | sku_group=all | snapshot_date={DATE}",
                inventory_truth["in_stock"],
                inventory_truth["sell_through"],
                1,
            ]
        )

    with (out_dir / "inventory_group_failed.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Group", "in_stock", "sell_through", "Tolerance %"])
        writer.writerow(
            [
                f"retailer={RETAILER} | label=current | sku_group=all | snapshot_date={DATE}",
                1500,
                inventory_truth["sell_through"],
                10,
            ]
        )

    # E) Negative CSVs
    with (out_dir / "malformed_group.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Group", "revenue", "orders", "Tolerance %"])
        writer.writerow([f"retailer {RETAILER} | date {DATE}", 6000.0, 102, 10])

    with (out_dir / "missing_metric.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["retailer", "label", "date", "revenue", "tolerance_pct"])
        writer.writerow([RETAILER, "current", DATE, revenue_truth["revenue"], 10])


def main() -> int:
    rev_data = get_json(f"{BASE_URL}/api/revenue/{RETAILER}?dates={DATE}")["data"][0]
    inv_data = get_json(f"{BASE_URL}/api/inventory/{RETAILER}?sku_group=all&dates={DATE}")["data"][0]
    generate_csvs(revenue_truth=rev_data, inventory_truth=inv_data, out_dir=data_dir())
    print(f"CSVs generated in {data_dir()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

