#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MERGE_MAIN=false
if [[ "${1:-}" == "--merge-main" ]]; then
  MERGE_MAIN=true
fi

REPOS=(
  aerovibe-api-gateway
  aerovibe-api-service
  aerovibe-iam-service
  aerovibe-users
  aerovibe-spots-service
  aerovibe-nats-redis
  aerovibe-notifications-service
  aerovibe-web
)

for repo in "${REPOS[@]}"; do
  dir="$ROOT/$repo"
  [[ -d "$dir/.git" ]] || continue
  if [[ -n "$(git -C "$dir" status --porcelain)" ]]; then
    echo "[ERROR] $repo tiene cambios sin commit. Aborto." >&2
    exit 1
  fi
done

for repo in "${REPOS[@]}"; do
  dir="$ROOT/$repo"
  [[ -d "$dir/.git" ]] || continue

  echo "\n==> $repo"
  git -C "$dir" fetch --all --prune

  git -C "$dir" show-ref --verify --quiet refs/heads/develop || git -C "$dir" checkout -b develop origin/develop
  git -C "$dir" checkout develop
  git -C "$dir" pull --ff-only origin develop

  if $MERGE_MAIN; then
    git -C "$dir" show-ref --verify --quiet refs/heads/main || git -C "$dir" checkout -b main origin/main
    git -C "$dir" checkout main
    git -C "$dir" pull --ff-only origin main
    git -C "$dir" checkout develop
    git -C "$dir" merge --ff-only main
  fi

  git -C "$dir" push origin develop
  echo "[OK] $repo -> origin/develop"
done

echo "\nCompletado."
