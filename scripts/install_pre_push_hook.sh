#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="${ROOT_DIR}/.githooks"
HOOK_PATH="${HOOKS_DIR}/pre-push"

mkdir -p "${HOOKS_DIR}"
chmod +x "${HOOK_PATH}" 2>/dev/null || true

echo "Created repo hook script: ${HOOK_PATH}"
echo ""
echo "Enable it (one-time, local):"
echo "  git config core.hooksPath .githooks"
echo ""
echo "Verify:"
echo "  git config --get core.hooksPath"
