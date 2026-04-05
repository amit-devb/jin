# Operations Guide

This page is for running a customer project inside your own infrastructure.

## Use It For

- endpoint drilldowns
- trend summaries
- issue review
- scheduler checks
- reference updates

## What To Do

1. Review the endpoint.
2. Check the baseline and recent trend.
3. Review Issues if anything drifted.
4. Update references when the change is expected.

## CLI

```bash
jin config show --endpoint "/api/revenue/{retailer}/{period}"
jin issues list
jin references import --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv
```
