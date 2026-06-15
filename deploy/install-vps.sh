#!/usr/bin/env bash
#
# Treadwell Assess — VPS install/deploy script (Ubuntu, shared Bluehost box).
#
# Two-container stack behind nginx:
#   web (Next.js)  -> 127.0.0.1:8896
#   api (FastAPI)  -> 127.0.0.1:8897   (also serves /api/health)
#   db  (Postgres) -> internal only (compose network)
# nginx routes  /api  -> :8897  and  /  -> :8896  for $DOMAIN, with Let's Encrypt TLS.
#
# Usage (on the VPS, as root):
#   bash /opt/treadwell-assess/deploy/install-vps.sh assess.wetreadwell.com
#
# Safe to re-run: clones-or-pulls, keeps an existing .env, only adds OUR nginx site
# (never touches other sites' configs).

set -euo pipefail

DOMAIN="${1:-assess.wetreadwell.com}"
REPO_URL="https://github.com/HDLC01/Treadwell-Assess.git"
APP_DIR="/opt/treadwell-assess"
SITE="treadwell-assess"

echo "==============================================================="
echo " Treadwell Assess — deploying to $DOMAIN"
echo "==============================================================="

# ─── 1. Base packages (idempotent; Docker/nginx likely already present) ───────
echo "[1/6] Ensuring git, nginx, certbot, ufw, docker..."
apt-get update -y
apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx ufw
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

# ─── 2. Firewall (no-op if already enabled) ───────────────────────────────────
echo "[2/6] Firewall (ufw allow 22/80/443)..."
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

# ─── 3. Clone or update the repo ──────────────────────────────────────────────
echo "[3/6] Sync repo at $APP_DIR..."
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR" && git pull --ff-only
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ─── 4. .env (root-level; compose injects it into the api container) ──────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "[4/6] Creating .env template — FILL IT IN, then re-run..."
  cat > "$APP_DIR/.env" <<'EOF'
# Treadwell Assess — production env (root level; consumed by docker-compose api service)
ENVIRONMENT=production

# Postgres (compose service `db`). Use a strong password — it initializes the volume.
POSTGRES_DB=assess
POSTGRES_USER=assess
POSTGRES_PASSWORD=

# No demo seed in production
DEV_BOOTSTRAP=false

SCORE_SCALE=2.5
COGNITIVE_NUM_ITEMS=20
COGNITIVE_TIME_LIMIT_SEC=600
COGNITIVE_SCALE_MAX=30

# CORS — the public origin
CORS_ORIGINS=https://assess.wetreadwell.com

# Employer auth (shared Treadwell Supabase project — AUTH ONLY)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
AUTH_ALLOWED_DOMAIN=wetreadwell.com

# Email (PDF reports) — leave blank to disable gracefully
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_STARTTLS=true
EOF
  echo "  >>> Edit $APP_DIR/.env (POSTGRES_PASSWORD + SUPABASE_*), then re-run this script."
  read -p "  Press Enter once .env is filled to continue..."
else
  echo "[4/6] .env exists, keeping it"
fi

# ─── 5. Build + run the full stack ────────────────────────────────────────────
echo "[5/6] Building + starting db + api + web..."
cd "$APP_DIR"
docker compose --profile full up -d --build
echo "  waiting for the api healthcheck..."
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8897/api/health >/dev/null 2>&1; then
    echo "  ✓ api healthy on 127.0.0.1:8897"; break
  fi
  sleep 3
  if [[ $i -eq 30 ]]; then echo "  ✗ api not healthy — check: docker compose --profile full logs"; exit 1; fi
done

# ─── 6. nginx reverse proxy (adds ONLY our site) + TLS ───────────────────────
echo "[6/6] nginx reverse proxy for $DOMAIN..."
cat > "/etc/nginx/sites-available/$SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ { root /var/www/html; }

    # API -> FastAPI container
    location /api/ {
        proxy_pass http://127.0.0.1:8897;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        client_max_body_size 10M;
    }

    # Everything else -> Next.js web container
    location / {
        proxy_pass http://127.0.0.1:8896;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
ln -sf "/etc/nginx/sites-available/$SITE" "/etc/nginx/sites-enabled/$SITE"
nginx -t
systemctl reload nginx

echo "  Requesting Let's Encrypt cert for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m hanz@wetreadwell.com --redirect
systemctl reload nginx

echo ""
echo "==============================================================="
echo " ✓ Deploy complete — https://$DOMAIN"
echo "==============================================================="
echo " Update:  cd $APP_DIR && git pull && docker compose --profile full up -d --build"
echo " Logs:    cd $APP_DIR && docker compose --profile full logs -f"
