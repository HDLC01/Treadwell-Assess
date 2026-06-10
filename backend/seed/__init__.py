"""Idempotent, insert-only seed: adjective bank, reference profiles, sample cognitive
items — plus (development only) a demo job + assessment link token `demo`."""

from __future__ import annotations

import json
import logging

from sqlalchemy import text

from config import settings
from db import connect, wait_for_db
from seed import data

log = logging.getLogger("assess.seed")


def _seed_adjectives(conn) -> None:
    for word, factor, direction in data.ADJECTIVES:
        conn.execute(
            text("insert into adjectives (word, factor, direction) values (:w, :f, :d) "
                 "on conflict (word) do nothing"),
            {"w": word, "f": factor, "d": direction},
        )


def _seed_profiles(conn) -> None:
    for p in data.REFERENCE_PROFILES:
        a, b, c, d = p["ideal"]
        conn.execute(
            text("insert into reference_profiles (slug, name, tagline, description, "
                 "ideal_a, ideal_b, ideal_c, ideal_d) "
                 "values (:slug, :name, :tag, :desc, :a, :b, :c, :d) "
                 "on conflict (slug) do nothing"),
            {"slug": p["slug"], "name": p["name"], "tag": p["tagline"],
             "desc": p["description"], "a": a, "b": b, "c": c, "d": d},
        )


def _seed_cognitive(conn) -> None:
    for item in data.COGNITIVE_ITEMS:
        exists = conn.execute(
            text("select 1 from cognitive_items where prompt = :p"), {"p": item["prompt"]}
        ).first()
        if exists:
            continue
        conn.execute(
            text("insert into cognitive_items (item_type, prompt, options, answer, is_sample) "
                 "values (:t, :p, :o, :a, :s)"),
            {"t": item["item_type"], "p": item["prompt"],
             "o": json.dumps(item["options"]), "a": item["answer"],
             "s": item.get("is_sample", False)},
        )


def _dev_bootstrap(conn) -> None:
    """Demo job + token `demo` so the candidate flow is testable immediately."""
    job = conn.execute(text("select id from jobs where name = 'Demo Role'")).first()
    if job is None:
        target = {
            "A": {"low": 0.5, "high": 2.5},
            "B": {"low": 0.0, "high": 2.0},
            "C": {"low": -2.0, "high": 0.0},
            "D": {"low": -1.0, "high": 1.0},
        }
        job = conn.execute(
            text("insert into jobs (name, folder, behavioral_target, cognitive_target) "
                 "values ('Demo Role', 'Demo', :t, 20) returning id"),
            {"t": json.dumps(target)},
        ).first()
        log.info("dev bootstrap: created Demo Role")
    conn.execute(
        text("insert into assessment_links (job_id, token) values (:j, 'demo') "
             "on conflict (token) do nothing"),
        {"j": job[0]},
    )


def run() -> None:
    if not wait_for_db(timeout_s=30):
        raise RuntimeError("Postgres not reachable; cannot seed")
    with connect() as conn:
        _seed_adjectives(conn)
        _seed_profiles(conn)
        _seed_cognitive(conn)
        if settings.is_dev and settings.DEV_BOOTSTRAP:
            _dev_bootstrap(conn)
    log.info("seed complete (insert-only)")
