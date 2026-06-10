"""Health — always answers, reports db reachability."""

from __future__ import annotations

from fastapi import APIRouter

from config import settings
from db import db_ok

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "env": settings.ENVIRONMENT,
        "db": "ok" if db_ok() else "down",
        "service": "treadwell-assess-api",
    }
