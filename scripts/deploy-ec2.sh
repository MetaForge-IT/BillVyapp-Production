#!/usr/bin/env bash
set -euo pipefail

# Deploy / refresh production stack on AWS EC2.
# Prerequisites: Docker + Compose plugin, cloned repo, configured secrets + TLS certs.
#
#   cp .env.prod.example .env.prod
#   cp backend/.env.prod.example backend/.env.prod
#   ./scripts/generate-self-signed-certs.sh your-domain.com   # first time
#   ./scripts/deploy-ec2.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Missing $1 — copy from the matching .example file and fill secrets."
    exit 1
  fi
}

require_file "$ENV_FILE"
require_file backend/.env.prod

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

missing=()
[[ -z "${GRAFANA_ADMIN_PASSWORD:-}" || "$GRAFANA_ADMIN_PASSWORD" == "replace-with-strong-grafana-password" ]] && missing+=("GRAFANA_ADMIN_PASSWORD")

# Validate backend secrets without printing values
backend_env="backend/.env.prod"
check_backend() {
  local key="$1"
  local val
  val="$(grep -E "^${key}=" "$backend_env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  if [[ -z "$val" || "$val" == replace-* || "$val" == *your-* || "$val" == *YOUR_* || "$val" == *example.com* ]]; then
    missing+=("backend/.env.prod:$key")
  fi
}

check_backend JWT_ACCESS_SECRET
check_backend DATABASE_URL
check_backend CORS_ORIGIN
check_backend FRONTEND_URL
check_backend API_PUBLIC_URL
check_backend SMTP_HOST
check_backend SMTP_USER
check_backend SMTP_PASS

if ((${#missing[@]} > 0)); then
  echo "Replace placeholder secrets before deploy:"
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

if [[ ! -f nginx/certs/fullchain.pem || ! -f nginx/certs/privkey.pem ]]; then
  echo "TLS certs missing. Generating self-signed bootstrap certs..."
  DOMAIN_FOR_CERT="${DOMAIN:-localhost}"
  bash "$ROOT_DIR/scripts/generate-self-signed-certs.sh" "$DOMAIN_FOR_CERT"
fi

# Prefer pulling CD images; fall back to local build if pull fails / images unset
if [[ -n "${API_IMAGE:-}" && -n "${FRONTEND_IMAGE:-}" && "$API_IMAGE" != *OWNER* ]]; then
  echo "Pulling images..."
  "${COMPOSE[@]}" pull api frontend || true
fi

echo "Starting stack..."
"${COMPOSE[@]}" up -d --remove-orphans

echo "Waiting for API health..."
for i in {1..30}; do
  if curl -kfsS "https://127.0.0.1/api/health" >/dev/null 2>&1; then
    echo "Healthy."
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "API health check timed out — inspect: docker compose -f docker-compose.prod.yml --env-file $ENV_FILE logs api nginx"
    exit 1
  fi
  sleep 2
done

echo "Deployed."
echo "  HTTPS: https://${DOMAIN:-your-domain.com}"
echo "  Grafana: http://<ec2-ip>:3001"
echo "Replace self-signed certs with: ./scripts/issue-letsencrypt.sh ${DOMAIN:-your-domain.com} you@example.com"
