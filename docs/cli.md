# CLI Guide

Jin ships with a small CLI for setup, inspection, and checks.

## Most Useful Commands

```bash
jin setup app.main
jin doctor --app package.module:app
jin verify --app package.module:app
jin status --app package.module:app
jin endpoints list --app package.module:app
jin issues list
jin references import --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv
```

## Setup Helpers

```bash
jin quickstart --app package.module:app --write
jin init --interactive --app package.module:app
jin auth rotate --write-env
jin env check
```

## JSON Output

Add `--format json` when you want machine-readable output.
