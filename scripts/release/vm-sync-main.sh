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

if [[ ! -d "$ROOT" ]]; then
  echo "[ERROR] ROOT no existe: $ROOT"
  exit 1
fi

upsert_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"

  [[ -f "$file" ]] || touch "$file"

  if grep -qE "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

assert_web_email_assets() {
  local web_dir="$1"
  local dist_assets="$web_dir/dist/assets"
  local required=(
    "badges/app-store.png"
    "badges/google-play.png"
    "social/instagram.png"
    "brand/logotipo.png"
  )

  for rel in "${required[@]}"; do
    if [[ ! -f "$dist_assets/$rel" ]]; then
      echo "[ERROR] Faltan assets para emails en build web: $dist_assets/$rel"
      exit 1
    fi
  done
}

synced_repos=0
for repo in "${REPOS[@]}"; do
  dir="$ROOT/$repo"
  [[ -d "$dir/.git" ]] || { echo "[WARN] repo faltante: $dir"; continue; }
  synced_repos=$((synced_repos + 1))

  echo "\n==> sync $repo"
  git -C "$dir" fetch --all --prune
  git -C "$dir" checkout main
  git -C "$dir" pull --ff-only origin main

  if [[ "$repo" == "aerovibe-web" ]]; then
    npm --prefix "$dir" ci
    npm --prefix "$dir" run build
    assert_web_email_assets "$dir"
  elif [[ "$repo" == "aerovibe-nats-redis" ]]; then
    npm --prefix "$dir" ci
  else
    npm --prefix "$dir" ci
  fi
done

if [[ "$synced_repos" -eq 0 ]]; then
  echo "[ERROR] No se encontró ningún repo Git en $ROOT/<repo>. Revisa ROOT y la estructura del servidor."
  exit 1
fi

echo "\n==> enforce ports and targets"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "PORT" "3000"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "API_URL" "http://127.0.0.1:3002"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "IAM_URL" "http://127.0.0.1:3001"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "USERS_URL" "http://127.0.0.1:3003"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "SPOTS_URL" "http://127.0.0.1:3004"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "NOTIFICATIONS_URL" "http://127.0.0.1:3005"

upsert_env_var "$ROOT/aerovibe-api-service/.env" "PORT" "3002"
upsert_env_var "$ROOT/aerovibe-api-service/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-api-service/.env" "NATS_URL" "127.0.0.1:4222"

upsert_env_var "$ROOT/aerovibe-iam-service/.env" "PORT" "3001"
upsert_env_var "$ROOT/aerovibe-iam-service/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-iam-service/.env" "NATS_URL" "127.0.0.1:4222"

upsert_env_var "$ROOT/aerovibe-users/.env" "PORT" "3003"
upsert_env_var "$ROOT/aerovibe-users/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-users/.env" "NATS_URL" "127.0.0.1:4222"

upsert_env_var "$ROOT/aerovibe-spots-service/.env" "PORT" "3004"
upsert_env_var "$ROOT/aerovibe-spots-service/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-spots-service/.env" "NATS_URL" "127.0.0.1:4222"

upsert_env_var "$ROOT/aerovibe-notifications-service/.env" "PORT" "3005"
upsert_env_var "$ROOT/aerovibe-notifications-service/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-notifications-service/.env" "NATS_URL" "127.0.0.1:4222"

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
    case "$app" in
      aerovibe-api-gateway)
        PORT=3000 \
        BIND_HOST=127.0.0.1 \
        API_URL=http://127.0.0.1:3002 \
        IAM_URL=http://127.0.0.1:3001 \
        USERS_URL=http://127.0.0.1:3003 \
        SPOTS_URL=http://127.0.0.1:3004 \
        NOTIFICATIONS_URL=http://127.0.0.1:3005 \
        pm2 restart "$app" --update-env
        ;;
      aerovibe-api-service)
        PORT=3002 BIND_HOST=127.0.0.1 NATS_URL=127.0.0.1:4222 pm2 restart "$app" --update-env
        ;;
      aerovibe-iam-service)
        PORT=3001 BIND_HOST=127.0.0.1 NATS_URL=127.0.0.1:4222 pm2 restart "$app" --update-env
        ;;
      aerovibe-users)
        PORT=3003 BIND_HOST=127.0.0.1 NATS_URL=127.0.0.1:4222 pm2 restart "$app" --update-env
        ;;
      aerovibe-spots-service)
        PORT=3004 BIND_HOST=127.0.0.1 NATS_URL=127.0.0.1:4222 pm2 restart "$app" --update-env
        ;;
      aerovibe-notifications-service)
        PORT=3005 BIND_HOST=127.0.0.1 NATS_URL=127.0.0.1:4222 pm2 restart "$app" --update-env
        ;;
      *)
        pm2 restart "$app" --update-env
        ;;
    esac
  else
    echo "[WARN] PM2 app no encontrada: $app (skip)"
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
