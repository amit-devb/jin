# Architecture Blueprint

This document defines how Jin stays fast to install, reliable to run, and safe to evolve across macOS, Linux, and Windows.

## Non-Negotiable Outcomes

1. Install path must not require local Rust compilation for default users.
2. Jin must never crash route discovery because of response model shape.
3. Jin must provide a working reconciliation path even when native extension loading fails.
4. CI must continuously validate install and runtime paths across major operating systems.

## Product Contract

Jin has two runtime layers:

1. Python FastAPI layer (always available)
2. Native Rust layer (accelerator and durable logic owner)

The Python layer owns framework integration and degraded-mode continuity.
The Rust layer owns durable business logic and persistence semantics when native is available.

## Packaging and Installation Strategy

## Default distribution contract

- `jin-monitor` installs as a Python-first package.
- No Rust toolchain is required for default install.
- The install path must remain stable for `pip`, `uv`, `pipx`, and Poetry.

## Native acceleration contract

- Native loading is best-effort at runtime.
- If native import fails, Jin degrades to Python processing without startup failure.
- Native performance improvements should be delivered through prebuilt artifacts and optional acceleration paths, not by forcing source builds on every install.

## API Discovery Contract

Route discovery must be total and non-fatal.

Rules:

1. Unknown response model types are ignored, not exceptions.
2. Collection response models like `list[Model]` are supported.
3. Discovery output must still include endpoint metadata even when KPI extraction is empty.
4. Any discovery fallback path must preserve dashboard and CLI usability.

## Reliability Gates

Every change should be validated by:

1. Python tests
2. Rust tests
3. Coverage report generation
4. Cross-OS install smoke tests

Cross-OS smoke tests validate:

1. package installation
2. CLI startup (`jin --help`)
3. status command (`jin status --format json`)

## CI Architecture

`CI` workflow:

1. Runs core verify path (frontend typecheck, Python tests, Rust tests, coverage)
2. Runs fast install smoke matrix on Linux/macOS/Windows for `pip` and `uv`
3. Emits install timing metrics and SLO status per OS/method in logs and step summary

`Install Smoke` scheduled workflow:

1. Runs broader install matrix for regression tracking (`pip`, `pipx`, `uv`, `poetry`)
2. Keeps cross-OS compatibility continuously exercised outside release windows

## Release Architecture

Before release:

1. Verify must be green.
2. Install smoke matrix must be green.
3. Dashboard assets and docs must be up to date.

Release should favor:

1. predictable installs
2. runtime compatibility
3. explicit fallback behavior over hidden failure

## Implementation Roadmap

Phase 1 (completed in current pass):

1. Python-first build backend for fast cross-OS install.
2. Discovery hardening for top-level collection response models.
3. Python fallback processing when native handlers are unavailable.
4. Cross-OS install smoke wiring and path normalization.

Phase 2:

1. Turn install SLO reporting into enforced budgets once measurement variance stabilizes.
2. Add structured startup diagnostics endpoint for native/fallback mode visibility.
3. Add operator-facing reason codes when endpoints are partially discoverable.

Phase 3:

1. Publish and validate prebuilt native acceleration artifacts per OS/Python.
2. Introduce optional native acceleration install flow without regressing default install speed.
3. Expand reconciliation issue shaping while preserving fallback parity contracts.
