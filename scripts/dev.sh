#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# --no-web: levanta todo el back (NATS, Redis, workers, servicios) sin la app web
NO_WEB=false
for arg in "$@"; do
  if [[ "$arg" == "--no-web" ]]; then
    NO_WEB=true
    break
  fi
done

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
  for pid in "${pids[@]-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

"$ROOT_DIR/scripts/bootstrap.sh"

port_open() {
  local host="$1"
  local port="$2"
  (echo >"/dev/tcp/$host/$port") >/dev/null 2>&1
}

start_local_nats_redis() {
  if ! command -v nats-server >/dev/null 2>&1; then
    echo "NATS server not found. Install it with: brew install nats-server" >&2
    exit 1
  fi
  if ! command -v redis-server >/dev/null 2>&1; then
    echo "Redis server not found. Install it with: brew install redis" >&2
    exit 1
  fi

  mkdir -p "$ROOT_DIR/.local/nats" "$ROOT_DIR/.local/redis"

  if port_open 127.0.0.1 4222; then
    echo "==> Reusing local NATS on 127.0.0.1:4222"
  else
    run "NATS (local)" nats-server -js -sd "$ROOT_DIR/.local/nats" -p 4222
    sleep 1
  fi

  if redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null 2>&1; then
    echo "==> Reusing local Redis on 127.0.0.1:6379"
  else
    run "Redis (local)" redis-server --port 6379 --save '' --appendonly no
    sleep 1
  fi
}

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
  echo "Docker not found. Falling back to local nats-server/redis-server." >&2
  start_local_nats_redis
fi

if [[ -n "${COMPOSE_CMD:-}" ]]; then
  echo "==> Starting NATS/Redis (Docker)"
  "${COMPOSE_CMD[@]}" -f "$ROOT_DIR/docker-compose.yml" up -d
  sleep 2
fi

echo "==> Setting up NATS streams"
npm --prefix "$ROOT_DIR/aerovibe-nats-redis" run nats:setup
npm --prefix "$ROOT_DIR/aerovibe-notifications-service" run nats:setup

run "NATS/Redis workers" npm --prefix "$ROOT_DIR/aerovibe-nats-redis" run workers
run "Notifications Service" npm --prefix "$ROOT_DIR/aerovibe-notifications-service" run dev
if [[ "$NO_WEB" != "true" ]]; then
  run "Web" npm --prefix "$ROOT_DIR/aerovibe-web" run dev
fi
run "API Gateway" npm --prefix "$ROOT_DIR/aerovibe-api-gateway" run dev
run "API Service" npm --prefix "$ROOT_DIR/aerovibe-api-service" run dev
run "IAM Service" npm --prefix "$ROOT_DIR/aerovibe-iam-service" run dev
run "Users Service" npm --prefix "$ROOT_DIR/aerovibe-users" run dev
run "Spots Service" npm --prefix "$ROOT_DIR/aerovibe-spots-service" run dev

echo ""
echo "✅ AeroVibe running. Press Ctrl+C to stop."

while true; do
  for pid in "${pids[@]-}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "A service exited unexpectedly. Stopping all..."
      exit 1
    fi
  done
  sleep 1
done
