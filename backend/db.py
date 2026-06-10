"""Lazy SQLAlchemy engine + helpers (mirrors the proven roadmap pattern)."""

from __future__ import annotations

import logging
import time
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from config import settings

log = logging.getLogger("assess.db")

_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(settings.database_url, pool_pre_ping=True, pool_size=5)
    return _engine


@contextmanager
def connect():
    """begin() connection — commits on success, rolls back on error."""
    with get_engine().begin() as conn:
        yield conn


def wait_for_db(timeout_s: int = 30) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with get_engine().connect() as conn:
                conn.execute(text("select 1"))
            return True
        except Exception:  # noqa: BLE001
            time.sleep(1)
    return False


def db_ok() -> bool:
    try:
        with get_engine().connect() as conn:
            conn.execute(text("select 1"))
        return True
    except Exception:  # noqa: BLE001
        return False
