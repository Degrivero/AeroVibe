#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SERVICES=(
  "aerovibe-api-gateway"
  "aerovibe-api-service"
  "aerovibe-iam-service"
  "aerovibe-spots-service"
  "aerovibe-users"
  "aerovibe-nats-redis"
)

echo "==> Ensuring .env files"
for svc in "${SERVICES[@]}"; do
  if [ -f "$ROOT_DIR/$svc/.env.example" ] && [ ! -f "$ROOT_DIR/$svc/.env" ]; then
    cp "$ROOT_DIR/$svc/.env.example" "$ROOT_DIR/$svc/.env"
    echo "Created $svc/.env from .env.example"
  fi
done

echo "==> Installing Node dependencies"
for svc in "${SERVICES[@]}"; do
  if [ -f "$ROOT_DIR/$svc/package.json" ]; then
    if [ ! -d "$ROOT_DIR/$svc/node_modules" ]; then
      echo "Installing $svc..."
      npm --prefix "$ROOT_DIR/$svc" install
    else
      echo "Skipping $svc (node_modules already present)"
    fi
  fi
done

if [ -d "$ROOT_DIR/aerovibe-app" ]; then
  echo "==> Installing Flutter dependencies"
  (cd "$ROOT_DIR/aerovibe-app" && flutter pub get)
fi
