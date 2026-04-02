# Jin

Open-source Rust-first data quality monitoring for FastAPI.

Jin watches API responses at the business grain level, stores observations in DuckDB,
detects anomalies, and mounts an operator console at `/jin`.

Project docs are published on GitHub Pages at [https://amit-devb.github.io/jin/](https://amit-devb.github.io/jin/).

## What You Get

- embedded FastAPI middleware
- Rust-backed anomaly detection
- local DuckDB persistence
- reference uploads and templates
- scheduler-backed watch runs
- health and report APIs for review
- inline operator console at `/jin`
- operator workflows for setup, checks, triage, and reporting
- incident triage with acknowledge, snooze, suppress, bulk actions, notes, and resolution
- project-local single-user auth through `.env`

## Quick Start

Install with your preferred workflow:

```bash
pip install jin-monitor
```

or

```bash
uv add jin-monitor
```

or

```bash
poetry add jin-monitor
```

Fastest setup:

```bash
uv add jin-monitor
jin setup app.main
```

If your FastAPI object is named something other than `app`:

```bash
jin setup app.main --app-var api
```

Add Jin to your FastAPI app:

```python
from fastapi import FastAPI
from jin import JinMiddleware

app = FastAPI()
app.add_middleware(JinMiddleware, db_path="./jin.duckdb", global_threshold=10.0)
```

Optional project-local auth in `.env`:

```env
JIN_PROJECT_NAME=my-fastapi-project
JIN_DB_PATH=./jin.duckdb
JIN_LOG_LEVEL=INFO
JIN_AUTH_ENABLED=true
JIN_USERNAME=operator
JIN_PASSWORD=change-me
JIN_RUNTIME_HISTORY_LIMIT=2000
JIN_RUNTIME_ANOMALY_LIMIT=2000
JIN_ASYNC_INGEST_ENABLED=true
JIN_INGEST_QUEUE_SIZE=2000
JIN_INGEST_WORKERS=1
JIN_SCHEDULER_LEADER_LOCK=true
JIN_SCHEDULER_LOCK_DIR=./.jin/locks
```

To generate stronger local auth values:

```bash
jin auth rotate --write-env
jin auth status
jin env check
jin env set --project-name my-fastapi-project --db-path ./jin.duckdb
jin status --app package.module:app
jin urls --port 8000
jin urls --port 8000 --launch console
jin open --port 8000 --launch
jin doctor --fix --app package.module:app
jin doctor --app package.module:app --format json
jin ci check --app package.module:app --format json
jin report summary --format markdown
jin endpoints list --app package.module:app --format json
jin watches list --app package.module:app --format json
jin references validate --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv --format json
jin completion zsh
```

Watch schedules support:

- `every Nh` (interval)
- `daily HH:MM`
- `weekly mon[,tue,...] HH:MM`

Or use your own chosen password:

```bash
jin auth rotate --password "your-password" --write-env
```

Repo contributors can still use:

```bash
make auth-generate
make smoke-installs
```

## CLI

Installed users can operate Jin from the terminal too:

```bash
jin setup app.main
jin quickstart --app package.module:app --write
jin init --interactive
jin init --app package.module:app --write
jin init --app package.module:app --write --open
jin patch fastapi --app-file app.main
jin doctor --app package.module:app
jin verify --app package.module:app
jin ci check --app package.module:app --fail-on-issues
jin endpoints list --app package.module:app
jin config show --endpoint "/api/revenue/{retailer}/{period}"
jin config set --endpoint "/api/revenue/{retailer}/{period}" --dimensions retailer,period --kpis revenue
jin templates generate --endpoint "/api/revenue/{retailer}/{period}" --format csv
jin references import --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv
jin references export --endpoint "/api/revenue/{retailer}/{period}" --format json
jin issues list
jin issues update --id 12 --action acknowledged --note "reviewed"
jin watches list --app package.module:app
jin watches run --app package.module:app --endpoint "/api/watch/{retailer}"
```

You can also seed the local Jin database with discovered FastAPI endpoints during setup:

```bash
jin init --interactive --app package.module:app
```

Jin is designed to live inside the client project's own infrastructure:

- the dashboard is mounted inside the FastAPI app
- DuckDB stays local to the project deployment
- project identity is local to that install
- recent operator errors and incidents are isolated per project
- terminal logs use the configured `JIN_LOG_LEVEL` for project-local diagnostics

Or start from the included template:

```bash
cp .env.example .env
```

Start the app, then open:

```text
/jin
```

## Core Operator APIs

The first-release workflow centers on a single project. The endpoints below can automate that path, with preferred PO-friendly names first and legacy aliases still supported:

For the data shape learning guide, see [Data Shape Guide](docs/data-contract.md).

- Preferred stable base: `/jin/api/v2/...`
- Backward compatibility: `/jin/api/...` aliases remain available during migration
- Migration notes: `docs/api-v2-migration.md`
- Legacy core routes now emit deprecation headers with a sunset: `Deprecation`, `Sunset`, and `Link` to `/jin/api/v2/migration`

- `POST /jin/api/upload/{path}`: configure baseline by uploading CSV/XLSX references
- `POST /jin/api/check/{path}`: trigger a monitor run now
- `POST /jin/api/promote-baseline/{path}`: refresh baseline from recent history
- `GET /jin/api/health`: project-level health checks (`/jin/api/health-check` alias)
- `POST /jin/api/projects/register` (legacy: `POST /jin/api/register`): register operator credentials and initialize current project metadata
- `GET/POST /jin/api/projects`: list and add projects in the local install
- `POST /jin/api/projects/activate` (legacy: `POST /jin/api/projects/select`): switch active project context
- `GET /jin/api/projects/current` (legacy: `GET /jin/api/projects/active`): return currently selected project
- `GET /jin/api/portfolio/health` (legacy: `GET /jin/api/projects/monitor`): monitor health snapshots across projects in the local install
- `GET/POST /jin/api/projects/{project_id}/check-plan` (legacy: `/monitor-policy`): configure schedule template, baseline mode, and recurring report defaults per project
- `POST /jin/api/projects/{project_id}/check-plan/apply` (legacy: `/monitor-policy/apply`): apply project check plan to endpoint watch configs
- `POST /jin/api/projects/{project_id}/check-plan/bootstrap` (legacy: `/monitor-bootstrap`): one-shot bootstrap apply for current runtime endpoints
- `POST /jin/api/projects/{project_id}/checks/run` (legacy: `/run-bundle`): execute a monitoring bundle across selected watched endpoints
- `GET /jin/api/projects/{project_id}/checks/history` (legacy: `/run-bundle/history`): list recent bundle run artifacts
- `GET /jin/api/projects/{project_id}/checks/{run_id}` (legacy: `/run-bundle/{run_id}`): retrieve one bundle run artifact
- `GET /jin/api/projects/{project_id}/checks/{run_id}/report` (legacy: `/run-bundle/{run_id}/report`): report pack (`?format=markdown` supported)
- `POST /jin/api/projects/{project_id}/baseline/refresh` (legacy: `/baseline/promote`): promote baselines in bulk for a selected project
- `GET /jin/api/status?project_id=...`: read status for a selected project context
- `GET /jin/api/health?project_id=...`: run health checks for a selected project context
- `POST /jin/api/watch-config/{path}`: schedule checks and baseline mode per endpoint
- `GET /jin/api/reports/summary` (legacy: `/report/summary`): executive summary (`?format=markdown&project_id=...` supported)
- `GET /jin/api/reports/leadership-digest` (legacy: `/report/executive-digest`): project digest (`?days=7&format=markdown&project_id=...` supported)
- `GET /jin/api/reports/endpoint/{path}` (legacy: `/report/endpoint/{path}`): endpoint-level report (`?format=markdown&project_id=...` supported)
- `GET /jin/api/v2/po/playbook` (legacy alias: `/jin/api/po/playbook`): workflow catalog for monitor, validate, regression, and reporting
- `GET /jin/po` (alias: `/jin/po/docs`): dashboard entrypoint that opens Jin in Playbook mode

## Maintainer Demo Harness

An internal maintainer harness lives in `examples/fastapi_demo/app.py`.

Run it with:

```bash
make demo-run
```

Then visit:

- `http://127.0.0.1:8000/api/revenue/amazon/YTD`
- `http://127.0.0.1:8000/api/inventory/amazon`
- `http://127.0.0.1:8000/jin`
- `http://127.0.0.1:8000/jin/po`

This harness is for repository verification and maintainer onboarding only.

## Docs

The docs site scaffold lives under `docs/` and `mkdocs.yml`.

To serve it locally:

```bash
make docs-serve
```

Key pages:

- `docs/getting-started.md`
- `docs/operator-guide.md`
- `docs/incidents.md`
- `docs/configuration.md`
- `docs/api-v2-migration.md`
- `docs/example-app.md`
- `docs/release.md`

## Architecture

Jin is intentionally split into a native core and a thin Python wrapper.

### Rust core

- `src/core/types.rs`: config and result types
- `src/core/json.rs`: flattening and numeric helpers
- `src/core/grain.rs`: dimension lookup and deterministic grain keys
- `src/core/storage.rs`: DuckDB schema, persistence, config/reference storage
- `src/core/engine.rs`: observation processing, anomaly logic, status/detail orchestration
- `src/lib.rs`: PyO3 bindings only

### Python adapter

- `python/jin/config.py`: Pydantic/FastAPI reflection and normalized config shaping
- `python/jin/middleware.py`: FastAPI middleware, runtime cache, and DB-coordination glue
- `python/jin/router.py`: `/jin` API routes and native-first fallback orchestration
- `python/jin/scheduler.py`: APScheduler integration and watch job runtime state
- `python/jin/dashboard.py`: operator dashboard HTML/JS
- `python/jin/uploader.py`: CSV/XLSX parsing and validation
- `python/jin/templates.py`: reference template generation
- `python/jin/watch.py`: watch decorator

Compatibility entrypoints are preserved under:

- `python/jin/app/`
- `python/jin/core/`
- `python/jin/io/`

## Verification

Primary commands:

```bash
make develop
make test-python
make coverage-python
make test-rust
make docs-serve
make verify
make verify-full
make coverage-rust
```

Direct commands:

```bash
UV_CACHE_DIR=.uv-cache PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 PYTHONPATH=python .venv/bin/maturin develop
PYTHONPATH=python .venv/bin/coverage run --rcfile=.coveragerc -m pytest
PYTHONPATH=python .venv/bin/coverage report --rcfile=.coveragerc -m
PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 cargo test
PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 cargo llvm-cov --ignore-filename-regex '(/.cargo/registry|target/)' --summary-only
```

Branch protection setup (required checks on `main`):

```bash
GH_TOKEN=your_repo_admin_token make protect-main
```

This sets required checks to:

- `CI / verify`
- `CI / e2e`

## Current Expectations

- Python integration and end-to-end tests stay green
- Python package coverage stays at `100%`
- Rust tests stay green
- Native coverage is tracked and improved as Rust behavior expands

## Status

The project is functional as a Rust-first FastAPI product and includes:

- MVP operator UX
- reference management and uploads
- scheduler controls
- incident explainability and triage
- docs scaffold
- maintainer demo harness
- CI and publish workflow scaffolding

External release steps still depend on your final execution:

- real PyPI publish
- running GitHub Actions in your remote repo
