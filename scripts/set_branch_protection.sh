#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  cat <<'USAGE'
Usage:
  GH_TOKEN=... ./scripts/set_branch_protection.sh [branch]

Environment:
  GH_TOKEN        GitHub token with repository administration permissions.
  REPO_SLUG       Optional owner/repo override. Defaults from origin remote.
  CHECK_CONTEXTS  Comma-separated required checks.
                  Default: "CI / verify,CI / e2e"

Examples:
  GH_TOKEN=... ./scripts/set_branch_protection.sh
  GH_TOKEN=... CHECK_CONTEXTS="CI / verify,CI / e2e" ./scripts/set_branch_protection.sh main
USAGE
  exit 0
fi

branch="${1:-main}"
repo_slug="${REPO_SLUG:-}"
check_contexts="${CHECK_CONTEXTS:-CI / verify,CI / e2e}"

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "GH_TOKEN is required." >&2
  exit 1
fi

if [[ -z "$repo_slug" ]]; then
  remote_url="$(git config --get remote.origin.url || true)"
  if [[ "$remote_url" =~ github\.com[:/]([^/]+)/([^/]+)(\.git)?$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
    repo_slug="${owner}/${repo}"
  else
    echo "Could not resolve GitHub owner/repo from origin remote. Set REPO_SLUG=owner/repo." >&2
    exit 1
  fi
fi

contexts_json="$(printf '%s' "$check_contexts" | jq -R 'split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0))')"

required_checks_payload="$(jq -cn \
  --argjson contexts "$contexts_json" \
  '{strict: true, contexts: $contexts}')"

base_url="https://api.github.com/repos/${repo_slug}/branches/${branch}/protection"

run_request() {
  local method="$1"
  local url="$2"
  local payload="$3"
  local body_file="$4"

  curl -sS \
    -o "$body_file" \
    -w "%{http_code}" \
    -X "$method" \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GH_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$url" \
    -d "$payload"
}

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT

http_code="$(run_request "PATCH" "${base_url}/required_status_checks" "$required_checks_payload" "$body_file")"

if [[ "$http_code" == "200" ]]; then
  echo "Updated required checks on ${repo_slug}:${branch}"
  echo "Required checks: $check_contexts"
  exit 0
fi

if [[ "$http_code" == "404" || "$http_code" == "422" ]]; then
  full_payload="$(jq -cn \
    --argjson contexts "$contexts_json" \
    '{
      required_status_checks: { strict: true, contexts: $contexts },
      enforce_admins: false,
      required_pull_request_reviews: null,
      restrictions: null,
      allow_force_pushes: false,
      allow_deletions: false,
      block_creations: false,
      required_linear_history: true,
      required_conversation_resolution: true,
      lock_branch: false,
      allow_fork_syncing: true
    }')"

  http_code="$(run_request "PUT" "$base_url" "$full_payload" "$body_file")"
  if [[ "$http_code" == "200" ]]; then
    echo "Created branch protection and set required checks on ${repo_slug}:${branch}"
    echo "Required checks: $check_contexts"
    exit 0
  fi
fi

echo "GitHub API request failed (HTTP ${http_code})." >&2
cat "$body_file" >&2
exit 1
