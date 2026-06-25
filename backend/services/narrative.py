"""Original, deterministic report narrative for Treadwell Assess.

Turns a candidate's DISC factor pattern (A/B/C/D synthesis sigma) and reference
profile into the prose sections of an extensive behavioral report — summary,
strongest behaviors, strengths, watch-outs, how to work with them, what they
need, and a plain-language cognitive read.

IP NOTE: every phrase here is ORIGINAL, written against the public DISC model.
It is NOT The Predictive Index's wording, profile copy, or report text. This is
an independent assessment.

Deterministic: the same scores always produce the same prose (no model calls),
so reports are reproducible and auditable. This module is the single content
surface to tune.
"""
from __future__ import annotations

from typing import Dict, List, Optional

DISC_LETTER = {"A": "D", "B": "I", "C": "S", "D": "C"}
FACTOR_NAMES = {"A": "Dominance", "B": "Influence", "C": "Steadiness", "D": "Conscientiousness"}

# Match behavioral_scorer.band_label thresholds.
_DEFINING = 0.6   # |sigma| at/above which a factor genuinely shapes behavior
_STRONG = 1.8     # |sigma| at/above which it is a dominant, defining drive

# Per-factor copy for each pole. "high" = high-sigma end, "low" = low-sigma end.
#   label  — noun phrase, reads after "shaped most by ..."
#   trait  — short headline for the Strongest Behaviors list
#   need   — short phrase, reads after "does their best work with ..."
_POLES: Dict[str, Dict[str, dict]] = {
    "A": {
        "high": {
            "label": "a strong drive to take charge and decide",
            "trait": "Takes charge and pushes for results",
            "strength": "Acts decisively and takes ownership without waiting to be told — comfortable making the call and pressing through obstacles.",
            "watch": "Can read as forceful or impatient with a slower-moving team, and may bristle at being told how to do the work.",
            "work": "Give clear ownership of outcomes and the authority to match. Lead with the goal, not the step-by-step.",
            "need": "ownership and room to decide",
        },
        "low": {
            "label": "a cooperative, consensus-building style",
            "trait": "Cooperative and team-oriented",
            "strength": "Works easily alongside others, gathers input, and builds agreement rather than forcing a decision.",
            "watch": "May hold back from asserting a position, or defer a call that is genuinely theirs to make.",
            "work": "Ask for their view directly and make clear that pushback is welcome. Pair them with a decisive partner on high-stakes calls.",
            "need": "collaboration and shared decisions",
        },
    },
    "B": {
        "high": {
            "label": "an outgoing, persuasive style",
            "trait": "Outgoing, warm, and persuasive",
            "strength": "Builds rapport quickly, communicates with energy, and brings people along around an idea.",
            "watch": "Can lean on relationships over detail, talk more than listen, and lose momentum on follow-through.",
            "work": "Give people-facing work and visible wins. Put agreements in writing so verbal enthusiasm becomes action.",
            "need": "people contact and recognition",
        },
        "low": {
            "label": "a reserved, task-focused style",
            "trait": "Reserved and task-focused",
            "strength": "Keeps focus on the work over the room, communicates candidly and factually, and is at ease working heads-down.",
            "watch": "May share little, read as hard to get to know, and under-use relationships when a bit of influence would help.",
            "work": "Don't read quiet as disengaged — ask directly for their take, and give prep time before group settings.",
            "need": "focus time and fact-based communication",
        },
    },
    "C": {
        "high": {
            "label": "a steady, patient pace",
            "trait": "Steady, patient, and dependable",
            "strength": "Holds a calm, consistent pace, follows through reliably, and is a stabilizing presence when things get tense.",
            "watch": "May resist abrupt change, take time to shift gears, and hold back urgency when the moment calls for it.",
            "work": "Give advance notice of change and the reason behind it. Protect their focus from constant context-switching.",
            "need": "stability and time to do things well",
        },
        "low": {
            "label": "a fast, change-friendly pace",
            "trait": "Fast-paced and driven by momentum",
            "strength": "Moves quickly, keeps several things going at once, and thrives on urgency, change, and variety.",
            "watch": "Can start more than gets finished, tire of routine, and move faster than teammates can follow.",
            "work": "Feed them variety and quick wins. Help prioritize so speed doesn't scatter across too many threads.",
            "need": "pace and variety",
        },
    },
    "D": {
        "high": {
            "label": "a precise, quality-first approach",
            "trait": "Precise, careful, and quality-driven",
            "strength": "Holds a high bar for accuracy, works to clear standards, and catches the details others miss.",
            "watch": "Can over-analyze, be slow to decide without enough information, and apply more rigor than a task needs.",
            "work": "Give clear standards and the data to work from. Signal explicitly when 'good enough' genuinely is.",
            "need": "clear standards and time to be thorough",
        },
        "low": {
            "label": "a flexible, big-picture approach",
            "trait": "Flexible and comfortable with ambiguity",
            "strength": "Adapts quickly, holds the big picture, and moves forward without needing every detail settled first.",
            "watch": "May skip details, bend the rules, or leave loose ends where a little structure would help.",
            "work": "Pair them with a detail-minded partner, and be explicit about which rules are non-negotiable.",
            "need": "autonomy and big-picture goals",
        },
    },
}


def _pole(factor: str, sigma: float) -> Optional[dict]:
    if sigma >= _DEFINING:
        return _POLES[factor]["high"]
    if sigma <= -_DEFINING:
        return _POLES[factor]["low"]
    return None  # balanced on this factor — not a defining trait


def _needs_sentence(needs: List[str]) -> str:
    needs = needs[:3]
    if not needs:
        return ""
    if len(needs) == 1:
        body = needs[0]
    else:
        body = ", ".join(needs[:-1]) + ", and " + needs[-1]
    return f"This person does their best work with {body}."


def _summary(defining: List[dict], profile: Optional[dict]) -> str:
    parts: List[str] = []
    if profile:
        name = profile.get("name") or "This profile"
        tag = (profile.get("tagline") or "").strip().rstrip(".")
        parts.append(f"{name} — {tag[0].lower() + tag[1:]}." if tag else f"{name}.")
        desc = (profile.get("description") or "").strip()
        if desc:
            parts.append(desc)
    if defining:
        labels = [_pole(f["factor"], f["synthesis"])["label"] for f in defining[:2]]
        phrase = labels[0] if len(labels) == 1 else f"{labels[0]}, and {labels[1]}"
        parts.append(f"Their pattern is shaped most by {phrase}.")
    elif not profile:
        parts.append(
            "This is a balanced pattern — no single behavioral drive dominates, "
            "which is its own strength: they flex between styles as the situation calls for."
        )
    return " ".join(parts)


def behavioral_narrative(factors: List[dict], profile: Optional[dict]) -> dict:
    """Compose the prose sections of the behavioral report from the factor pattern."""
    ordered = sorted(factors, key=lambda f: abs(f["synthesis"]), reverse=True)
    defining = [f for f in ordered if abs(f["synthesis"]) >= _DEFINING]

    strongest: List[str] = []
    strengths: List[str] = []
    watch_outs: List[str] = []
    working_with: List[str] = []
    needs: List[str] = []

    for f in defining:
        pole = _pole(f["factor"], f["synthesis"])
        if not pole:
            continue
        disc = DISC_LETTER[f["factor"]]
        strongest.append(f"{pole['trait']} ({disc} — {f['band']}).")
        strengths.append(pole["strength"])
        watch_outs.append(pole["watch"])
        working_with.append(pole["work"])
        needs.append(pole["need"])

    if not defining:
        # Balanced / adaptable profile (e.g. mid on every drive).
        strengths = [
            "Adapts readily — with no single drive dominating, they flex to what the situation needs.",
            "Comfortable across a range of work: collaborating or deciding, fast turns or careful follow-through.",
        ]
        watch_outs = [
            "Without a strong natural pull, they may look to the team or manager to set the tone and priorities.",
        ]
        working_with = [
            "Give clear priorities and let them flex into the gaps — they read the room well and adjust.",
        ]
        needs = ["clear priorities", "a well-defined role", "latitude to adapt"]

    return {
        "summary": _summary(defining, profile),
        "strongest": strongest,
        "strengths": strengths,
        "watch_outs": watch_outs[:3],
        "working_with": working_with[:3],
        "needs": _needs_sentence(needs),
    }


def cognitive_narrative(
    cognitive: Optional[dict], cognitive_target: Optional[int], scale_max: int
) -> str:
    """Plain-language read of the cognitive result."""
    if not cognitive:
        return "The cognitive assessment has not been taken yet."

    scaled = cognitive.get("scaled_score")
    fit = cognitive.get("fit")
    out: List[str] = []

    if cognitive.get("status") == "expired":
        out.append(
            "The timer ran out before every question was answered, so this score reflects a "
            "partial attempt and may understate their ability."
        )

    if cognitive_target is None:
        out.append(
            f"No cognitive target is set for this role, so the scaled score of {scaled} of "
            f"{scale_max} is shown for context only."
        )
        return " ".join(out)

    if fit == "strong":
        out.append(
            f"At {scaled} of {scale_max}, this meets or exceeds the role's target of "
            f"{cognitive_target} — a sign they should pick up new concepts quickly and ramp up "
            f"with little hand-holding."
        )
    elif fit == "moderate":
        out.append(
            f"At {scaled} of {scale_max}, this sits just below the role's target of "
            f"{cognitive_target} — they should handle the role's thinking demands, with some added "
            f"ramp-up time or support on the most complex tasks."
        )
    else:
        out.append(
            f"At {scaled} of {scale_max}, this is below the role's target of {cognitive_target} — "
            f"they may need more structured training, time, or support to keep pace with the "
            f"role's problem-solving demands."
        )
    return " ".join(out)
