#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

REPOS=(
  aerovibe-api-gateway
  aerovibe-api-service
  aerovibe-iam-service
  aerovibe-users
  aerovibe-spots-service
  aerovibe-nats-redis
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

  git -C "$dir" show-ref --verify --quiet refs/heads/main || git -C "$dir" checkout -b main origin/main
  git -C "$dir" show-ref --verify --quiet refs/heads/develop || git -C "$dir" checkout -b develop origin/develop

  git -C "$dir" checkout main
  git -C "$dir" pull --ff-only origin main

  if ! git -C "$dir" merge --ff-only origin/develop; then
    echo "[ERROR] $repo: main no puede avanzar por fast-forward desde develop." >&2
    echo "        Revisá divergencia main/develop en este repo y repetí." >&2
    exit 1
  fi

  git -C "$dir" push origin main
  echo "[OK] $repo develop -> main"
done

echo "\nPromoción completada."
