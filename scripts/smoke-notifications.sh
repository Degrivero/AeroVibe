#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/smoke-notifications.sh --email <address> [options]

Options:
  --email <address>        Email to test recover flow (required)
  --iam-base <url>         IAM base URL (default: http://127.0.0.1:3000/api/iam)
  --service-health <url>   Notifications direct health (default: http://127.0.0.1:3005/health)
  --gateway-health <url>   Notifications via gateway (default: http://127.0.0.1:3000/api/notifications/health)
  --env-file <path>        Env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
                           (default: aerovibe-notifications-service/.env)
  --attempts <n>           Number of recover calls (default: 4)
  --wait-seconds <n>       Wait after requests before querying logs (default: 8)
  --no-db-check            Skip Supabase log/rate-limit checks
EOF
}

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] Missing command: $1"
    exit 1
  }
}

need curl
need python3

EMAIL=""
IAM_BASE="http://127.0.0.1:3000/api/iam"
SERVICE_HEALTH="http://127.0.0.1:3005/health"
GATEWAY_HEALTH="http://127.0.0.1:3000/api/notifications/health"
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/aerovibe-notifications-service/.env"
ATTEMPTS=4
WAIT_SECONDS=8
CHECK_DB=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    --iam-base)
      IAM_BASE="${2:-}"
      shift 2
      ;;
    --service-health)
      SERVICE_HEALTH="${2:-}"
      shift 2
      ;;
    --gateway-health)
      GATEWAY_HEALTH="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --attempts)
      ATTEMPTS="${2:-4}"
      shift 2
      ;;
    --wait-seconds)
      WAIT_SECONDS="${2:-8}"
      shift 2
      ;;
    --no-db-check)
      CHECK_DB=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown arg: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$EMAIL" ]]; then
  echo "[ERROR] --email is required"
  usage
  exit 1
fi

if ! [[ "$ATTEMPTS" =~ ^[0-9]+$ ]] || (( ATTEMPTS < 1 )); then
  echo "[ERROR] --attempts must be a positive integer"
  exit 1
fi

if ! [[ "$WAIT_SECONDS" =~ ^[0-9]+$ ]] || (( WAIT_SECONDS < 0 )); then
  echo "[ERROR] --wait-seconds must be a non-negative integer"
  exit 1
fi

urlencode() {
  python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

json_or_fail() {
  local path="$1"
  local label="$2"
  python3 - "$path" "$label" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
label = sys.argv[2]
raw = path.read_text(encoding="utf-8")
if not raw.strip():
    print(f"[ERROR] {label}: empty response body")
    sys.exit(1)
try:
    json.loads(raw)
except Exception as exc:
    print(f"[ERROR] {label}: invalid JSON: {exc}")
    print(raw[:800])
    sys.exit(1)
print(f"[OK] {label}: valid JSON")
PY
}

echo "[1/4] Health checks"
curl -fsS "$SERVICE_HEALTH" >/dev/null
curl -fsS "$GATEWAY_HEALTH" >/dev/null
echo "[OK] health endpoints responding"

echo "[2/4] Trigger recover flow (${ATTEMPTS} calls)"
START_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
for i in $(seq 1 "$ATTEMPTS"); do
  code="$(curl -sS -o /tmp/notifications_recover_body.json -w '%{http_code}' \
    -X POST "${IAM_BASE}/recover" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"${EMAIL}\",\"locale\":\"en\"}")"
  echo "  - recover #${i}: HTTP ${code}"
  if [[ "$code" != "200" ]]; then
    echo "[ERROR] recover failed"
    cat /tmp/notifications_recover_body.json
    exit 1
  fi
done

echo "[3/4] Wait ${WAIT_SECONDS}s for async processing"
sleep "$WAIT_SECONDS"

if [[ "$CHECK_DB" == "false" ]]; then
  echo "[4/4] Skipped DB checks (--no-db-check)"
  echo "Smoke OK (health + recover endpoint)"
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] env file not found: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${SUPABASE_URL:?Missing SUPABASE_URL in env file}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Missing SUPABASE_SERVICE_ROLE_KEY in env file}"

ENC_EMAIL="$(urlencode "$EMAIL")"
ENC_START="$(urlencode "$START_ISO")"
ENC_RECIPIENT="$(urlencode "email:${EMAIL}")"

echo "[4/4] Query notification logs + rate limits"

LOGS_URL="${SUPABASE_URL}/rest/v1/notification_logs?select=id,status,error_message,created_at,event_type,recipient_email&event_type=eq.user.password.reset.requested&recipient_email=eq.${ENC_EMAIL}&created_at=gte.${ENC_START}&order=created_at.desc&limit=50"
curl -sS -D /tmp/notifications_logs_headers.txt "$LOGS_URL" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Accept: application/json" \
  -o /tmp/notifications_logs_body.json

json_or_fail /tmp/notifications_logs_body.json "notification_logs"

python3 - <<'PY'
import json
from collections import Counter
rows = json.load(open('/tmp/notifications_logs_body.json', encoding='utf-8'))
counts = Counter(r.get('status', 'unknown') for r in rows)
rate_limited = sum(1 for r in rows if str(r.get('error_message') or '').startswith('rate_limited'))
print(f"[INFO] notification_logs rows={len(rows)} status={dict(counts)} rate_limited_rows={rate_limited}")
if len(rows) == 0:
    raise SystemExit("[ERROR] notification_logs has no rows for this run")
PY

RL_URL="${SUPABASE_URL}/rest/v1/notification_rate_limits?select=event_type,count,updated_at,window_start,window_minutes&recipient_key=eq.${ENC_RECIPIENT}&updated_at=gte.${ENC_START}&order=updated_at.desc&limit=20"
curl -sS -D /tmp/notifications_rl_headers.txt "$RL_URL" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Accept: application/json" \
  -o /tmp/notifications_rl_body.json

json_or_fail /tmp/notifications_rl_body.json "notification_rate_limits"

python3 - <<'PY'
import json
rows = json.load(open('/tmp/notifications_rl_body.json', encoding='utf-8'))
mx = max((int(r.get('count') or 0) for r in rows), default=0)
print(f"[INFO] notification_rate_limits rows={len(rows)} max_count={mx}")
if len(rows) == 0:
    raise SystemExit("[ERROR] notification_rate_limits has no rows for this run")
PY

echo "Smoke OK"
