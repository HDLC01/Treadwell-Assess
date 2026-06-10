"""Reference-profile matching: nearest ideal factor vector (deterministic).

A profile is a point in 4-D sigma space (ideal_a..ideal_d). The candidate's
SYNTHESIS scores are matched to the closest profile by Euclidean distance.
Also used in reverse for Job Targets: the target range's midpoint vector ->
the N closest profiles ("Common Reference Profiles" on the Job Target page).
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional


def _distance(scores: Dict[str, float], profile: Dict) -> float:
    return math.sqrt(
        (scores["A"] - profile["ideal_a"]) ** 2
        + (scores["B"] - profile["ideal_b"]) ** 2
        + (scores["C"] - profile["ideal_c"]) ** 2
        + (scores["D"] - profile["ideal_d"]) ** 2
    )


def match_profile(synthesis: Dict[str, float], profiles: List[Dict]) -> Optional[Dict]:
    """The single closest profile for a candidate (None if no profiles seeded)."""
    if not profiles:
        return None
    return min(profiles, key=lambda p: _distance(synthesis, p))


def match_profiles_for_target(behavioral_target: Dict, profiles: List[Dict], n: int = 3) -> List[Dict]:
    """The N profiles closest to a Job Target's midpoint vector."""
    if not behavioral_target or not profiles:
        return []
    mid = {
        f: (rng["low"] + rng["high"]) / 2.0
        for f, rng in behavioral_target.items()
        if isinstance(rng, dict) and "low" in rng and "high" in rng
    }
    if set(mid.keys()) != {"A", "B", "C", "D"}:
        return []
    return sorted(profiles, key=lambda p: _distance(mid, p))[:n]
