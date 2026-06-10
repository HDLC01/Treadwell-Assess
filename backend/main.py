"""Treadwell Assess — FastAPI entrypoint.

Run locally:
    cd backend && uv run uvicorn main:app --reload --port 8897

Startup runs migrations + the insert-only seed (and a dev bootstrap that creates a
demo job + assessment link token `demo` when ENVIRONMENT=development).
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import assessment, health, jobs

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

app.include_router(health.router, prefix="/api")
app.include_router(assessment.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
