#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/certs"
rm -f localhost+*.pem
mkcert localhost api.localhost app.localhost traefik.localhost minio.localhost 127.0.0.1 ::1
echo "Done. Update tls.yml if filenames changed, then: docker compose restart traefik"