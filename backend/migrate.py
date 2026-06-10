"""Idempotent startup migration runner: apply migrations/NNN_*.sql in order,
tracked in schema_migrations (same pattern as the roadmap)."""

from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import text

from db import connect, wait_for_db

log = logging.getLogger("assess.migrate")
MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def run() -> None:
    if not wait_for_db(timeout_s=30):
        raise RuntimeError("Postgres not reachable; cannot migrate")
    with connect() as conn:
        conn.execute(text(
            "create table if not exists schema_migrations ("
            "  filename text primary key, applied_at timestamptz not null default now())"
        ))
        applied = {r[0] for r in conn.execute(text("select filename from schema_migrations"))}
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name in applied:
                continue
            sql = path.read_text(encoding="utf-8")
            conn.exec_driver_sql(sql)
            conn.execute(text("insert into schema_migrations (filename) values (:f)"), {"f": path.name})
            log.info("applied %s", path.name)
