# Data Shape Guide

Jin learns the API shape from the Pydantic response model first.

## What Jin Uses

- dimensions
- KPIs
- time field
- nested field paths
- field examples

## What You Provide

- a typed FastAPI `response_model`
- a flat CSV or XLSX baseline

## Simple Rule

If the model is missing or too generic, Jin should tell you to improve it before setup can continue.

## Example

Jin can flatten a response like this:

```json
{
  "retailer": "amazon",
  "data": [
    {
      "snapshot_date": "2026-03-19",
      "revenue": 5000,
      "orders": 100
    }
  ]
}
```

It then maps the same business grain to your baseline file.
