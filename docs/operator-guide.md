# Operator Guide

## Incident Statuses

Jin supports operator-driven incident states:

- `active`
- `acknowledged`
- `snoozed`
- `suppressed`
- `resolved`

## Explainability

Each anomaly can include:

- why it was flagged
- which baseline was used
- actual versus expected values
- change since the last healthy comparison point

## Scheduler Controls

Scheduler jobs can be:

- run immediately
- paused
- resumed

The dashboard also surfaces:

- last status
- retry backoff windows
- recent run history

## Error Center

The dashboard now includes an `Errors` workspace for project-local Jin failures.

Operators can:

- review recent middleware, router, config, upload, and scheduler failures
- acknowledge noisy errors while keeping them visible
- archive resolved errors without deleting the project-local record
- filter by category and severity
- filter by error status
- search by endpoint, message, or remediation hint
- export the current error view

Each error is scoped to the current project install and includes:

- source
- message
- endpoint, when available
- remediation hint
- remediation steps
- raw detail when available

## References And Configuration

Operators can:

- upload flat CSV/XLSX references
- import/export references from the CLI
- manage dimensions and KPIs
- set tolerance mode
- review endpoint drilldowns and trend summaries

Useful commands:

```bash
jin config show --endpoint "/api/revenue/{retailer}/{period}"
jin config set --endpoint "/api/revenue/{retailer}/{period}" --dimensions retailer,period --kpis revenue
jin references import --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv
jin references export --endpoint "/api/revenue/{retailer}/{period}" --format json
```

## Endpoint Drilldown

The endpoint detail view is designed to answer:

- what changed
- when it changed
- what baseline was used
- which KPI moved
- which incidents have happened recently for this endpoint

## Anomaly Triage

The anomaly area is optimized for action, not just detection.

Operators can:

- inspect the explanation and baseline used
- check the change since the last healthy run
- add notes
- acknowledge or resolve with reason
- snooze or suppress noisy incidents
- apply bulk actions when a shared upstream issue affects several endpoints

Useful commands:

```bash
jin issues list
jin issues update --id 12 --action acknowledged --note "reviewed"
```
