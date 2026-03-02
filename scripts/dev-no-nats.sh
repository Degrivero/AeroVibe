#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Bootstrap env + npm deps
"$ROOT_DIR/scripts/bootstrap.sh" || true

pids=()
run() {
  local name="$1"
  shift
  echo "==> Starting $name"
  "$@" &
  pids+=($!)
}

cleanup() {
  echo ""
  echo "==> Shutting down services"
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

run "Web" npm --prefix "$ROOT_DIR/aerovibe-web" run dev
run "API Gateway" npm --prefix "$ROOT_DIR/aerovibe-api-gateway" run dev
run "API Service" npm --prefix "$ROOT_DIR/aerovibe-api-service" run dev
run "IAM Service" npm --prefix "$ROOT_DIR/aerovibe-iam-service" run dev
run "Users Service" npm --prefix "$ROOT_DIR/aerovibe-users" run dev
run "Spots Service" npm --prefix "$ROOT_DIR/aerovibe-spots-service" run dev
run "Flutter" bash -c "cd \"$ROOT_DIR/aerovibe-app\" && flutter run"

echo ""
echo "✅ AeroVibe running (sin NATS/Redis). Press Ctrl+C to stop."

while true; do
  for pid in "${pids[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "A service exited unexpectedly. Stopping all..."
      exit 1
    fi
  done
  sleep 1
done
