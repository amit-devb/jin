# Getting Started

Set up Jin in your own FastAPI Data Product to enable seamless, automated Product Owner data reconciliation.

## 1. Fast Installation

Jin ships with pre-compiled Rust bindings (`maturin`) to ensure a blazingly fast, Native experience on macOS, Linux, and Windows. 

Simply install the wheel via your favorite package manager:

```bash
uv add jin-monitor
```

or:

```bash
pip install jin-monitor
```

## 2. Add the Edge-Native Middleware

Jin intercepts your API responses via standard ASGI. Add the middleware to initialize the local, persistent DuckDB engine right alongside your app.

```python
from fastapi import FastAPI
from jin import JinMiddleware

app = FastAPI()

# Mounts the Rust-backed reconciliation engine and dashboard
app.add_middleware(
    JinMiddleware, 
    db_path="./jin.duckdb",
    global_threshold=10.0
)
```

## 3. Empower your Product Owners

Run your app and open the intuitive Jin UI:

```text
http://127.0.0.1:8000/jin
```

### Windows note

Run with a single server worker (`--workers 1`). DuckDB file locking on Windows is stricter, and multi-worker setups can cause intermittent operator UI connectivity issues.

From the dashboard, a Product Owner can independently:
- **Discover**: Instantly view the auto-detected schemas and nested structures of your data endpoints.
- **Configure**: Map Business KPIs (e.g. `Revenue`) and Grains (e.g. `Category -> Product SKU`).
- **Reconcile**: Upload a ground-truth CSV/Excel file to schedule automated drift tests against live production traffic.
- **Resolve**: Triage mismatches using the built-in Incident Workflow.

## 4. Secure the Dashboard (Optional)

In production environments, restrict Jin access via Basic Auth:

```env
JIN_AUTH_ENABLED=true
JIN_USERNAME=owner
JIN_PASSWORD=change-me
```

## 5. Helpful CI/CD Commands

Verify your deployment and run automated checks using the CLI:

```bash
jin setup app.main
jin doctor --app package.module:app
jin verify --app package.module:app
jin issues list
jin references import --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv
```
