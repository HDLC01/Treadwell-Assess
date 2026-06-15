"""Employer auth — verify the Supabase (Google) JWT the browser sends.

AUTH ONLY. We reuse the shared Treadwell cloud Supabase project just to
authenticate @wetreadwell.com employees; all application data stays in our own
Postgres. The candidate flow (/api/assess/*) is tokenized-link only and is NEVER
gated here — only the employer routes are.

Pattern copied (not imported) from the Treadwell proposal tool's supabase_client.
PyJWT enforces `exp`, so expired tokens are rejected. Supports both HS256 (legacy
shared secret) and asymmetric signing (RS/ES via the project's JWKS).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from config import settings


class AuthError(Exception):
    """Auth/authorization failure. `status` maps straight to an HTTP status."""

    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status = status
        self.detail = detail


def _allowed_domain() -> str:
    return (settings.AUTH_ALLOWED_DOMAIN or "wetreadwell.com").strip().lower().lstrip("@")


# ── Which requests bypass the gate ───────────────────────────────────────────
_PUBLIC_PATHS = {"/api/health", "/api/healthz", "/api/public-config"}


def is_public_path(path: str, method: str) -> bool:
    """True for requests that must NOT be gated:
      - CORS preflight (OPTIONS)
      - anything outside /api/* (Next.js pages gate themselves client-side)
      - the candidate assessment flow (tokenized link, no login)
      - health + the public config the login client needs to boot
    """
    if method.upper() == "OPTIONS":
        return True
    if not path.startswith("/api/"):
        return True
    if path.startswith("/api/assess/"):
        return True
    return path in _PUBLIC_PATHS


# ── Token verification ───────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def _jwk_client():
    import jwt

    return jwt.PyJWKClient(f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json")


def verify_token_claims(authorization: Optional[str]) -> dict:
    """Verify an `Authorization: Bearer <jwt>` Supabase token and return its
    validated claims (with `email` lowercased).

    Raises AuthError(401) if missing/invalid/expired, AuthError(403) if the
    email's domain isn't allowed.
    """
    import jwt

    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError(401, "Missing bearer token.")
    token = authorization.split(" ", 1)[1].strip()

    try:
        alg = (jwt.get_unverified_header(token).get("alg") or "").upper()
        if alg.startswith("HS"):
            secret = settings.SUPABASE_JWT_SECRET
            if not secret:
                raise AuthError(503, "SUPABASE_JWT_SECRET not set for HS256 tokens.")
            payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
        else:
            key = _jwk_client().get_signing_key_from_jwt(token).key
            payload = jwt.decode(token, key, algorithms=[alg], audience="authenticated")
    except AuthError:
        raise
    except Exception as exc:  # bad signature / expired / malformed
        raise AuthError(401, f"Invalid or expired token: {exc}")

    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise AuthError(401, "Token carries no email.")
    if not email.endswith("@" + _allowed_domain()):
        raise AuthError(403, f"Access is restricted to @{_allowed_domain()} accounts.")
    payload["email"] = email
    return payload


def verify_token(authorization: Optional[str]) -> str:
    """Verify the token and return just the (lowercased) email — the gate path."""
    return verify_token_claims(authorization)["email"]


def claim_name(claims: dict) -> Optional[str]:
    """Best-effort display name from a Supabase Google token."""
    meta = claims.get("user_metadata") or {}
    return meta.get("full_name") or meta.get("name") or claims.get("name")
