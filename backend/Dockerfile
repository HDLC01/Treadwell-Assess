FROM python:3.12-slim

# Node + the Claude Code CLI (powers the admin AI assistant via `claude -p`).
# Auth is the Team-seat OAuth token (CLAUDE_CODE_OAUTH_TOKEN, from .env); the CLI
# config persists on the /root/.claude volume mounted by docker-compose.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && npm install -g @anthropic-ai/claude-code \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

ENV CLAUDE_CONFIG_DIR=/root/.claude

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8897

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8897/api/health', timeout=4)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8897"]
