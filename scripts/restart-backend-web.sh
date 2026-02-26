#!/usr/bin/env bash
# Reinicia backend + web (sin app Flutter).
# Uso: ./scripts/restart-backend-web.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Liberando puertos 3000-3005, 5173, 5174..."
for port in 3000 3001 3002 3003 3004 3005 5173 5174; do
  pid=$(lsof -ti :"$port" 2>/dev/null) || true
  if [[ -n "$pid" ]]; then
    kill "$pid" 2>/dev/null || true
  fi
done
sleep 2

echo "==> Arrancando backend y web..."
exec "$ROOT_DIR/scripts/dev.sh"
