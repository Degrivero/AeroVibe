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

for svc in "${SERVICES[@]}"; do
  echo "==> $svc: test"
  npm --prefix "$ROOT_DIR/$svc" test
done

if command -v flutter >/dev/null 2>&1 && [ -d "$ROOT_DIR/aerovibe-app" ]; then
  echo "==> aerovibe-app: flutter test"
  (cd "$ROOT_DIR/aerovibe-app" && flutter test)
fi
