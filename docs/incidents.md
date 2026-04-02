# Incident Workflow

Jin incidents are meant to be triaged inside the same app that produced the data.

## Status Model

Jin supports these operator-driven statuses:

- `active`
- `acknowledged`
- `snoozed`
- `suppressed`
- `resolved`

These are not just labels for the UI. They are part of the operator workflow and appear in anomaly payloads and history.

## What An Operator Can Do

From the `/jin` console, an operator can:

- acknowledge an incident that is understood but still open
- snooze an incident until a specific time
- suppress an incident during a known-noisy window
- resolve an incident with a reason
- apply bulk actions across multiple incidents
- leave notes that explain what was investigated

## Why An Incident Was Flagged

Each anomaly payload can include:

- a human-readable explanation of why it was flagged
- the actual value that triggered the incident
- the expected value or reference
- the baseline source that was used
- what changed since the last healthy comparison point
- severity and confidence

## Timeline

Jin keeps an anomaly history and incident event trail so operators can answer:

- when did this start
- who changed the state
- when was it snoozed or suppressed
- what resolution reason was recorded

## Recommended Operator Flow

1. Open the anomaly list and sort by severity.
2. Review the baseline and explanation for the incident.
3. Check the endpoint detail trend summary.
4. Leave a note if investigation is in progress.
5. Acknowledge, snooze, suppress, or resolve the incident.

## Bulk Actions

Bulk actions are useful when:

- one upstream issue creates several related anomalies
- a deployment window causes known noise
- a reference update is expected to generate temporary drift
