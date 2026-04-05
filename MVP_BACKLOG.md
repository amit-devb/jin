# MVP Backlog

The post-MVP product direction now lives in [docs/vision.md](docs/vision.md).

Status values: `OPEN`, `IN_PROGRESS`, `DONE`, `BLOCKED`

## P0 Now

| ID | Priority | Status | Item | Acceptance Criteria |
|---|---|---|---|---|
| P0-001 | P0 | DONE | Restore full verify gate | `make verify` passes with no manual overrides. |
| P0-002 | P0 | DONE | Packaging smoke tests for install methods | CI or local script validates install and startup for `pip`, `pipx`, `uv`, `poetry`. |
| P0-003 | P0 | DONE | First-time setup clarity when no runtime samples exist | In configuration screen, user can still assign roles/time controls while "no sample yet" is framed as preview-only, not a blocker. Add UI regression test. |
| P0-004 | P0 | DONE | Mismatch-to-Issues trust hardening | Upload mismatch appears in Issues reliably across refresh and project-switch scenarios. Add E2E regression. |

## P0 Done

| ID | Priority | Status | Item | Proof |
|---|---|---|---|---|
| P0-D01 | P0 | DONE | Editable config controls when PO mode is off | `tests/e2e/dashboard-upload-history.spec.ts` test: `configuration keeps roles and time controls editable when PO mode is off`. |
| P0-D02 | P0 | DONE | End-to-end MVP happy path test | `tests/e2e/zzz-mvp-acceptance.spec.ts` passing. |
| P0-D03 | P0 | DONE | Upload mismatch materialization behavior tested | `tests/test_runtime.py` mismatch materialization tests passing. |
| P0-D04 | P0 | DONE | Licensing non-blocking by default | `JIN_LICENSE_ENFORCEMENT` toggle implemented and tested in `tests/test_coverage_phase5.py`. |
| P0-D05 | P0 | DONE | Full verify gate restored | `make verify` passing with Python coverage at 93%. |
| P0-D06 | P0 | DONE | First-time setup UX de-frictioned | Focused setup view, no-sample copy, and UI regression checks in E2E. |
| P0-D07 | P0 | DONE | Upload mismatch issue-sync trust hardened | Upload mismatch issues refresh in place (no duplicate churn) with refresh-safe E2E and runtime tests. |
| P0-D08 | P0 | DONE | Incident visibility and PO lock clarity hardening | Issues view now supports clear-filter recovery and upload-to-issues resets filters/refreshes before navigation. Configuration now shows explicit PO lock guidance with one-click unlock. E2E coverage added. |
| P0-D09 | P0 | DONE | Install matrix and wheel packaging hardening | `scripts/smoke_install_matrix.sh` validates `pip`/`pipx`/`uv`/`poetry`; script now pins interpreter paths robustly and enforces method availability. `pyproject.toml` now includes `python-packages = ["jin", "jin_core"]`. Regression checks added in `tests/test_packaging_metadata.py`. |

## P1 Later

| ID | Priority | Status | Item | Acceptance Criteria |
|---|---|---|---|---|
| P1-001 | P1 | OPEN | Better business impact scoring in issue cards | Issue cards show impact estimate and recommended operator action. |
| P1-002 | P1 | OPEN | Portfolio-level monitoring UX polish | Project workflows and monitor snapshots become easier to scan for non-engineers. |

## Execution Rule
- Always pull the highest-priority `OPEN` or `BLOCKED` P0 first.
- A task moves to `DONE` only after code + tests + verification evidence are recorded.
