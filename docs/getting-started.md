# Getting Started

Set up Jin in your own FastAPI app.

## 1. Install

```bash
uv add jin-monitor
```

or:

```bash
pip install jin-monitor
```

## 2. Add Middleware

```python
from fastapi import FastAPI
from jin import JinMiddleware

app = FastAPI()
app.add_middleware(JinMiddleware, db_path="./jin.duckdb", global_threshold=10.0)
```

## 3. Open `/jin`

Run your app and open the dashboard:

```text
/jin
```

From there you can:

- confirm the discovered response model
- choose dimensions, KPIs, and time
- upload baselines
- review issues

## 4. Optional Auth

```env
JIN_AUTH_ENABLED=true
JIN_USERNAME=owner
JIN_PASSWORD=change-me
```

## 5. Helpful Commands

```bash
jin setup app.main
jin doctor --app package.module:app
jin verify --app package.module:app
jin issues list
```
