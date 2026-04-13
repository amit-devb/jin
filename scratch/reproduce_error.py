import sys
from pathlib import Path

# Add python directory to sys.path
sys.path.append(str(Path.cwd() / "python"))

from jin.uploader import validate_upload_rows
from jin.technical_metadata import TECHNICAL_METADATA_FIELDS

# Mock data based on user input
csv_content = """retailer,data[].date,data[].revenue,data[].orders,data[].label,tolerance_pct
amazon,2026-04-12,5200.00,110,current,5
shopify,2026-04-12,8950.50,95,current,10
walmart,2026-04-12,22150.25,198,current,12
amazon,2026-04-13,5400.00,115,current,5
shopify,2026-04-13,8700.00,90,current,10
"""

import csv
from io import StringIO

rows = list(csv.DictReader(StringIO(csv_content)))

# Assume these are the expected fields based on the CSV
dimension_fields = ["retailer", "data[].date", "data[].label"]
kpi_fields = ["data[].revenue", "data[].orders"]
field_names = set(dimension_fields + kpi_fields)

try:
    final_dims, final_kpis, normalized, warnings = validate_upload_rows(
        rows,
        field_names=field_names,
        endpoint="/test",
        dimension_fields=dimension_fields,
        kpi_fields=kpi_fields
    )
    print("Success!")
    print(f"Dimensions: {final_dims}")
    print(f"KPIs: {final_kpis}")
    print(f"Normalized Rows: {len(normalized)}")
    print(f"Warnings: {warnings}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
