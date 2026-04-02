# Jin — AGENTS.md

## Mission
Build and maintain Jin as a Rust-first data quality product for FastAPI teams.
Keep Python thin and framework-native. Keep durable business logic, anomaly decisions,
and persistence behavior in Rust whenever practical.

Do not stop at scaffolding. Carry work through implementation, tests, and verification.

## Product Shape
Jin is:
- FastAPI middleware that monitors API response quality at the business grain level
- A mounted operator surface at `/jin`
- A Rust core that owns anomaly detection, persistence, config resolution, and status/detail shaping
- A thin Python wrapper that owns FastAPI/Pydantic integration and scheduler wiring

## Architecture Contract

### Python owns
- Pydantic/FastAPI reflection
- ASGI middleware integration
- FastAPI router mounting
- APScheduler integration and watch job execution
- Upload parsing and template generation
- Dashboard HTML/JS rendering
- Small fallback runtime cache for degraded/native-disabled paths

### Rust owns
- JSON flattening and numeric extraction
- Grain-key construction
- DuckDB schema creation and persistence helpers
- Observation processing
- Threshold, reference, and statistical anomaly detection
- Anomaly precedence and resolution
- Config save/load/resolve behavior
- Reference save/import behavior
- Status aggregation
- Endpoint-detail payload shaping
- Active anomaly listing and resolution

## Current Repo Layout

### Rust
- `src/core/types.rs`
- `src/core/json.rs`
- `src/core/grain.rs`
- `src/core/storage.rs`
- `src/core/engine.rs`
- `src/lib.rs`
- `src/tests.rs`

### Python
- `python/jin/config.py`
- `python/jin/middleware.py`
- `python/jin/router.py`
- `python/jin/scheduler.py`
- `python/jin/dashboard.py`
- `python/jin/uploader.py`
- `python/jin/templates.py`
- `python/jin/watch.py`
- `python/jin/app/`
- `python/jin/core/`
- `python/jin/io/`

## Working Rules
- Prefer Rust for new durable business logic unless the feature is inherently Python/FastAPI-specific.
- Keep Python APIs ergonomic for FastAPI developers.
- Do not add destructive git/file operations.
- Do not commit unless explicitly asked.
- Keep local verification green after every meaningful change.

## Verification Commands
- `make test-python`
- `make coverage-python`
- `make test-rust`
- `make coverage-rust`
- `make verify`

Equivalent direct commands:

```bash
PYTHONPATH=python .venv/bin/coverage run --rcfile=.coveragerc -m pytest
PYTHONPATH=python .venv/bin/coverage report --rcfile=.coveragerc -m
PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 cargo test
PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 cargo llvm-cov --ignore-filename-regex '(/.cargo/registry|target/)' --summary-only
```

## Current Quality Bar
- Python tests must pass
- Python package coverage must remain at `100%`
- Rust tests must pass
- Rust coverage must be tracked and improved when native logic expands

## Definition Of Done
Jin is done for a pass when:
- the intended feature behavior is implemented end to end
- Python integration tests pass
- Python coverage remains `100%`
- Rust unit/integration tests pass
- any native logic changes include or update Rust tests
- docs reflect the current architecture and workflow

## Remaining Product Work
The highest-value remaining work after the current baseline is:
- deeper Rust anomaly sophistication and edge-case handling
- stricter DuckDB boundary fidelity if we want a fully literal shared-connection design
- thinner normalized schema handoff from Python reflection into Rust
- more scheduler operational depth
- more dashboard/operator polish
- continued Rust coverage improvement

## Intent
Jin should feel production-minded, fast, and trustworthy:
- minimal Python glue
- strong native core
- strong operator UX
- strong tests
- clean handoff for packaging and CI/CD
