#!/usr/bin/env bash
set -euo pipefail

# Issue / renew Let's Encrypt certificates via certbot (standalone webroot).
# Prerequisites:
#   - DNS A record for DOMAIN points to this EC2 public IP
#   - Ports 80/443 open in the security group
#   - docker compose prod stack running (or at least nginx on :80)
#
# Usage: ./scripts/issue-letsencrypt.sh example.com you@example.com

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: $0 <domain> <email>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="$ROOT_DIR/nginx/certs"
WEBROOT="$ROOT_DIR/nginx/certbot-www"

mkdir -p "$CERT_DIR" "$WEBROOT"

docker run --rm \
  -v "$WEBROOT:/var/www/certbot" \
  -v "$CERT_DIR:/etc/letsencrypt" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

LIVE="/etc/letsencrypt/live/$DOMAIN"
# Certbot wrote into the mounted CERT_DIR as /etc/letsencrypt
if [[ -f "$CERT_DIR/live/$DOMAIN/fullchain.pem" ]]; then
  cp -L "$CERT_DIR/live/$DOMAIN/fullchain.pem" "$CERT_DIR/fullchain.pem"
  cp -L "$CERT_DIR/live/$DOMAIN/privkey.pem" "$CERT_DIR/privkey.pem"
  chmod 600 "$CERT_DIR/privkey.pem"
  echo "Installed Let's Encrypt certs into nginx/certs/"
else
  echo "Certbot finished but live certs not found under $CERT_DIR/live/$DOMAIN"
  exit 1
fi

cd "$ROOT_DIR"
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T nginx nginx -s reload || \
  docker compose -f docker-compose.prod.yml --env-file .env.prod restart nginx

echo "TLS active for https://$DOMAIN"
