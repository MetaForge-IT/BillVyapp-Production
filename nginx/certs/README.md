# Keep this directory for TLS certificates.
# Place Let's Encrypt (or self-signed) files here:
#   fullchain.pem
#   privkey.pem
#
# Generate self-signed bootstrap certs:
#   ./scripts/generate-self-signed-certs.sh your-domain.com
#
# Issue real Let's Encrypt certs (on EC2, after DNS points here):
#   ./scripts/issue-letsencrypt.sh your-domain.com you@example.com
