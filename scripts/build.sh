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
  "aerovibe-web"
)

for svc in "${SERVICES[@]}"; do
  echo "==> $svc: build"
  npm --prefix "$ROOT_DIR/$svc" run build
done

if command -v flutter >/dev/null 2>&1 && [ -d "$ROOT_DIR/aerovibe-app" ]; then
  if command -v java >/dev/null 2>&1 && java -version >/dev/null 2>&1; then
    echo "==> aerovibe-app: flutter build apk --debug"
    (cd "$ROOT_DIR/aerovibe-app" && flutter build apk --debug)
  else
    echo "==> aerovibe-app: java not found, skipping flutter build"
  fi
fi
