# Jin

Jin is open-source Rust-first monitoring for FastAPI APIs.
It watches response data at the business grain, stores observations in DuckDB,
and shows the dashboard at `/jin`.

## Why Jin

We built Jin so FastAPI teams can catch business KPI drift inside the app they
already run, using the response model and local data they already have.
For the longer product direction, see [Why Jin](docs/vision.md).

## Start Here

1. Install:

```bash
uv add jin-monitor
```

2. Add the middleware:

```python
from fastapi import FastAPI
from jin import JinMiddleware

app = FastAPI()
app.add_middleware(JinMiddleware, db_path="./jin.duckdb", global_threshold=10.0)
```

3. Open the dashboard:

```text
/jin
```

## Useful Commands

```bash
jin setup app.main
jin doctor --app package.module:app
jin verify --app package.module:app
jin endpoints list --app package.module:app
jin issues list
jin references import --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv
```

## Docs

Read the short docs in this order:

1. [Why Jin](docs/vision.md)
2. [Getting Started](docs/getting-started.md)
3. [Configuration Guide](docs/configuration.md)
4. [Data Shape Guide](docs/data-contract.md)
5. [Incident Workflow](docs/incidents.md)
6. [CLI Guide](docs/cli.md)
7. [Operations Guide](docs/operations-guide.md)
