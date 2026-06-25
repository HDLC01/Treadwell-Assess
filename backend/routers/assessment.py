"""Candidate assessment flow (tokenized link, no login).

GET  /assess/{token}             -> link/job meta + the adjective list (id+word ONLY —
                                    factor/direction mappings never leave the server)
POST /assess/{token}/start       -> create the candidate (name, email) -> candidate_id
POST /assess/{token}/behavioral  -> submit both checklists -> scored result + profile
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from config import settings
from db import connect
from services import cognitive_scorer
from services.behavioral_scorer import FACTOR_NAMES, band_label, score_assessment
from services.profile_matcher import match_profile

router = APIRouter(tags=["assessment"])

MIN_WORDS_PER_CHECKLIST = 6  # below this the result isn't meaningful


class StartBody(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: Optional[str] = Field(default=None, max_length=320)


class BehavioralBody(BaseModel):
    candidate_id: str
    checklist1_word_ids: List[int]  # "how others expect you to act at work"
    checklist2_word_ids: List[int]  # "the real you"


class CogAnswer(BaseModel):
    item_id: int
    chosen: Optional[int] = None     # None = left unanswered (scored wrong)


class CognitiveBody(BaseModel):
    candidate_id: str
    answers: List[CogAnswer]
    expired: bool = False            # True when the timer ran out (auto-submit)


def _get_link(conn, token: str):
    row = conn.execute(
        text("select l.id, l.job_id, l.expires_at, j.name as job_name "
             "from assessment_links l join jobs j on j.id = l.job_id "
             "where l.token = :t"),
        {"t": token},
    ).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="This assessment link is not valid.")
    exp = row["expires_at"]
    if exp is not None and exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="This assessment link has expired.")
    return row


@router.get("/assess/{token}")
def get_assessment(token: str):
    with connect() as conn:
        link = _get_link(conn, token)
        words = conn.execute(
            text("select id, word from adjectives where active order by id")
        ).mappings().all()
    # deterministic-per-token shuffle: same candidate sees a stable order,
    # different tokens see different orders
    word_list = [{"id": w["id"], "word": w["word"]} for w in words]
    random.Random(token).shuffle(word_list)
    return {
        "job_name": link["job_name"],
        "min_words": MIN_WORDS_PER_CHECKLIST,
        "prompts": [
            "Select the words that describe the way you are expected to act at work.",
            "Select the words that you believe really describe you.",
        ],
        "words": word_list,
    }


@router.post("/assess/{token}/start")
def start_assessment(token: str, body: StartBody):
    with connect() as conn:
        link = _get_link(conn, token)
        row = conn.execute(
            text("insert into candidates (job_id, link_id, full_name, email) "
                 "values (:j, :l, :n, :e) returning id"),
            {"j": link["job_id"], "l": link["id"], "n": body.full_name.strip(),
             "e": (body.email or "").strip().lower() or None},
        ).first()
    return {"candidate_id": str(row[0])}


@router.post("/assess/{token}/behavioral")
def submit_behavioral(token: str, body: BehavioralBody):
    if len(body.checklist1_word_ids) < MIN_WORDS_PER_CHECKLIST or \
       len(body.checklist2_word_ids) < MIN_WORDS_PER_CHECKLIST:
        raise HTTPException(
            status_code=422,
            detail=f"Select at least {MIN_WORDS_PER_CHECKLIST} words on each checklist.",
        )

    with connect() as conn:
        _get_link(conn, token)
        cand = conn.execute(
            text("select id from candidates where id = :c"), {"c": body.candidate_id}
        ).first()
        if cand is None:
            raise HTTPException(status_code=404, detail="Candidate not found — start the assessment first.")

        # resolve word ids -> (factor, direction) server-side only
        all_ids = sorted(set(body.checklist1_word_ids) | set(body.checklist2_word_ids))
        rows = conn.execute(
            text("select id, factor, direction from adjectives where active and id = any(:ids)"),
            {"ids": all_ids},
        ).mappings().all()
        lookup = {r["id"]: (r["factor"], r["direction"]) for r in rows}

        def resolve(ids: List[int]):
            return [lookup[i] for i in ids if i in lookup]

        scores = score_assessment(resolve(body.checklist1_word_ids), resolve(body.checklist2_word_ids))

        profiles = conn.execute(
            text("select id, slug, name, tagline, description, ideal_a, ideal_b, ideal_c, ideal_d "
                 "from reference_profiles")
        ).mappings().all()
        profile = match_profile(scores["synthesis"], [dict(p) for p in profiles])

        result = conn.execute(
            text("insert into behavioral_results "
                 "(candidate_id, checklist1_word_ids, checklist2_word_ids, "
                 " self_scores, self_concept_scores, synthesis_scores, reference_profile_id) "
                 "values (:c, :w1, :w2, :s, :sc, :syn, :p) returning id"),
            {"c": body.candidate_id,
             "w1": body.checklist1_word_ids, "w2": body.checklist2_word_ids,
             "s": json.dumps(scores["self"]), "sc": json.dumps(scores["self_concept"]),
             "syn": json.dumps(scores["synthesis"]),
             "p": profile["id"] if profile else None},
        ).first()

    factors = [
        {"factor": f, "name": FACTOR_NAMES[f],
         "self": scores["self"][f], "self_concept": scores["self_concept"][f],
         "synthesis": scores["synthesis"][f],
         "band": band_label(f, scores["synthesis"][f])}
        for f in ("A", "B", "C", "D")
    ]
    return {
        "result_id": str(result[0]),
        "factors": factors,
        "reference_profile": (
            {"slug": profile["slug"], "name": profile["name"],
             "tagline": profile["tagline"], "description": profile["description"]}
            if profile else None
        ),
    }


def _active_cognitive_items(conn, with_answer: bool):
    cols = "id, item_type, prompt, options" + (", answer" if with_answer else "")
    rows = conn.execute(
        text(f"select {cols} from cognitive_items where active and not is_sample order by id")
    ).mappings().all()
    items = [dict(r) for r in rows]
    for it in items:  # jsonb usually decodes to a list already; be defensive
        if isinstance(it["options"], str):
            it["options"] = json.loads(it["options"])
    return items


def _practice_items(conn):
    """Untimed warm-up questions, drawn from the is_sample bank. These are NEVER
    scored, so their answer keys ARE returned — the UI shows instant feedback so the
    candidate learns the format before the real (timed, key-hidden) test."""
    rows = conn.execute(
        text("select id, item_type, prompt, options, answer from cognitive_items "
             "where active and is_sample order by id limit :n"),
        {"n": settings.COGNITIVE_PRACTICE_ITEMS},
    ).mappings().all()
    items = [dict(r) for r in rows]
    for it in items:
        if isinstance(it["options"], str):
            it["options"] = json.loads(it["options"])
    return items


@router.get("/assess/{token}/cognitive")
def get_cognitive(token: str, candidate_id: str):
    """The timed cognitive test for THIS candidate, plus an untimed practice round.
    The item set, its order, AND each item's option order are seeded by the candidate
    id, so no two candidates get an identical test (anti-cheating). Real-test answer
    keys are NEVER included; the set is rebuilt server-side on submit from the same
    seed. Practice items DO include answers (samples, never scored) for instant feedback."""
    with connect() as conn:
        link = _get_link(conn, token)
        cand = conn.execute(
            text("select id from candidates where id = :c and job_id = :j"),
            {"c": candidate_id, "j": link["job_id"]},
        ).first()
        if cand is None:
            raise HTTPException(status_code=404, detail="Candidate not found — start the assessment first.")
        items = _active_cognitive_items(conn, with_answer=False)
        practice = _practice_items(conn)
    administered = cognitive_scorer.select_items(items, candidate_id)
    return {
        "time_limit_sec": settings.COGNITIVE_TIME_LIMIT_SEC,
        "num_items": len(administered),
        "items": [
            {"id": it["id"], "item_type": it["item_type"], "prompt": it["prompt"],
             "options": [it["options"][i]
                         for i in cognitive_scorer.option_order(candidate_id, it["id"], len(it["options"]))]}
            for it in administered
        ],
        "practice": [
            {"id": it["id"], "item_type": it["item_type"], "prompt": it["prompt"],
             "options": it["options"], "answer": it["answer"]}
            for it in practice
        ],
    }


@router.post("/assess/{token}/cognitive")
def submit_cognitive(token: str, body: CognitiveBody):
    """Score the cognitive test. The administered set + option order are rebuilt
    server-side from the candidate id (so the denominator can't be gamed and the
    per-candidate option shuffle is reversed) and graded against the hidden keys."""
    with connect() as conn:
        _get_link(conn, token)
        cand = conn.execute(
            text("select id from candidates where id = :c"), {"c": body.candidate_id}
        ).first()
        if cand is None:
            raise HTTPException(status_code=404, detail="Candidate not found — start the assessment first.")

        items = _active_cognitive_items(conn, with_answer=True)
        administered = cognitive_scorer.select_items(items, body.candidate_id)
        by_id = {it["id"]: it for it in administered}
        # Candidates answer in the per-candidate SERVED option order; map each choice
        # back to the item's original option index before grading.
        remapped: dict[int, Optional[int]] = {}
        for a in body.answers:
            it = by_id.get(a.item_id)
            if it is None or a.chosen is None:
                remapped[a.item_id] = None
                continue
            perm = cognitive_scorer.option_order(body.candidate_id, a.item_id, len(it["options"]))
            chosen = int(a.chosen)
            remapped[a.item_id] = perm[chosen] if 0 <= chosen < len(perm) else None
        scored = cognitive_scorer.score(administered, remapped)
        status = "expired" if body.expired else "complete"

        conn.execute(
            text("insert into cognitive_results "
                 "(candidate_id, answers, raw_score, scaled_score, status) "
                 "values (:c, :ans, :raw, :scaled, :st)"),
            {"c": body.candidate_id,
             "ans": json.dumps([{"item_id": a.item_id, "chosen": a.chosen} for a in body.answers]),
             "raw": scored["raw_score"], "scaled": scored["scaled_score"], "st": status},
        )

    # The candidate isn't shown their cognitive score — only that it's recorded.
    return {"ok": True, "status": status, "num_items": scored["num_items"]}
