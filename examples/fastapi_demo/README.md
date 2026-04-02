# Jin Maintainer Harness

This internal harness gives maintainers a fast way to see Jin working inside a
real FastAPI project.

It is for repository verification and maintainer onboarding only, not for the
customer-facing install story.

## What It Shows

- a revenue endpoint with dimensional business metrics
- an inventory endpoint with a second KPI surface
- a watched endpoint that can be scheduled by Jin
- the embedded `/jin` operator console

## Run It

From the repo root:

```bash
cp .env.example .env
make develop
PYTHONPATH=python .venv/bin/python -m uvicorn examples.fastapi_demo.app:app --host 127.0.0.1 --port 8000
```

Then open:

- `http://127.0.0.1:8000/api/revenue/amazon/YTD`
- `http://127.0.0.1:8000/api/revenue/amazon/YTD?value=160`
- `http://127.0.0.1:8000/api/inventory/amazon`
- `http://127.0.0.1:8000/jin`

## Suggested Maintainer Run

1. Open `/jin` and inspect the discovered endpoints.
2. Mark `retailer` and `period` as dimensions for the revenue endpoint.
3. Keep `revenue` and `orders` as KPIs.
4. Hit the revenue endpoint a few times with different `value=` query params.
5. Upload a reference file or save a tighter tolerance in the console.
6. Trigger a larger value jump and watch Jin create an incident.

## Notes

- The demo stores state in `./demo-jin.duckdb`.
- If auth is enabled in `.env`, the browser will prompt for the configured username and password before opening `/jin`.
- This harness is for repository verification and maintainer onboarding only.
