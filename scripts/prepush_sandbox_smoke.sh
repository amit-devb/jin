#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="${TMPDIR:-/tmp}"
SANDBOX_DIR="$(mktemp -d "${TMP_ROOT}/jin-prepush-sandbox-XXXXXX")"

cleanup() {
  rm -rf "${SANDBOX_DIR}"
}
trap cleanup EXIT

log() {
  printf '[prepush] %s\n' "$1"
}

PYTHON_BIN="${JIN_PREPUSH_PYTHON_BIN:-python3}"

log "Creating sandbox venv at ${SANDBOX_DIR}/.venv"
"${PYTHON_BIN}" -m venv "${SANDBOX_DIR}/.venv"

VENV_PY="${SANDBOX_DIR}/.venv/bin/python"
if [[ -f "${SANDBOX_DIR}/.venv/Scripts/python.exe" ]]; then
  VENV_PY="${SANDBOX_DIR}/.venv/Scripts/python.exe"
fi

log "Installing Jin from local source into sandbox (editable)"
"${VENV_PY}" -m pip install --upgrade pip >/dev/null
"${VENV_PY}" -m pip install -e "${ROOT_DIR}[dev]" >/dev/null

log "Running FastAPI + dashboard + upload + reconciliation smoke"
JIN_SMOKE_PYTHON="${VENV_PY}" "${VENV_PY}" "${ROOT_DIR}/scripts/sandbox_fastapi_jin_smoke.py"

log "OK"

