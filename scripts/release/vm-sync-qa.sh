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

synced_repos=0
for repo in "${REPOS[@]}"; do
  dir="$ROOT/$repo"
  [[ -d "$dir/.git" ]] || { echo "[WARN] repo faltante: $dir"; continue; }
  synced_repos=$((synced_repos + 1))

  echo "\n==> sync $repo"
  git -C "$dir" fetch --all --prune
  git -C "$dir" checkout develop
  git -C "$dir" pull --ff-only origin develop

  npm --prefix "$dir" ci

  if [[ "$repo" == "aerovibe-web" ]]; then
    npm --prefix "$dir" run build
  fi

done

if [[ "$synced_repos" -eq 0 ]]; then
  echo "[ERROR] No se encontró ningún repo Git en $ROOT/<repo>. Revisa ROOT y la estructura del servidor."
  exit 1
fi

echo "\n==> enforce ports and targets"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "PORT" "3100"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "API_URL" "http://127.0.0.1:3102"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "IAM_URL" "http://127.0.0.1:3101"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "USERS_URL" "http://127.0.0.1:3103"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "SPOTS_URL" "http://127.0.0.1:3104"
upsert_env_var "$ROOT/aerovibe-api-gateway/.env" "NOTIFICATIONS_URL" "http://127.0.0.1:3105"

upsert_env_var "$ROOT/aerovibe-api-service/.env" "PORT" "3102"
upsert_env_var "$ROOT/aerovibe-api-service/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-api-service/.env" "NATS_URL" "127.0.0.1:4222"

upsert_env_var "$ROOT/aerovibe-iam-service/.env" "PORT" "3101"
upsert_env_var "$ROOT/aerovibe-iam-service/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-iam-service/.env" "NATS_URL" "127.0.0.1:4222"

upsert_env_var "$ROOT/aerovibe-users/.env" "PORT" "3103"
upsert_env_var "$ROOT/aerovibe-users/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-users/.env" "NATS_URL" "127.0.0.1:4222"

upsert_env_var "$ROOT/aerovibe-spots-service/.env" "PORT" "3104"
upsert_env_var "$ROOT/aerovibe-spots-service/.env" "BIND_HOST" "127.0.0.1"
upsert_env_var "$ROOT/aerovibe-spots-service/.env" "NATS_URL" "127.0.0.1:4222"

upsert_env_var "$ROOT/aerovibe-notifications-service/.env" "PORT" "3105"
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
  aerovibe-api-gateway-qa
  aerovibe-api-service-qa
  aerovibe-iam-service-qa
  aerovibe-users-qa
  aerovibe-spots-service-qa
  aerovibe-notifications-service-qa
)
for app in "${APPS[@]}"; do
  if pm2 describe "$app" >/dev/null 2>&1; then
    case "$app" in
      aerovibe-api-gateway-qa)
        PORT=3100 \
        BIND_HOST=127.0.0.1 \
        API_URL=http://127.0.0.1:3102 \
        IAM_URL=http://127.0.0.1:3101 \
        USERS_URL=http://127.0.0.1:3103 \
        SPOTS_URL=http://127.0.0.1:3104 \
        NOTIFICATIONS_URL=http://127.0.0.1:3105 \
        pm2 restart "$app" --update-env
        ;;
      aerovibe-api-service-qa)
        PORT=3102 BIND_HOST=127.0.0.1 NATS_URL=127.0.0.1:4222 pm2 restart "$app" --update-env
        ;;
      aerovibe-iam-service-qa)
        PORT=3101 BIND_HOST=127.0.0.1 NATS_URL=127.0.0.1:4222 pm2 restart "$app" --update-env
        ;;
      aerovibe-users-qa)
        PORT=3103 BIND_HOST=127.0.0.1 NATS_URL=127.0.0.1:4222 pm2 restart "$app" --update-env
        ;;
      aerovibe-spots-service-qa)
        PORT=3104 BIND_HOST=127.0.0.1 NATS_URL=127.0.0.1:4222 pm2 restart "$app" --update-env
        ;;
      aerovibe-notifications-service-qa)
        PORT=3105 BIND_HOST=127.0.0.1 NATS_URL=127.0.0.1:4222 pm2 restart "$app" --update-env
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
curl -fsS http://127.0.0.1:3100/api/health && echo
curl -fsS http://127.0.0.1:3105/health && echo
curl -fsS http://127.0.0.1:3100/api/notifications/health && echo
