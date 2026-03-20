#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-/srv/aerovibe-prod}"
BRANCH="${BRANCH:-main}"

REPOS=(
  aerovibe-api-gateway
  aerovibe-api-service
  aerovibe-iam-service
  aerovibe-users
  aerovibe-spots-service
  aerovibe-nats-redis
  aerovibe-notifications-service
  aerovibe-payments-service
  aerovibe-web
)

APPS=(
  aerovibe-api-gateway
  aerovibe-api-service
  aerovibe-iam-service
  aerovibe-users
  aerovibe-spots-service
  aerovibe-workers
  aerovibe-notifications-service
  aerovibe-payments-service
)

log() { echo "[INFO] $*"; }
warn() { echo "[WARN] $*" >&2; }
err() { echo "[ERR] $*" >&2; }

require_cmd() {
  local name="$1"
  command -v "$name" >/dev/null 2>&1 || {
    err "Comando requerido no encontrado: $name"
    exit 1
  }
}

assert_web_email_assets() {
  local web_dir="$1"
  local dist_assets="$web_dir/dist/assets"
  local required=(
    "badges/app-store.svg"
    "badges/google-play.svg"
  )

  for rel in "${required[@]}"; do
    if [[ ! -f "$dist_assets/$rel" ]]; then
      err "Faltan assets críticos en build web: $dist_assets/$rel"
      return 1
    fi
  done
}

resolve_rollup_version_from_lock() {
  local dir="$1"
  node -e '
const fs = require("fs");
const path = process.argv[1];
const lock = JSON.parse(fs.readFileSync(path, "utf8"));
const v =
  (lock.packages && lock.packages["node_modules/rollup"] && lock.packages["node_modules/rollup"].version) ||
  (lock.dependencies && lock.dependencies.rollup && lock.dependencies.rollup.version) ||
  "";
process.stdout.write(String(v));
' "$dir/package-lock.json"
}

ensure_rollup_native_linux() {
  local dir="$1"
  if node -e 'require.resolve("@rollup/rollup-linux-x64-gnu", { paths: [process.argv[1]] })' "$dir" >/dev/null 2>&1; then
    return 0
  fi

  local rollup_ver
  rollup_ver="$(resolve_rollup_version_from_lock "$dir")"
  if [[ -z "$rollup_ver" ]]; then
    warn "No pude resolver versión de rollup desde package-lock.json"
    return 1
  fi

  warn "Falta @rollup/rollup-linux-x64-gnu; instalando @ ${rollup_ver}"
  NPM_CONFIG_OMIT= npm --prefix "$dir" i -D --no-save "@rollup/rollup-linux-x64-gnu@${rollup_ver}"
}

install_web_dependencies() {
  local dir="$1"

  rm -rf "$dir/node_modules"

  if ! NPM_CONFIG_OMIT= npm --prefix "$dir" ci --include=optional --no-audit --no-fund; then
    warn "npm ci falló en aerovibe-web; reintento con npm install --include=optional"
    rm -rf "$dir/node_modules"
    NPM_CONFIG_OMIT= npm --prefix "$dir" install --include=optional --no-audit --no-fund
  fi

  if ! ensure_rollup_native_linux "$dir"; then
    warn "No pude reparar Rollup con instalación puntual; reintento limpio"
    rm -rf "$dir/node_modules"
    NPM_CONFIG_OMIT= npm --prefix "$dir" install --include=optional --no-audit --no-fund
    ensure_rollup_native_linux "$dir"
  fi
}

retry_http() {
  local name="$1"
  local url="$2"
  local attempts="${3:-20}"
  local delay="${4:-2}"

  local i out
  for ((i=1; i<=attempts; i++)); do
    if out="$(curl -fsS --max-time 6 "$url" 2>&1)"; then
      echo "[OK] $name -> $out"
      return 0
    fi
    warn "$name intento $i/$attempts falló: $out"
    sleep "$delay"
  done

  err "$name no respondió tras $attempts intentos ($url)"
  return 1
}

sync_repo() {
  local repo="$1"
  local dir="$ROOT/$repo"

  [[ -d "$dir/.git" ]] || { warn "repo faltante: $dir"; return 0; }

  echo
  log "sync $repo"

  if [[ -n "$(git -C "$dir" status --porcelain)" ]]; then
    warn "$repo tiene cambios locales; pull --ff-only puede fallar si hay conflicto"
  fi

  git -C "$dir" fetch --all --prune
  git -C "$dir" checkout "$BRANCH"
  git -C "$dir" pull --ff-only origin "$BRANCH"

  if [[ "$repo" == "aerovibe-web" ]]; then
    install_web_dependencies "$dir"
    npm --prefix "$dir" run build
    assert_web_email_assets "$dir"
  else
    npm --prefix "$dir" ci --no-audit --no-fund
  fi
}

require_cmd git
require_cmd npm
require_cmd node
require_cmd pm2
require_cmd curl
require_cmd sudo

[[ -d "$ROOT" ]] || {
  err "ROOT no existe: $ROOT"
  exit 1
}

for repo in "${REPOS[@]}"; do
  sync_repo "$repo"
done

echo
log "restart PM2"
for app in "${APPS[@]}"; do
  if pm2 describe "$app" >/dev/null 2>&1; then
    pm2 restart "$app" --update-env
  else
    warn "PM2 app no encontrada: $app"
  fi
done
pm2 save

echo
log "nginx reload"
sudo nginx -t
sudo systemctl reload nginx

echo
log "health checks (with retry)"
retry_http "gateway" "http://127.0.0.1:3000/api/health"
retry_http "notifications-direct" "http://127.0.0.1:3005/health"
retry_http "payments-direct" "http://127.0.0.1:3006/health"
retry_http "notifications-via-gateway" "http://127.0.0.1:3000/api/notifications/health"

echo
log "deploy finalizado correctamente"
