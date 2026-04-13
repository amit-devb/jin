#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
METHOD="${1:-all}"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/jin-install-smoke-XXXXXX")"
export UV_CACHE_DIR="${TMP_ROOT}/uv-cache"
PYTHON_BIN="${JIN_SMOKE_PYTHON_BIN:-python3}"
SYSTEM_PYTHON_BIN="${JIN_SMOKE_SYSTEM_PYTHON_BIN:-python3}"
export PYO3_USE_ABI3_FORWARD_COMPATIBILITY="${PYO3_USE_ABI3_FORWARD_COMPATIBILITY:-1}"
JIN_INSTALL_SLO_SECONDS="${JIN_INSTALL_SLO_SECONDS:-30}"
JIN_ENFORCE_INSTALL_SLO="${JIN_ENFORCE_INSTALL_SLO:-false}"
JIN_SMOKE_INSTALL_SOURCE="${JIN_SMOKE_INSTALL_SOURCE:-auto}" # auto|wheel|source|pypi
JIN_SMOKE_WHEEL_GLOB="${JIN_SMOKE_WHEEL_GLOB:-${ROOT_DIR}/dist/*.whl}"
JIN_SMOKE_PYPI_PACKAGE="${JIN_SMOKE_PYPI_PACKAGE:-jin-monitor}"

detect_os_label() {
  local uname_value
  uname_value="$(uname -s | tr '[:upper:]' '[:lower:]')"
  case "${uname_value}" in
    mingw*|msys*|cygwin*)
      echo "windows"
      ;;
    darwin*)
      echo "macos"
      ;;
    linux*)
      echo "linux"
      ;;
    *)
      echo "${uname_value}"
      ;;
  esac
}

OS_LABEL="${JIN_SMOKE_OS_LABEL:-$(detect_os_label)}"

# GitHub Windows runners expose `python` but not necessarily `python3`.
# Keep override env vars working; only adjust when the user didn't force a value.
if [[ "${OS_LABEL}" == "windows" ]]; then
  if [[ -z "${JIN_SMOKE_PYTHON_BIN:-}" ]]; then
    PYTHON_BIN="python"
  fi
  if [[ -z "${JIN_SMOKE_SYSTEM_PYTHON_BIN:-}" ]]; then
    SYSTEM_PYTHON_BIN="python"
  fi
fi

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

# Resolve to a concrete Windows python.exe path that tools like uv accept.
# `command -v python` under Git Bash can return a POSIX path without `.exe`,
# which uv treats as a literal file path and rejects.
python_sys_executable() {
  local python_bin="$1"
  "${python_bin}" -c 'import sys; print(sys.executable.replace("\\\\", "/"))'
}

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

is_truthy() {
  case "${1,,}" in
    1|true|yes|on)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

now_seconds() {
  "${PYTHON_BIN}" -c 'import time; print(f"{time.time():.6f}")'
}

elapsed_seconds() {
  local start_seconds="$1"
  local end_seconds="$2"
  "${PYTHON_BIN}" -c "start=float('${start_seconds}'); end=float('${end_seconds}'); print(f'{max(end-start, 0.0):.3f}')"
}

pick_wheel() {
  # Prefer an already-built wheel so install doesn't need Rust.
  # Use Python globbing to stay portable across bash implementations and
  # Windows path formats (GitHub exposes `${{ github.workspace }}` as a Windows path).
  "${PYTHON_BIN}" - <<'PY'
import glob
import os
import sys

pattern = os.environ.get("JIN_SMOKE_WHEEL_GLOB", "")
matches = sorted(glob.glob(pattern))
for path in matches:
    if os.path.isfile(path):
        # Normalize for Git Bash (backslashes can be treated as escapes).
        print(path.replace("\\", "/"))
        sys.exit(0)
sys.exit(1)
PY
}

resolve_install_source() {
  local resolved="${JIN_SMOKE_INSTALL_SOURCE}"
  if [[ "${resolved}" == "auto" ]]; then
    if pick_wheel >/dev/null 2>&1; then
      resolved="wheel"
    else
      resolved="source"
    fi
  fi
  echo "${resolved}"
}

pip_install_target() {
  local source
  source="$(resolve_install_source)"
  if [[ "${source}" == "wheel" ]]; then
    pick_wheel
    return 0
  fi
  if [[ "${source}" == "pypi" ]]; then
    echo "${JIN_SMOKE_PYPI_PACKAGE}"
    return 0
  fi
  echo "${ROOT_DIR}"
}

pip_install_args() {
  local source
  source="$(resolve_install_source)"
  if [[ "${source}" == "pypi" ]]; then
    echo "--only-binary=:all:"
    return 0
  fi
  echo ""
}

within_slo() {
  local measured_seconds="$1"
  local slo_seconds="$2"
  "${PYTHON_BIN}" -c "import sys; sys.exit(0 if float('${measured_seconds}') <= float('${slo_seconds}') else 1)"
}

append_install_summary() {
  local method="$1"
  local install_seconds="$2"
  local status="$3"

  if [[ -z "${GITHUB_STEP_SUMMARY:-}" ]]; then
    return 0
  fi

  if ! grep -q '^| OS | Method | Install (s) | SLO (s) | Status |$' "${GITHUB_STEP_SUMMARY}" 2>/dev/null; then
    {
      echo "| OS | Method | Install (s) | SLO (s) | Status |"
      echo "|---|---|---:|---:|---|"
    } >> "${GITHUB_STEP_SUMMARY}"
  fi

  echo "| ${OS_LABEL} | ${method} | ${install_seconds} | ${JIN_INSTALL_SLO_SECONDS} | ${status} |" >> "${GITHUB_STEP_SUMMARY}"
}

report_install_metric() {
  local method="$1"
  local install_seconds="$2"
  local status="pass"
  if ! within_slo "${install_seconds}" "${JIN_INSTALL_SLO_SECONDS}"; then
    status="breach"
  fi

  log "install metric: os=${OS_LABEL} method=${method} install_seconds=${install_seconds} slo_seconds=${JIN_INSTALL_SLO_SECONDS} status=${status}"
  append_install_summary "${method}" "${install_seconds}" "${status}"

  if [[ "${status}" == "breach" ]] && is_truthy "${JIN_ENFORCE_INSTALL_SLO}"; then
    echo "Install SLO breached for method '${method}' on '${OS_LABEL}': ${install_seconds}s > ${JIN_INSTALL_SLO_SECONDS}s" >&2
    return 1
  fi
}

run_install_with_metrics() {
  local method="$1"
  shift
  local started_at
  local finished_at
  local install_seconds
  started_at="$(now_seconds)"
  "$@"
  finished_at="$(now_seconds)"
  install_seconds="$(elapsed_seconds "${started_at}" "${finished_at}")"
  report_install_metric "${method}" "${install_seconds}"
}

require_non_empty() {
  local value="$1"
  local label="$2"
  if [[ -z "${value}" ]]; then
    echo "Smoke test internal error: ${label} is empty" >&2
    exit 2
  fi
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

jin_bin_from_python() {
  # Resolve the actual console entrypoint path from within the venv.
  # Important on Windows where the launcher may be `jin.exe`/`jin.cmd`.
  local python_bin="$1"
  "${python_bin}" - <<'PY'
import sys
import sysconfig
from pathlib import Path

scripts = Path(sysconfig.get_path("scripts"))
candidates = ["jin.exe", "jin.cmd", "jin.bat", "jin", "jin-script.py"]
for name in candidates:
    p = scripts / name
    if p.exists():
        print(str(p).replace("\\", "/"))
        raise SystemExit(0)

# Fall back to expected location (useful for error messages)
print(str(scripts / "jin").replace("\\", "/"))
raise SystemExit(0)
PY
}

run_cli_checks() {
  local jin_bin="$1"
  local runtime_dir="$2"
  jin_bin="$(resolve_cli_executable "${jin_bin}")"
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

resolve_cli_executable() {
  local base="$1"
  # On Windows under Git Bash, the executable bit may not be set even though the file exists.
  if [[ -x "${base}" ]] || [[ -f "${base}" ]]; then
    echo "${base}"
    return 0
  fi
  if [[ -x "${base}.exe" ]] || [[ -f "${base}.exe" ]]; then
    echo "${base}.exe"
    return 0
  fi
  if [[ -x "${base}.cmd" ]] || [[ -f "${base}.cmd" ]]; then
    echo "${base}.cmd"
    return 0
  fi
  if [[ -x "${base}.bat" ]] || [[ -f "${base}.bat" ]]; then
    echo "${base}.bat"
    return 0
  fi
  echo "${base}"
}

venv_scripts_dir() {
  local venv_dir="$1"
  if [[ -d "${venv_dir}/Scripts" ]]; then
    echo "${venv_dir}/Scripts"
    return 0
  fi
  echo "${venv_dir}/bin"
}

venv_python_bin() {
  local scripts_dir
  scripts_dir="$(venv_scripts_dir "$1")"
  if [[ -x "${scripts_dir}/python" ]] || [[ -f "${scripts_dir}/python" ]]; then
    echo "${scripts_dir}/python"
    return 0
  fi
  if [[ -x "${scripts_dir}/python.exe" ]] || [[ -f "${scripts_dir}/python.exe" ]]; then
    echo "${scripts_dir}/python.exe"
    return 0
  fi
  echo "${scripts_dir}/python"
}

venv_jin_bin() {
  local scripts_dir
  scripts_dir="$(venv_scripts_dir "$1")"
  if [[ -x "${scripts_dir}/jin" ]] || [[ -f "${scripts_dir}/jin" ]]; then
    echo "${scripts_dir}/jin"
    return 0
  fi
  if [[ -x "${scripts_dir}/jin.exe" ]] || [[ -f "${scripts_dir}/jin.exe" ]]; then
    echo "${scripts_dir}/jin.exe"
    return 0
  fi
  if [[ -x "${scripts_dir}/jin.cmd" ]] || [[ -f "${scripts_dir}/jin.cmd" ]]; then
    echo "${scripts_dir}/jin.cmd"
    return 0
  fi
  if [[ -x "${scripts_dir}/jin.bat" ]] || [[ -f "${scripts_dir}/jin.bat" ]]; then
    echo "${scripts_dir}/jin.bat"
    return 0
  fi
  echo "${scripts_dir}/jin"
}

run_pip_smoke() {
  log "Running pip install smoke test"
  local venv_dir="${TMP_ROOT}/pip-venv"
  local python_bin
  local target
  local source
  "${PYTHON_BIN}" -m venv "${venv_dir}"
  python_bin="$(venv_python_bin "${venv_dir}")"
  "${python_bin}" -m pip install --upgrade pip >/dev/null
  source="$(resolve_install_source)"
  target="$(pip_install_target)"
  require_non_empty "${target}" "pip install target"

  # Build args as an array so we never pass empty fields.
  local -a pip_cmd
  pip_cmd=("${python_bin}" -m pip install)
  if [[ "${source}" == "pypi" ]]; then
    pip_cmd+=(--only-binary=:all:)
  fi
  pip_cmd+=("${target}")
  run_install_with_metrics "pip" "${pip_cmd[@]}"

  local jin_bin
  jin_bin="$(jin_bin_from_python "${python_bin}")"
  run_cli_checks "${jin_bin}" "${TMP_ROOT}/pip-runtime"
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
  local python_bin
  local uv_python
  local target
  local source
  uv_python="$(python_sys_executable "${PYTHON_BIN}")"
  uv venv "${venv_dir}" --python "${uv_python}" >/dev/null
  python_bin="$(venv_python_bin "${venv_dir}")"
  source="$(resolve_install_source)"
  target="$(pip_install_target)"
  require_non_empty "${target}" "uv install target"

  local -a uv_cmd
  uv_cmd=(uv pip install --python "${python_bin}")
  if [[ "${source}" == "pypi" ]]; then
    uv_cmd+=(--only-binary=:all:)
  fi
  uv_cmd+=("${target}")
  run_install_with_metrics "uv" "${uv_cmd[@]}"
  local jin_bin
  jin_bin="$(jin_bin_from_python "${python_bin}")"
  run_cli_checks "${jin_bin}" "${TMP_ROOT}/uv-runtime"
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
  local target
  local source
  source="$(resolve_install_source)"
  target="$(pip_install_target)"
  if [[ "${source}" == "pypi" ]]; then
    run_install_with_metrics "pipx" pipx_exec install --force --python "$(python_sys_executable "${PYTHON_BIN}")" --pip-args="--only-binary=:all:" "${target}"
  else
    run_install_with_metrics "pipx" pipx_exec install --force --python "$(python_sys_executable "${PYTHON_BIN}")" "${target}"
  fi
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
  local source
  local target
  source="$(resolve_install_source)"
  target="$(pip_install_target)"
  mkdir -p "${project_dir}"
  if [[ "${source}" == "wheel" ]]; then
    cat > "${project_dir}/pyproject.toml" <<EOF
[tool.poetry]
name = "jin-smoke-project"
version = "0.1.0"
description = "Smoke project for jin installs"
authors = ["ci@example.com"]

[tool.poetry.dependencies]
python = ">=3.9,<4.0"
jin-monitor = { file = "${target}" }

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
EOF
  else
  cat > "${project_dir}/pyproject.toml" <<EOF
[tool.poetry]
name = "jin-smoke-project"
version = "0.1.0"
description = "Smoke project for jin installs"
authors = ["ci@example.com"]

[tool.poetry.dependencies]
python = ">=3.9,<4.0"
jin-monitor = { path = "${target}", develop = false }

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
EOF
  fi
  (
    cd "${project_dir}"
    poetry_exec config virtualenvs.in-project true --local >/dev/null
    poetry_exec env use "${PYTHON_BIN}" >/dev/null
    run_install_with_metrics "poetry" poetry_exec install --no-interaction --no-root
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
