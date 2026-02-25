#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/srv/aerovibe-qa}"

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
  git -C "$dir" checkout develop
  git -C "$dir" pull --ff-only origin develop

  npm --prefix "$dir" ci

  if [[ "$repo" == "aerovibe-web" ]]; then
    npm --prefix "$dir" run build
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
  aerovibe-api-gateway-qa
  aerovibe-api-service-qa
  aerovibe-iam-service-qa
  aerovibe-users-qa
  aerovibe-spots-service-qa
  aerovibe-workers-qa
  aerovibe-notifications-service-qa
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
curl -fsS http://127.0.0.1:3100/api/health && echo
curl -fsS http://127.0.0.1:3105/health && echo
curl -fsS http://127.0.0.1:3100/api/notifications/health && echo
