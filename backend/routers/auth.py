"""Auth-support endpoints for the employer side.

GET /public-config  -> publishable config the login client needs to boot (public)
GET /me             -> the signed-in employer; upserts a row in `users` (gated)
"""

from __future__ import annotations

from fastapi import APIRouter, Request
from sqlalchemy import text

import auth_supabase
from config import settings
from db import connect

router = APIRouter(tags=["auth"])


@router.get("/public-config")
def public_config():
    """The anon key is safe to expose; the service-role/JWT secret never leaves
    the server. Empty values signal "auth not configured" so the frontend stays
    open in local dev."""
    return {
        "supabase_url": settings.SUPABASE_URL,
        "supabase_anon_key": settings.SUPABASE_ANON_KEY,
        "allowed_domain": auth_supabase._allowed_domain(),
        "auth_enabled": settings.auth_enabled,
    }


@router.get("/me")
def me(request: Request):
    """Identify the signed-in employer and ensure their `users` row exists.
    The gate has already verified the token; re-read claims here for the name."""
    claims = auth_supabase.verify_token_claims(request.headers.get("authorization"))
    email = claims["email"]
    name = auth_supabase.claim_name(claims)

    with connect() as conn:
        row = conn.execute(
            text(
                "insert into users (email, full_name) values (:e, :n) "
                "on conflict (email) do update set "
                "  full_name = coalesce(excluded.full_name, users.full_name) "
                "returning email, full_name, role"
            ),
            {"e": email, "n": name},
        ).mappings().first()

    return {"ok": True, "email": row["email"], "name": row["full_name"], "role": row["role"]}
