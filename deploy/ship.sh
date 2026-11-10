#!/usr/bin/env bash
# Off-box deploy for Treadwell Assess.
#
# WHY: the VPS is a single core / 2 GB box. Running `docker compose up --build`
# ON it spikes load to ~60 and browns out every site on the machine. So we build
# the images HERE, ship them over SSH, and the VPS only loads + restarts — no
# build, no CPU storm.
#
# Prereqs: local Docker engine running; the `treadwell-vps` alias in ~/.ssh/config.
#          The alias supplies the host, port, user and key. It logs in as hanztwell,
#          and the box runs every command (and this script's stdin) as root via sudo.
# Usage:   bash deploy/ship.sh
#          VPS_HOST / VPS_USER / SSH_KEY still override the target if ever needed.
set -euo pipefail

VPS_HOST="${VPS_HOST:-treadwell-vps}"
VPS_USER="${VPS_USER:-}"
SSH_KEY="${SSH_KEY:-}"
APP_DIR="/opt/treadwell-assess"
SSH=(ssh -o ConnectTimeout=20)
if [ -n "$SSH_KEY" ]; then SSH+=(-i "$SSH_KEY"); fi
SSH+=("${VPS_USER:+${VPS_USER}@}${VPS_HOST}")

cd "$(dirname "$0")/.."

echo "==> Building images locally (linux/amd64) — off the prod box…"
docker build --platform linux/amd64 -t treadwell-assess-web:latest ./frontend
docker build --platform linux/amd64 -t treadwell-assess-api:latest ./backend

echo "==> Saving + shipping images over SSH…"
docker save treadwell-assess-web:latest treadwell-assess-api:latest \
  | gzip \
  | "${SSH[@]}" "cat > /tmp/assess-images.tar.gz"

echo "==> Loading images + restarting prod stack (NO on-box build)…"
"${SSH[@]}" "set -euo pipefail
  cd $APP_DIR
  git pull --ff-only
  gunzip -c /tmp/assess-images.tar.gz | docker load
  rm -f /tmp/assess-images.tar.gz
  docker compose --profile full up -d
  for i in \$(seq 1 24); do
    if curl -fsS http://localhost:8897/api/health >/dev/null; then echo '   api healthy'; exit 0; fi
    sleep 5
  done
  echo '   post-deploy healthcheck failed'; exit 1
"
echo "==> Done — assess.wetreadwell.com is on the freshly-shipped image."
