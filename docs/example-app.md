# Maintainer Demo Harness

An internal demo harness lives in `examples/fastapi_demo/app.py`.

It shows:

- a monitored sales endpoint
- a monitored inventory endpoint
- a watched endpoint
- Jin middleware mounted directly into a FastAPI app

Run it locally when you want to verify the embedded operator console and
endpoint wiring inside a real FastAPI app.

## Quick Run

```bash
cp .env.example .env
make develop
PYTHONPATH=python .venv/bin/python -m uvicorn examples.fastapi_demo.app:app --host 127.0.0.1 --port 8000
```

Then open:

- `http://127.0.0.1:8000/api/revenue/amazon/YTD`
- `http://127.0.0.1:8000/api/inventory/amazon`
- `http://127.0.0.1:8000/jin`

The fuller walkthrough lives in the repo at `examples/fastapi_demo/README.md`.
This harness is for maintainers only and is not part of the customer-facing
install story.
