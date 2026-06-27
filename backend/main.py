"""Treadwell Assess — FastAPI entrypoint.

Run locally:
    cd backend && uv run uvicorn main:app --reload --port 8897

Startup runs migrations + the insert-only seed (and a dev bootstrap that creates a
demo job + assessment link token `demo` when ENVIRONMENT=development).
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import auth_supabase
from config import settings
from routers import assessment, assistant, auth, health, jobs

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("assess.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting Treadwell Assess API — env=%s", settings.ENVIRONMENT)
    try:
        import migrate
        import seed

        migrate.run()
        seed.run()
    except Exception as exc:  # noqa: BLE001 — keep /health alive to report db=down
        log.error("Startup migrate/seed failed (API stays up): %s", exc)
    yield


app = FastAPI(title="Treadwell Assess", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Employer auth gate (Supabase Google login, @wetreadwell.com only) ─────────
# ONE middleware gates every employer /api/* route so none can be forgotten. The
# candidate flow (/api/assess/*), health, and /api/public-config stay public (see
# auth_supabase.is_public_path). When Supabase isn't configured the gate is a
# no-op, so local dev stays open until keys are set (CLAUDE.md).
@app.middleware("http")
async def auth_gate(request: Request, call_next):
    if not settings.auth_enabled or auth_supabase.is_public_path(request.url.path, request.method):
        return await call_next(request)
    try:
        request.state.user_email = auth_supabase.verify_token(request.headers.get("authorization"))
    except auth_supabase.AuthError as exc:
        return JSONResponse(status_code=exc.status, content={"ok": False, "error": exc.detail})
    return await call_next(request)


app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(assessment.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")
