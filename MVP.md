# Jin MVP Contract

## Product Goal
Jin helps FastAPI product and data teams catch business KPI drift in API responses before it becomes a product incident.

## Primary User
- Product owner or analyst responsible for business KPI correctness.

## Core Outcome
- A PO can set up monitoring for one API, upload reference targets, run checks, see mismatches, and resolve decisions without engineering help.

## P0 Scope (Must Ship)
1. API setup flow
- Assign segment fields, KPI fields, and time field.
- Save config successfully.

2. Reference targets flow
- Download CSV/XLSX template.
- Upload a reference/targets file with clear validation feedback.

3. Monitoring flow
- Trigger or schedule checks.
- See run history and run status.

4. Issue review flow
- See mismatch details and why it was flagged.
- Open active issues on the Issues page.
- Resolve or mark in-review from the UI.

5. Packaging flow
- Works for local installs via `pip`, `pipx`, `uv`, and `poetry`.
- Licensing is non-blocking by default in current MVP build.

## Out Of Scope (For Now)
- Cloud licensing enforcement APIs.
- Multi-user RBAC.
- Slack/PagerDuty integration.
- Hosted control plane.

## Release Gates
1. `make test-python` passes.
2. `make test-rust` passes.
3. `npx playwright test tests/e2e/zzz-mvp-acceptance.spec.ts` passes.
4. `make verify` passes.

## Working Defaults
1. Simpler UX over more knobs.
2. Trust and explainability over extra features.
3. Reversible implementation choices over hard-to-change architecture.
4. Tests are the contract for "done".

## Daily Autonomous Command
Use this exact prompt to continue with minimal back-and-forth:

`Run autonomous MVP mode on this repo. Follow MVP.md, MVP_BACKLOG.md, and KNOWN_GAPS.md. Complete the highest-priority open P0 item end-to-end, add/update tests, run verification commands, and then update backlog and known gaps. Only ask me if a decision changes scope, timeline, or architecture.`
