"""Behavioral scoring: free-choice adjective checklists -> sigma-style factor scores.

Model (deterministic + calibratable):
  For one checklist, per factor f:
      raw_f = (# selected words with factor=f, direction=+1)
            - (# selected words with factor=f, direction=-1)
  Selecting many words shouldn't inflate every factor, so raw is damped by total
  selection volume, then scaled to a sigma-like range and clamped to [-3, +3]:
      sigma_f = clamp( raw_f / (SCORE_SCALE * sqrt(max(total_selected, 4))) * 3 )
  SCORE_SCALE lives in config (default 2.5); once real responses accumulate, the
  baseline/scale can be recalibrated from the data (natural ML hook).

Views:
  Self          = checklist 2 ("the real you")          — natural drives
  Self-Concept  = checklist 1 ("how others expect you") — adapted behavior
  Synthesis     = mean of the two                        — what others likely observe
"""

from __future__ import annotations

import math
from typing import Dict, Iterable, List, Tuple

from config import settings

FACTORS = ("A", "B", "C", "D")
FACTOR_NAMES = {"A": "Dominance", "B": "Influence", "C": "Steadiness", "D": "Conscientiousness"}

# Per-factor band labels for reports (low -> high), original wording.
_BANDS = {
    "A": ["Highly Collaborative", "Collaborative", "Moderately Independent", "Independent", "Highly Independent"],
    "B": ["Highly Reserved", "Reserved", "Moderately Sociable", "Sociable", "Highly Sociable"],
    "C": ["Highly Driving", "Fast-Paced", "Moderately Steady", "Steady", "Highly Steady"],
    "D": ["Highly Flexible", "Flexible", "Moderately Precise", "Precise", "Highly Precise"],
}


def _clamp(x: float, lo: float = -3.0, hi: float = 3.0) -> float:
    return max(lo, min(hi, x))


def score_checklist(selected: Iterable[Tuple[str, int]]) -> Dict[str, float]:
    """Score ONE checklist. `selected` = (factor, direction) per chosen word."""
    selected = list(selected)
    total = len(selected)
    raw = {f: 0 for f in FACTORS}
    for factor, direction in selected:
        if factor in raw:
            raw[factor] += 1 if direction > 0 else -1
    denom = settings.SCORE_SCALE * math.sqrt(max(total, 4))
    return {f: round(_clamp(raw[f] / denom * 3.0), 2) for f in FACTORS}


def score_assessment(
    checklist1: List[Tuple[str, int]],  # "how others expect you to act"
    checklist2: List[Tuple[str, int]],  # "the real you"
) -> Dict[str, Dict[str, float]]:
    """Full behavioral scoring -> {self, self_concept, synthesis} sigma maps."""
    self_concept = score_checklist(checklist1)
    self_scores = score_checklist(checklist2)
    synthesis = {f: round((self_scores[f] + self_concept[f]) / 2.0, 2) for f in FACTORS}
    return {"self": self_scores, "self_concept": self_concept, "synthesis": synthesis}


def band_label(factor: str, sigma: float) -> str:
    """Human band for a sigma score (report copy)."""
    bands = _BANDS[factor]
    if sigma < -1.8:
        return bands[0]
    if sigma < -0.6:
        return bands[1]
    if sigma < 0.6:
        return bands[2]
    if sigma < 1.8:
        return bands[3]
    return bands[4]
