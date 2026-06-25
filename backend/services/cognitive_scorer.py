"""Cognitive scoring — deterministic, calibratable (mirrors the behavioral scorer's spirit).

The set of items a token administers is chosen DETERMINISTICALLY from the active
bank (seeded by the token), so the server can reproduce the exact same set on submit
and score against it — the client can't shrink the denominator to inflate its score.
Correct-answer keys never leave the server.

Scaled score lives on an original normed scale [0, COGNITIVE_SCALE_MAX]; a job's
cognitive_target is expressed against it. Start simple (proportion of the administered
items, correct), recalibrate to a real norm group later.
"""

from __future__ import annotations

import random
from typing import Dict, List

from config import settings


def select_items(all_items: List[dict], seed: str, n: int | None = None) -> List[dict]:
    """Pick the items a candidate is administered — a stable per-`seed` shuffle, then
    the first `n`. Seed on the CANDIDATE id (not the shared link token) so no two
    candidates get the same items in the same order — that closes an answer-sharing
    gap. Same seed → same set, so the server can reproduce and score it. `all_items`
    should already be the active, non-sample bank."""
    n = settings.COGNITIVE_NUM_ITEMS if n is None else n
    ordered = list(all_items)
    random.Random(f"cog::{seed}").shuffle(ordered)
    return ordered[: min(n, len(ordered))]


def option_order(seed: str, item_id: int, n_options: int) -> List[int]:
    """A stable per-(candidate, item) permutation of option indices, so the answer
    choices are also shuffled per candidate — 'the answer is option C' can't be
    shared. Served position j maps back to the original option index perm[j]."""
    perm = list(range(n_options))
    if n_options > 1:
        random.Random(f"opt::{seed}::{item_id}").shuffle(perm)
    return perm


def score(administered: List[dict], answers: Dict[int, int]) -> dict:
    """administered: the canonical item dicts (with `id` and `answer`).
    answers: {item_id: chosen_option_index}. Unanswered/None → wrong.

    Returns raw_score (correct count), scaled_score (0..SCALE_MAX), num_items.
    """
    total = len(administered)
    raw = 0
    for item in administered:
        chosen = answers.get(item["id"])
        if chosen is not None and int(chosen) == int(item["answer"]):
            raw += 1
    scaled = round(settings.COGNITIVE_SCALE_MAX * raw / total) if total else 0
    return {"raw_score": raw, "scaled_score": scaled, "num_items": total}
