# Jin

**SaaS-Grade Observability & Reconciliation for FastAPI Data Products**

Jin is a Rust-first, drop-in reconciliation engine that actively monitors internal data quality natively inside your FastAPI applications. Designed for engineers and tailored for Product Owners (POs).

## The Killer App: Deep-Nested Reconciliation

Traditional data quality reconciliation requires tedious, custom data pipeline scripts that flatten complex JSON structures. Jin solves this instantly.

With our fast, persistent Rust core, Jin automatically traverses deeply nested Pydantic responses (e.g., `catalog.categories[].products[].stats.revenue`), and accurately reconciles those metrics against flat reference/CSV files provided by your business teams.

No custom validation scripts. No pipeline bloat. Just point Jin to your endpoint, map the grain in the UI, and let the engine do the work.

## Features

- **Zero-Friction Integration**: 30-second install via `pip` or `uv`. Drop a single middleware into your FastAPI app and go.
- **PO Wizard Setup**: The Jin Dashboard helps non-technical Product Owners map JSON paths, define metric tolerances, and upload CSV ground truth.
- **Field Aliasing** *(Coming Soon)*: Shield business users from JSON paths by mapping `catalog.categories[].products[].sku` to simple aliases like "Product SKU".
- **Executive Reporting**: One-click generation of beautifully formatted, executive-ready Markdown and CSV Data Quality reports.
- **Built-in Incident Workflow**: Track "Match" or "Mismatch" issues with full lifecycle support (Assign, Snooze, Resolve, Suppress).

## Start Here

**1. Install (Pre-compiled wheels ensure a blazingly fast install):**

```bash
uv add jin-monitor
# or
pip install jin-monitor
```

**2. Add the middleware to your app:**

```python
from fastapi import FastAPI
from jin import JinMiddleware

app = FastAPI()
app.add_middleware(
    JinMiddleware, 
    db_path="./jin.duckdb", 
    global_threshold=10.0
)
```

**3. Launch your app and open the Data Quality Dashboard:**

```text
http://127.0.0.1:8000/jin
```

## Documentation

Read the short docs in this order to become a Jin power user:

1. [Why Jin (Vision)](docs/vision.md)
2. [Getting Started](docs/getting-started.md)
3. [Configuration Guide](docs/configuration.md)
4. [Data Shape Guide](docs/data-contract.md)
5. [Incident Workflow](docs/incidents.md)
6. [CLI Operations](docs/operations-guide.md)
