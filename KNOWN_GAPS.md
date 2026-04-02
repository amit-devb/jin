# Known Gaps

This file tracks active product and quality risks for MVP.

## GAP-001
- Severity: High
- Status: Resolved
- Area: Verification
- Problem: `make verify` previously failed at Python coverage gate.
- User Impact: Previously reduced release confidence.
- Owner: Engineering
- Next Action: Keep verify green as a release blocker.

## GAP-002
- Severity: High
- Status: Resolved
- Area: Packaging
- Problem: No explicit smoke test matrix proving `pip`, `pipx`, `uv`, and `poetry` install paths for MVP.
- User Impact: Installation trust risk for early adopters.
- Owner: Engineering
- Next Action: Keep install smoke matrix green in CI and preserve package metadata regression checks.

## GAP-003
- Severity: Medium
- Status: Resolved
- Area: UX Clarity
- Problem: "Waiting for sample API data" could be misread as setup blocked.
- User Impact: Previously caused setup hesitation.
- Owner: Product + Frontend
- Next Action: Keep focused setup UX and copy regression checks stable.

## GAP-004
- Severity: Medium
- Status: Resolved
- Area: Issue Sync
- Problem: Upload mismatch to Issues sync previously felt inconsistent.
- User Impact: Previously reduced trust in triage flow.
- Owner: Engineering
- Next Action: Maintain update-in-place dedupe logic and refresh/navigation E2E assertions.

## GAP-005
- Severity: Medium
- Status: Resolved
- Area: Incident UX
- Problem: Issue filters and PO mode lock state could feel opaque, leading to false "no issues" or "unclickable controls" moments.
- User Impact: Previously reduced confidence in triage and setup flow.
- Owner: Product + Frontend
- Next Action: Keep clear-filter empty-state guidance, upload-to-issues reset behavior, and PO lock messaging covered by E2E tests.
