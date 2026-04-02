# Getting Started

## Install

Use your preferred Python workflow:

```bash
uv add jin-monitor
```

or

```bash
pip install jin-monitor
```

or

```bash
poetry add jin-monitor
```

Fastest setup:

```bash
jin setup app.main
```

## Enable Middleware

```python
from fastapi import FastAPI
from jin import JinMiddleware

app = FastAPI()
app.add_middleware(JinMiddleware, db_path="./jin.duckdb", global_threshold=10.0)
```

## Optional Auth

Set simple project-local auth in your `.env`:

```env
JIN_PROJECT_NAME=my-fastapi-project
JIN_DB_PATH=./jin.duckdb
JIN_LOG_LEVEL=INFO
JIN_AUTH_ENABLED=true
JIN_USERNAME=operator
JIN_PASSWORD=change-me
```

You can start from the repo template:

```bash
cp .env.example .env
```

Or bootstrap local config from the installed CLI:

```bash
jin quickstart --app package.module:app --write
jin init --interactive
jin auth rotate
jin auth status
jin env check
jin status --app package.module:app
jin urls --port 8000
jin doctor --fix --app package.module:app
jin doctor --app package.module:app --format json
jin references validate --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv --format json
```

If you already know your FastAPI app import path, setup can also discover and seed endpoints immediately:

```bash
jin init --interactive --app package.module:app
```

## Open The Console

Run your FastAPI app and open:

```text
/jin
```

From there you can:

- inspect endpoints
- confirm KPI and dimension fields
- upload references
- review anomalies
- snooze, suppress, acknowledge, or resolve incidents

## Helpful CLI Commands

```bash
jin doctor --app package.module:app
jin verify --app package.module:app
jin endpoints list --app package.module:app
jin templates generate --endpoint "/api/revenue/{retailer}/{period}" --format csv
jin references import --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv
jin issues list
```

## Project-Local Deployment Model

Jin is meant to run inside the client project's own infrastructure.

- the FastAPI app serves the Jin dashboard
- DuckDB stays in the project environment unless you point it elsewhere
- project identity comes from `.env` and local app config
- incidents, uploads, scheduler runs, and recent errors are isolated to that project install
- terminal diagnostics honor `JIN_LOG_LEVEL`, so operators can choose quiet production logs or verbose local debugging

## Recommended First Session

1. Add Jin to a small FastAPI app.
2. Hit a monitored endpoint a few times with different values.
3. Open `/jin` and review the discovered schema.
4. Save dimensions, KPIs, and tolerance mode.
5. Upload a reference file for one endpoint.
6. Trigger a noticeable change and review the resulting incident.
