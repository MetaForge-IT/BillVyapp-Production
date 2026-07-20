#!/usr/bin/env bash
set -euo pipefail

# Generate self-signed TLS certs so nginx/https.conf can start before Let's Encrypt.
# Usage: ./scripts/generate-self-signed-certs.sh [domain]

DOMAIN="${1:-localhost}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="$ROOT_DIR/nginx/certs"

mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/CN=${DOMAIN}" \
  -addext "subjectAltName=DNS:${DOMAIN},DNS:www.${DOMAIN},DNS:localhost"

chmod 600 "$CERT_DIR/privkey.pem"
chmod 644 "$CERT_DIR/fullchain.pem"

echo "Wrote $CERT_DIR/fullchain.pem and privkey.pem for ${DOMAIN}"
echo "Browsers will warn until you replace these with Let's Encrypt certs."
