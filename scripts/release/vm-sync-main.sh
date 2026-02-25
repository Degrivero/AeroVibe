#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/srv/aerovibe-prod}"

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
  [[ -d "$dir/.git" ]] || { echo "[WARN] repo faltante: $dir"; continue; }

  echo "\n==> sync $repo"
  git -C "$dir" fetch --all --prune
  git -C "$dir" checkout main
  git -C "$dir" pull --ff-only origin main

  if [[ "$repo" == "aerovibe-web" ]]; then
    npm --prefix "$dir" ci
    npm --prefix "$dir" run build
  elif [[ "$repo" == "aerovibe-nats-redis" ]]; then
    npm --prefix "$dir" ci
  else
    npm --prefix "$dir" ci
  fi
done

echo "\n==> setup NATS streams"
if [[ -d "$ROOT/aerovibe-nats-redis" ]]; then
  npm --prefix "$ROOT/aerovibe-nats-redis" run nats:setup || true
fi
if [[ -d "$ROOT/aerovibe-notifications-service" ]]; then
  npm --prefix "$ROOT/aerovibe-notifications-service" run nats:setup || true
fi

echo "\n==> restart PM2"
APPS=(
  aerovibe-api-gateway
  aerovibe-api-service
  aerovibe-iam-service
  aerovibe-users
  aerovibe-spots-service
  aerovibe-workers
  aerovibe-notifications-service
)
for app in "${APPS[@]}"; do
  if pm2 describe "$app" >/dev/null 2>&1; then
    pm2 restart "$app" --update-env
  fi
done
pm2 save

echo "\n==> nginx reload"
sudo nginx -t
sudo systemctl reload nginx

echo "\n==> health"
curl -fsS http://127.0.0.1:3000/api/health && echo
curl -fsS http://127.0.0.1:3005/health && echo
curl -fsS http://127.0.0.1:3000/api/notifications/health && echo
