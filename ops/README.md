# Ops — Treadwell Assess (VPS)

App lives at `/opt/treadwell-assess` on the shared VPS. SSH in through the
`treadwell-vps` alias in `~/.ssh/config`:

```bash
ssh treadwell-vps
```

The alias logs in as `hanztwell`; the box runs every command as root via sudo.

Stack: `web` (Next.js) → `127.0.0.1:8896`, `api` (FastAPI) → `127.0.0.1:8897`,
`db` (Postgres, internal). nginx routes `assess.wetreadwell.com` → `/` web, `/api` api,
with Let's Encrypt TLS (auto-renews).

| Task | Command |
|------|---------|
| First-time install | `bash deploy/install-vps.sh assess.wetreadwell.com` |
| Deploy / update | `cd /opt/treadwell-assess && git pull && docker compose --profile full up -d --build` |
| Start | `ops/tw-up` |
| Stop | `ops/tw-down` |
| Status + health | `ops/tw-status` |
| Logs | `cd /opt/treadwell-assess && docker compose --profile full logs -f` |

Config is in `/opt/treadwell-assess/.env` (root level; never committed).
