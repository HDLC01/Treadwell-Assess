"""Job-Target helpers: human 'Key Characteristics' chips derived from the target's
per-factor midpoints (original copy — never PI's wording)."""

from __future__ import annotations

from typing import Dict, List, Optional

# (high copy, low copy, mid copy) per factor — shown as chips on the Job Target page.
_CHARACTERISTICS = {
    "A": (
        "Comfortable taking charge and owning outcomes",
        "Works through consensus and supports team decisions",
        "Balances asserting a view with hearing the room",
    ),
    "B": (
        "Energized by people — presenting, persuading, connecting",
        "Comfortable with heads-down, independent work",
        "Flexes between people time and focus time",
    ),
    "C": (
        "Steady and consistent on long-running work",
        "Energized by change, variety, and a fast pace",
        "Comfortable shifting between routine and change",
    ),
    "D": (
        "Careful with rules, details, and quality standards",
        "Improvises comfortably when there is no playbook",
        "Flexes between strict and informal procedures",
    ),
}


def target_midpoints(behavioral_target: Optional[Dict]) -> Optional[Dict[str, float]]:
    """{'A': mid, ...} from a {'A': {'low','high'}, ...} target; None if malformed."""
    if not behavioral_target:
        return None
    mids: Dict[str, float] = {}
    for f in ("A", "B", "C", "D"):
        rng = behavioral_target.get(f)
        if not isinstance(rng, dict) or "low" not in rng or "high" not in rng:
            return None
        mids[f] = (float(rng["low"]) + float(rng["high"])) / 2.0
    return mids


def key_characteristics(behavioral_target: Optional[Dict]) -> List[str]:
    """Up to four chips describing the target's ideal candidate."""
    mids = target_midpoints(behavioral_target)
    if mids is None:
        return []
    out: List[str] = []
    for f in ("A", "B", "C", "D"):
        high, low, mid = _CHARACTERISTICS[f]
        m = mids[f]
        out.append(high if m >= 0.5 else low if m <= -0.5 else mid)
    return out
