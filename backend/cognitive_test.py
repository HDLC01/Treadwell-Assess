"""Cognitive scorer unit tests (stdlib, no server/DB). Run:
    ./.venv/Scripts/python.exe cognitive_test.py
"""

from __future__ import annotations

from config import settings
from services import cognitive_scorer

# 24 fake items, ids 1..24, correct answer always option 0.
ITEMS = [{"id": i, "answer": 0, "item_type": "numerical", "prompt": f"q{i}", "options": ["a", "b"]}
         for i in range(1, 25)]

CASES = []
def case(fn):
    CASES.append(fn); return fn


@case
def selection_is_capped_to_num_items():
    sel = cognitive_scorer.select_items(ITEMS, "demo")
    assert len(sel) == settings.COGNITIVE_NUM_ITEMS, len(sel)


@case
def selection_is_deterministic_per_token():
    a = [it["id"] for it in cognitive_scorer.select_items(ITEMS, "demo")]
    b = [it["id"] for it in cognitive_scorer.select_items(ITEMS, "demo")]
    assert a == b, "same token must yield same items+order"


@case
def selection_differs_across_tokens():
    a = [it["id"] for it in cognitive_scorer.select_items(ITEMS, "tokenA")]
    b = [it["id"] for it in cognitive_scorer.select_items(ITEMS, "tokenB")]
    assert a != b, "different tokens should (almost always) differ"


@case
def fewer_items_than_n_returns_all():
    sel = cognitive_scorer.select_items(ITEMS[:5], "demo")
    assert len(sel) == 5


@case
def all_correct_scores_full_scale():
    sel = cognitive_scorer.select_items(ITEMS, "demo")
    answers = {it["id"]: 0 for it in sel}
    r = cognitive_scorer.score(sel, answers)
    assert r["raw_score"] == len(sel) == settings.COGNITIVE_NUM_ITEMS
    assert r["scaled_score"] == settings.COGNITIVE_SCALE_MAX, r


@case
def none_correct_scores_zero():
    sel = cognitive_scorer.select_items(ITEMS, "demo")
    answers = {it["id"]: 1 for it in sel}  # every answer wrong
    r = cognitive_scorer.score(sel, answers)
    assert r["raw_score"] == 0 and r["scaled_score"] == 0, r


@case
def half_correct_scores_half_scale():
    sel = cognitive_scorer.select_items(ITEMS, "demo")
    answers = {it["id"]: (0 if i < 10 else 1) for i, it in enumerate(sel)}
    r = cognitive_scorer.score(sel, answers)
    assert r["raw_score"] == 10
    # 30 * 10/20 = 15
    assert r["scaled_score"] == round(settings.COGNITIVE_SCALE_MAX * 10 / len(sel)), r


@case
def unanswered_counts_wrong():
    sel = cognitive_scorer.select_items(ITEMS, "demo")
    r = cognitive_scorer.score(sel, {})  # nothing answered
    assert r["raw_score"] == 0 and r["scaled_score"] == 0


@case
def denominator_is_administered_not_bank():
    sel = cognitive_scorer.select_items(ITEMS, "demo")
    r = cognitive_scorer.score(sel, {it["id"]: 0 for it in sel})
    assert r["num_items"] == len(sel)


def main():
    for fn in CASES:
        fn()
        print(f"  PASS  {fn.__name__}")
    print(f"\n{len(CASES)}/{len(CASES)} cognitive scorer tests passed.")


if __name__ == "__main__":
    main()
