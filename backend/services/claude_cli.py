"""Claude via the local Claude Code CLI (`claude -p`).

Same pattern the Treadwell proposal tool + news feed use: auth is the Team-seat
OAuth token in CLAUDE_CODE_OAUTH_TOKEN (no Anthropic API key, no per-request
billing). The CLI is baked into the image and its config persists on the
/root/.claude volume (CLAUDE_CONFIG_DIR). Used by the admin assistant.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import tempfile

log = logging.getLogger("assess.claude")

# Spawn `claude` from a clean temp dir so it doesn't inherit this repo's CLAUDE.md.
_CLEAN_CWD = tempfile.mkdtemp(prefix="assess-claude-")


class ClaudeCLIError(RuntimeError):
    """Raised when the local `claude` CLI is missing or fails."""


def _ensure_config() -> None:
    # On a fresh creds volume the CLI errors "config file not found" in -p mode
    # unless a config json exists; auth itself comes from CLAUDE_CODE_OAUTH_TOKEN.
    cfg_dir = os.environ.get("CLAUDE_CONFIG_DIR") or os.path.expanduser("~/.claude")
    try:
        os.makedirs(cfg_dir, exist_ok=True)
        cfg = os.path.join(cfg_dir, ".claude.json")
        if not os.path.exists(cfg):
            with open(cfg, "w", encoding="utf-8") as fh:
                fh.write("{}")
    except OSError as exc:  # non-fatal — the call below will surface a clear error
        log.warning("could not seed claude config dir: %s", exc)


def call_claude(user_prompt: str, system: str = "", *, timeout: int = 90) -> str:
    """Return Claude's plain-text answer. Raises ClaudeCLIError on any failure.

    The system rules go through the CLI's own --append-system-prompt channel,
    kept separate from the user content. This is a prompt-injection defense:
    instructions embedded in untrusted data (e.g. a candidate's name) or in the
    question arrive only on the user channel and cannot pose as system rules.
    """
    _ensure_config()
    cmd = ["claude", "-p", "--output-format", "json"]
    if system:
        cmd += ["--append-system-prompt", system]
    try:
        result = subprocess.run(
            cmd,
            input=user_prompt,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=_CLEAN_CWD,
            timeout=timeout,
            shell=False,
        )
    except FileNotFoundError as exc:
        raise ClaudeCLIError("`claude` CLI not found on PATH.") from exc
    except subprocess.TimeoutExpired as exc:
        raise ClaudeCLIError(f"Claude CLI timed out (>{timeout}s).") from exc

    if result.returncode != 0:
        raise ClaudeCLIError(f"Claude CLI failed (exit {result.returncode}): {result.stderr.strip()[:300]}")

    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise ClaudeCLIError(f"Claude CLI returned non-JSON: {result.stdout[:300]!r}") from exc

    if payload.get("is_error"):
        raise ClaudeCLIError(f"Claude CLI reported error: {payload!r}")
    return (payload.get("result") or "").strip()
