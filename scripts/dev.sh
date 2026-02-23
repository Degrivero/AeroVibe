#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT_DIR/scripts/bootstrap.sh"

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=("docker" "compose")
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=("docker-compose")
  else
    echo "Docker Compose not found. Install Docker Desktop or docker-compose." >&2
    exit 1
  fi
else
  echo "Docker not found. Install Docker Desktop to run NATS/Redis." >&2
  exit 1
fi

echo "==> Starting NATS/Redis"
"${COMPOSE_CMD[@]}" -f "$ROOT_DIR/docker-compose.yml" up -d
sleep 2

echo "==> Setting up NATS streams"
npm --prefix "$ROOT_DIR/aerovibe-nats-redis" run nats:setup
npm --prefix "$ROOT_DIR/aerovibe-notifications-service" run nats:setup

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

run "NATS/Redis workers" npm --prefix "$ROOT_DIR/aerovibe-nats-redis" run workers
run "Notifications Service" npm --prefix "$ROOT_DIR/aerovibe-notifications-service" run dev
run "Web" npm --prefix "$ROOT_DIR/aerovibe-web" run dev
run "API Gateway" npm --prefix "$ROOT_DIR/aerovibe-api-gateway" run dev
run "API Service" npm --prefix "$ROOT_DIR/aerovibe-api-service" run dev
run "IAM Service" npm --prefix "$ROOT_DIR/aerovibe-iam-service" run dev
run "Users Service" npm --prefix "$ROOT_DIR/aerovibe-users" run dev
run "Spots Service" npm --prefix "$ROOT_DIR/aerovibe-spots-service" run dev

echo ""
echo "✅ AeroVibe running. Press Ctrl+C to stop."

while true; do
  for pid in "${pids[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "A service exited unexpectedly. Stopping all..."
      exit 1
    fi
  done
  sleep 1
done
