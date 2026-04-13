from jin import JinMiddleware
from fastapi import FastAPI
import os

app = FastAPI()
jin = JinMiddleware(app, db_path="./demo-jin.duckdb", global_threshold=10.0)

# The router involves closures, so let's just use the middleware methods directly
path = "/api/revenue/{retailer}"
try:
    jin._init_db_if_needed()
    overrides = jin._load_overrides(path)
    print(f"Overrides for {path}: {overrides}")
    
    # Check the registry
    jin._discover_routes(app)
    record = jin.endpoint_registry.get(path)
    if record:
        print(f"Registry (post-discovery) for {path}:")
        print(f"  dimension_fields: {record.dimension_fields}")
        print(f"  kpi_fields: {record.kpi_fields}")
        
except Exception as e:
    import traceback
    traceback.print_exc()
