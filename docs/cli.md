# CLI Guide

Jin ships with an installed CLI for setup, auth, inspection, and CI checks.

## First-Time Setup

```bash
jin quickstart --app package.module:app --write
jin auth rotate --write-env
jin patch fastapi --app-file app.main
jin patch fastapi --app-file app.main --check
jin patch fastapi --app-file app.main --dry-run
jin urls --port 8000
jin urls --port 8000 --launch console
jin open --port 8000 --launch
```

## Setup Checks

```bash
jin env check
jin env set --project-name my-service --db-path ./jin.duckdb
jin auth status
jin doctor --app package.module:app
jin doctor --fix --app package.module:app
jin verify --app package.module:app
jin ci check --app package.module:app --fail-on-issues
```

For CI or scripts:

```bash
jin doctor --app package.module:app --strict --format json
jin verify --app package.module:app --strict --format json
```

## Status And Discovery

```bash
jin status --app package.module:app
jin report summary --format markdown
jin endpoints list --app package.module:app
jin watches list --app package.module:app
```

JSON output is supported too:

```bash
jin status --app package.module:app --format json
jin endpoints list --app package.module:app --format json
jin watches list --app package.module:app --format json
```

## References And Templates

```bash
jin templates generate --endpoint "/api/revenue/{retailer}/{period}" --format csv
jin references validate --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv
jin references import --endpoint "/api/revenue/{retailer}/{period}" --file refs.csv
jin references export --endpoint "/api/revenue/{retailer}/{period}" --format json
```

## Issues

```bash
jin issues list
jin issues list --format json
jin issues update --id 12 --action acknowledged --note "reviewed"
jin issues update --id 12 --action resolved --resolution-reason "baseline updated" --format json
```

## Small Helpers

```bash
jin open --port 8000
jin open --port 8000 --launch
jin urls --format json
jin completion zsh
jin completion bash
```
