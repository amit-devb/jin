# Jin

Jin is an open-source embedded monitoring and operator console for FastAPI responses.

It helps operators:

- observe endpoint behavior over time
- compare live results against references and learned baselines
- review anomalies inside the app
- configure dimensions, KPIs, and tolerances without leaving the project

Jin is designed to live inside the user's own codebase and runtime, not as a separate hosted dependency.

The public docs site lives on GitHub Pages at [https://amit-devb.github.io/jin/](https://amit-devb.github.io/jin/).

## What Jin Gives You

- FastAPI middleware integration
- Rust-backed anomaly detection
- DuckDB-backed local persistence
- inline `/jin` operator console
- reference uploads
- scheduler watches
- configuration and upload validation flows
- incident review, snooze, suppress, bulk actions, and resolution

## MVP Focus

The current MVP focuses on:

- operator UX for a single project install
- anomaly explainability
- incident operations
- single-user project-local auth
- docs, examples, onboarding, and packaging

## Start Here

If you are new to the repo, the fastest path is:

1. Follow [Getting Started](getting-started.md).
2. Run the [Example App](example-app.md).
3. Review the [Operator Guide](operator-guide.md).
4. Read the [Data Shape Guide](data-contract.md) before wiring a new endpoint or upload.
5. Use the [Incident Workflow](incidents.md) and [Configuration Guide](configuration.md) while exploring `/jin`.
