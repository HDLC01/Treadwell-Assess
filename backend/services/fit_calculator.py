"""Fit calculation: candidate scores vs a Job Target.

Behavioral Fit (0-5 stars, halves allowed):
  per factor -> 1.0 if the candidate's synthesis sigma is inside the target range,
  else a linear falloff to 0.0 over 1 sigma outside the range. Stars = mean * 5,
  rounded to the nearest 0.5.

Cognitive Fit:
  scaled score vs the job's cognitive_target -> strong (>= target) /
  moderate (within 4 below) / low. 'expired' is decided by the link, not here.
"""

from __future__ import annotations

from typing import Dict, Optional


def _factor_fit(sigma: float, rng: Dict[str, float]) -> float:
    low, high = float(rng["low"]), float(rng["high"])
    if low <= sigma <= high:
        return 1.0
    dist = (low - sigma) if sigma < low else (sigma - high)
    return max(0.0, 1.0 - dist)  # linear falloff over 1 sigma


def behavioral_fit_stars(synthesis: Dict[str, float], behavioral_target: Optional[Dict]) -> Optional[float]:
    """0-5 stars in 0.5 steps; None when the job has no behavioral target."""
    if not behavioral_target:
        return None
    fits = [
        _factor_fit(synthesis[f], rng)
        for f, rng in behavioral_target.items()
        if f in synthesis and isinstance(rng, dict)
    ]
    if not fits:
        return None
    return round((sum(fits) / len(fits)) * 5 * 2) / 2


def cognitive_fit(scaled_score: Optional[int], cognitive_target: Optional[int]) -> Optional[str]:
    """strong | moderate | low; None when not applicable."""
    if scaled_score is None or cognitive_target is None:
        return None
    if scaled_score >= cognitive_target:
        return "strong"
    if scaled_score >= cognitive_target - 4:
        return "moderate"
    return "low"
