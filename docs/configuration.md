# Configuration Guide

Jin uses the FastAPI `response_model` as the source of truth.
If a route does not have one, setup should stop and ask you to add it first.

## Choose Roles

For each endpoint, Jin helps you choose:

- dimensions
- KPIs
- time field
- fields to ignore

## Tolerances

Jin supports:

- `relaxed`
- `normal`
- `strict`

## References

Upload CSV or XLSX references for the business grain you want to monitor.

## Simple Rule

1. Define a typed Pydantic response model.
2. Open `/jin` and review the detected fields.
3. Confirm dimensions, KPIs, and time.
4. Upload a reference targets file.
