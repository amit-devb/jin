PYTHONPATH_VAR=PYTHONPATH=python
PYO3_ENV=PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
UV_CACHE=UV_CACHE_DIR=.uv-cache

.PHONY: build-frontend npm-build-frontend typecheck-frontend test-e2e auth-generate develop test-python test-rust coverage-python coverage-rust docs-serve demo-seed demo-run verify verify-full smoke-installs protect-main release

build-frontend:
	@echo "Frontend already built, skipping..."

npm-build-frontend:
	npm run build

typecheck-frontend:
	./node_modules/.bin/tsc --project frontend/tsconfig.json --noEmit

test-e2e: build-frontend
	npx playwright test

auth-generate:
	$(PYTHONPATH_VAR) .venv/bin/python scripts/generate_jin_auth.py

develop: build-frontend
	$(UV_CACHE) $(PYO3_ENV) $(PYTHONPATH_VAR) .venv/bin/maturin develop

test-python: build-frontend
	$(PYTHONPATH_VAR) .venv/bin/python -m pytest

test-rust:
	$(PYO3_ENV) cargo test

coverage-python: build-frontend
	$(PYTHONPATH_VAR) .venv/bin/python -m coverage run --rcfile=.coveragerc -m pytest
	$(PYTHONPATH_VAR) .venv/bin/python -m coverage report --rcfile=.coveragerc -m

coverage-rust:
	$(PYO3_ENV) cargo llvm-cov --ignore-filename-regex '(/.cargo/registry|target/)' --summary-only

docs-serve:
	$(PYTHONPATH_VAR) .venv/bin/mkdocs serve

demo-seed: build-frontend
	$(PYTHONPATH_VAR) .venv/bin/python examples/fastapi_demo/seed_app_db.py

demo-run: demo-seed
	$(PYTHONPATH_VAR) .venv/bin/python scripts/run_demo.py

# CI verification covers both native Rust paths and Python fallback paths.
verify: build-frontend typecheck-frontend test-python test-rust coverage-python

verify-full: verify coverage-rust

smoke-installs:
	./scripts/smoke_install_matrix.sh all

protect-main:
	./scripts/set_branch_protection.sh main

release:
	@test -n "$(VERSION)" || (echo "Set VERSION=0.1.1" && exit 1)
	$(PYTHONPATH_VAR) .venv/bin/python scripts/release.py --version "$(VERSION)"

# Re-run a failed tag release without bumping pyproject.toml.
# Usage:
#   make retag-release TAG=v1.0.0 REF=main FORCE=1
# or:
#   make retag-release VERSION=1.0.0 REF=main FORCE=1
retag-release:
	@test -n "$(TAG)$(VERSION)" || (echo "Set TAG=v1.0.0 or VERSION=1.0.0" && exit 1)
	@test "$(FORCE)" = "1" || (echo "Refusing to delete/recreate remote tag without FORCE=1" && exit 1)
	$(PYTHONPATH_VAR) .venv/bin/python scripts/retag_release.py \
		--tag "$(if $(TAG),$(TAG),$(VERSION))" \
		--ref "$(if $(REF),$(REF),HEAD)" \
		--force
