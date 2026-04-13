# Antigravity PO Runbook (Jin Reconciliation)

This is a manual UI validation runbook written from a PO acceptance perspective.
Goal: validate the end-to-end reconciliation workflow works in a real browser:

- API detection
- configuration (grain + time mapping)
- dataset upload (CSV)
- reconciliation run (manual + scheduler)
- issues displayed
- issues resolved/marked
- reporting

## What You Need

- A FastAPI app with Jin mounted at `/jin` (see the test app below).
- A browser (Chrome recommended).
- Two CSV files (provided below; copy/paste exactly).

## Test App (FastAPI) You Can Use

Create `app.py`:

```py
from __future__ import annotations

from fastapi import FastAPI, Query
from pydantic import BaseModel

from jin import JinMiddleware
from jin.router import create_router
from jin.watch import watch


class RevenueDataPoint(BaseModel):
    date: str
    revenue: float
    orders: int
    label: str = "current"
    api_version: str = "0.1.0"


class RevenueResponse(BaseModel):
    retailer: str
    data: list[RevenueDataPoint]


app = FastAPI(title="Jin QA App")
jin = JinMiddleware(app, db_path="./jin.qa.duckdb", global_threshold=10.0)
app.include_router(create_router(jin), prefix="/jin")
app.add_middleware(JinMiddleware, db_path="./jin.qa.duckdb", global_threshold=10.0)


def fixture(retailer: str, date: str) -> RevenueResponse:
    # Stable numbers for reconciliation
    mapping = {
        "amazon": (4711.9, 100),
        "shopify": (8400.0, 92),
        "walmart": (21000.75, 210),
    }
    revenue, orders = mapping.get(retailer.lower(), (100.0, 1))
    return RevenueResponse(
        retailer=retailer,
        data=[RevenueDataPoint(date=date, revenue=revenue, orders=orders)],
    )


@app.get("/api/revenue/{retailer}", response_model=RevenueResponse)
@watch(
    schedule="every 1h",
    default_params={"path_params": {"retailer": "amazon"}, "query_params": {"dates": ["2026-03-19"]}},
)
async def revenue_get(retailer: str, dates: list[str] = Query(None)) -> RevenueResponse:
    date = dates[0] if dates else "2026-03-19"
    return fixture(retailer, date)
```

Run:

```bash
export JIN_DISABLE_NATIVE=1
export JIN_DISABLE_NATIVE_CONFIG_LOAD=1
uvicorn app:app --host 127.0.0.1 --port 8000
```

### API Contract (What Jin Should Detect)

- `GET /api/revenue/{retailer}`
  - Query params: `dates` list (e.g. `?dates=2026-03-19`)
  - Response:

```json
{
  "retailer": "amazon",
  "data": [
    {
      "date": "2026-03-19",
      "revenue": 4711.9,
      "orders": 100,
      "label": "current",
      "api_version": "0.1.0"
    }
  ]
}
```

## CSVs To Use (Copy/Paste Exactly)

You will upload one of these (either format is acceptable).

### CSV A (Separate Columns Per Dimension)

Filename: `revenue_separate_columns.csv`

```csv
retailer,label,api_version,date,revenue,orders,tolerance_pct
amazon,current,0.1.0,2026-03-19,6000.0,100,10
```

Expected outcome:
- This should create a reconciliation issue (revenue mismatch beyond 10%).

### CSV B (Single Group Column)

Filename: `revenue_group_column.csv`

```csv
Group,revenue,orders,Tolerance %
"retailer=amazon | label=current | api_version=0.1.0 | date=2026-03-19",6000.0,100,10
```

Expected outcome:
- Same as CSV A. This is the PO-friendly “Group string” format.

## Manual UI Test Cases (Exact Clicks + Expected Results)

All URLs below assume your app is on `http://127.0.0.1:8000`.

### 0) Preflight (Build + Mount)

1. Open `http://127.0.0.1:8000/jin`.
1. Open `http://127.0.0.1:8000/jin/api/v2/debug/build`.

Expected:
- `/jin` loads dashboard HTML (not 404).
- `/jin/api/v2/debug/build` returns JSON, includes `disable_native` and `router_mtime_ns`.

Screenshot to capture:
- Dashboard landing page.
- Debug JSON response (in browser).

### 1) API Detection

1. In a new tab, hit the API once:
   - `http://127.0.0.1:8000/api/revenue/amazon?dates=2026-03-19`
1. Go back to `/jin` dashboard.
1. Open “APIs” list, select `/api/revenue/{retailer}`.

Expected:
- Endpoint appears as tracked.
- Endpoint detail loads and shows fields for:
  - `retailer`
  - `data[].date`
  - `data[].revenue`
  - `data[].orders`
  - `data[].label`
  - `data[].api_version`

Screenshot to capture:
- APIs list with the endpoint visible.
- Endpoint detail page showing detected fields.

### 2) Configuration (Must Block Upload If Incomplete)

1. Open “Configuration” tab for `/api/revenue/{retailer}`.
1. Set:
   - Segment fields (dimensions): `retailer`, `label`, `api_version`, `date`
   - Metric fields (KPIs): `revenue`, `orders`
   - Time field: `date`
   - Rows path: `data` (if required by UI)
1. Click “Save configuration”.

Expected:
- Save succeeds.
- If you intentionally skip a required selection, Jin should show guidance and NOT allow the flow to proceed.

Screenshot to capture:
- Configuration screen before save.
- Confirmation toast / saved state after save.

### 3) Upload Preview

1. Go to “Uploads” (or the upload step) for the endpoint.
1. Choose `revenue_group_column.csv` (or `revenue_separate_columns.csv`).
1. Click “Check file”.

Expected:
- Preview shows:
  - Parsed rows count = 1
  - A “Group” preview line like: `retailer=amazon | label=current | api_version=0.1.0 | date=2026-03-19`
  - Metrics preview: `revenue`, `orders`
- No red error toast.
- If time mapping confidence says “Not validated yet”, Jin must show guidance (hit the API again or paste JSON sample).

Screenshots to capture:
- Upload preview section.
- Any warnings list (if present).

### 4) Confirm Upload

1. Click “Confirm” (or “Next: Monitor API” depending on the UI).

Expected:
- Upload persists.
- Returning to the endpoint detail shows references/targets stored.

Screenshot:
- The stored reference rows (or confirmation state).

### 5) Run Reconciliation (Manual Check)

1. Go to “Monitor API” (or equivalent).
1. Click “Run check now” (or the manual check button).

Expected:
- Check run succeeds.
- Jin reports a mismatch issue because expected `revenue=6000.0` but API returns `4711.9` for that grain.

Screenshot:
- Monitoring run result.
- Issue card/table showing mismatch details.

### 6) Issues Lifecycle

1. Open the issue detail.
1. Take each action supported by the UI (capture one screenshot each):
   - Resolve / Mark resolved
   - Snooze (if available)
   - Add note / owner (if available)
1. Refresh the page.

Expected:
- Issue state persists (resolved issues move out of “active” if that’s the product behavior).

### 7) Reporting

1. Open “Reports”.
1. Select “All tracked APIs”.
1. Click “Generate report”.

Expected:
- Reports summary loads (no 404).
- If “leadership digest” is not available, Jin should still produce a report via summary + endpoint reports (no hard failure).

Screenshot:
- Report summary view.
- Any “download pack” result if present.

## Acceptance Criteria (PO Definition of Done)

- Upload preview never crashes; errors are guidance, not stack traces.
- Confirm/upload is blocked if setup is incomplete.
- Reconciliation produces a clear, PO-readable mismatch:
  - which grain (segment values)
  - which metric
  - expected vs actual
  - tolerance applied
- Issues can be marked/resolved with persistence.
- Reporting works without returning 404.

