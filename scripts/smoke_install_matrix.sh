#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
METHOD="${1:-all}"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/jin-install-smoke-XXXXXX")"
export UV_CACHE_DIR="${TMP_ROOT}/uv-cache"
PYTHON_BIN="${JIN_SMOKE_PYTHON_BIN:-python3}"
SYSTEM_PYTHON_BIN="${JIN_SMOKE_SYSTEM_PYTHON_BIN:-python3}"
export PYO3_USE_ABI3_FORWARD_COMPATIBILITY="${PYO3_USE_ABI3_FORWARD_COMPATIBILITY:-1}"

resolve_executable() {
  local candidate="$1"
  if [[ "${candidate}" == */* ]]; then
    local dir
    dir="$(cd "$(dirname "${candidate}")" && pwd)"
    echo "${dir}/$(basename "${candidate}")"
    return 0
  fi
  command -v "${candidate}" 2>/dev/null || echo "${candidate}"
}

PYTHON_BIN="$(resolve_executable "${PYTHON_BIN}")"
SYSTEM_PYTHON_BIN="$(resolve_executable "${SYSTEM_PYTHON_BIN}")"

cleanup() {
  rm -rf "${TMP_ROOT}"
}
trap cleanup EXIT

log() {
  printf '[smoke] %s\n' "$1"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

has_pipx() {
  has_cmd pipx \
    || "${PYTHON_BIN}" -m pipx --version >/dev/null 2>&1 \
    || "${SYSTEM_PYTHON_BIN}" -m pipx --version >/dev/null 2>&1
}

has_poetry() {
  has_cmd poetry \
    || "${PYTHON_BIN}" -m poetry --version >/dev/null 2>&1 \
    || "${SYSTEM_PYTHON_BIN}" -m poetry --version >/dev/null 2>&1
}

pipx_exec() {
  if has_cmd pipx; then
    pipx "$@"
  elif "${PYTHON_BIN}" -m pipx --version >/dev/null 2>&1; then
    "${PYTHON_BIN}" -m pipx "$@"
  else
    "${SYSTEM_PYTHON_BIN}" -m pipx "$@"
  fi
}

poetry_exec() {
  if has_cmd poetry; then
    poetry "$@"
  elif "${PYTHON_BIN}" -m poetry --version >/dev/null 2>&1; then
    "${PYTHON_BIN}" -m poetry "$@"
  else
    "${SYSTEM_PYTHON_BIN}" -m poetry "$@"
  fi
}

run_cli_checks() {
  local jin_bin="$1"
  local runtime_dir="$2"
  mkdir -p "${runtime_dir}"
  (
    cd "${runtime_dir}"
    JIN_PROJECT_NAME="smoke-project" \
    JIN_DB_PATH="${runtime_dir}/smoke.duckdb" \
      "${jin_bin}" --help >/dev/null
    JIN_PROJECT_NAME="smoke-project" \
    JIN_DB_PATH="${runtime_dir}/smoke.duckdb" \
      "${jin_bin}" status --format json >/dev/null
  )
}

run_pip_smoke() {
  log "Running pip install smoke test"
  local venv_dir="${TMP_ROOT}/pip-venv"
  "${PYTHON_BIN}" -m venv "${venv_dir}"
  "${venv_dir}/bin/python" -m pip install --upgrade pip >/dev/null
  "${venv_dir}/bin/python" -m pip install "${ROOT_DIR}" >/dev/null
  run_cli_checks "${venv_dir}/bin/jin" "${TMP_ROOT}/pip-runtime"
}

run_uv_smoke() {
  if ! has_cmd uv; then
    if [[ "${METHOD}" == "uv" ]]; then
      log "uv smoke test requires uv to be installed"
      return 1
    fi
    log "Skipping uv smoke test because uv is not installed"
    return 0
  fi
  log "Running uv install smoke test"
  local venv_dir="${TMP_ROOT}/uv-venv"
  uv venv "${venv_dir}" --python "${PYTHON_BIN}" >/dev/null
  uv pip install --python "${venv_dir}/bin/python" "${ROOT_DIR}" >/dev/null
  run_cli_checks "${venv_dir}/bin/jin" "${TMP_ROOT}/uv-runtime"
}

run_pipx_smoke() {
  if ! has_pipx; then
    if [[ "${METHOD}" == "pipx" ]]; then
      log "pipx smoke test requires pipx to be installed"
      return 1
    fi
    log "Skipping pipx smoke test because pipx is not installed"
    return 0
  fi
  log "Running pipx install smoke test"
  export PIPX_HOME="${TMP_ROOT}/pipx-home"
  export PIPX_BIN_DIR="${TMP_ROOT}/pipx-bin"
  mkdir -p "${PIPX_HOME}" "${PIPX_BIN_DIR}"
  pipx_exec install --force --python "${PYTHON_BIN}" "${ROOT_DIR}" >/dev/null
  run_cli_checks "${PIPX_BIN_DIR}/jin" "${TMP_ROOT}/pipx-runtime"
  pipx_exec uninstall jin >/dev/null || true
}

run_poetry_smoke() {
  if ! has_poetry; then
    if [[ "${METHOD}" == "poetry" ]]; then
      log "poetry smoke test requires poetry to be installed"
      return 1
    fi
    log "Skipping poetry smoke test because poetry is not installed"
    return 0
  fi
  log "Running poetry install smoke test"
  local project_dir="${TMP_ROOT}/poetry-project"
  mkdir -p "${project_dir}"
  cat > "${project_dir}/pyproject.toml" <<EOF
[tool.poetry]
name = "jin-smoke-project"
version = "0.1.0"
description = "Smoke project for jin installs"
authors = ["ci@example.com"]

[tool.poetry.dependencies]
python = ">=3.9,<4.0"
jin = { path = "${ROOT_DIR}", develop = false }

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
EOF
  (
    cd "${project_dir}"
    poetry_exec config virtualenvs.in-project true --local >/dev/null
    poetry_exec env use "${PYTHON_BIN}" >/dev/null
    poetry_exec install --no-interaction --no-root >/dev/null
    JIN_PROJECT_NAME="smoke-project" JIN_DB_PATH="${project_dir}/smoke.duckdb" poetry_exec run jin --help >/dev/null
    JIN_PROJECT_NAME="smoke-project" JIN_DB_PATH="${project_dir}/smoke.duckdb" poetry_exec run jin status --format json >/dev/null
  )
}

case "${METHOD}" in
  pip)
    run_pip_smoke
    ;;
  uv)
    run_uv_smoke
    ;;
  pipx)
    run_pipx_smoke
    ;;
  poetry)
    run_poetry_smoke
    ;;
  all)
    run_pip_smoke
    run_uv_smoke
    run_pipx_smoke
    run_poetry_smoke
    ;;
  *)
    echo "Usage: $0 [pip|uv|pipx|poetry|all]" >&2
    exit 2
    ;;
esac

log "Install smoke test completed for method: ${METHOD}"
