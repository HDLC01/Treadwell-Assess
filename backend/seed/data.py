"""Seed content — ALL ORIGINAL (never Predictive Index's proprietary words/profiles).

Factors (public DISC model):
  A = Dominance          drive to control outcomes / assert
  B = Influence          drive to engage and persuade people
  C = Steadiness         drive for pace, consistency, stability
  D = Conscientiousness  drive for structure, precision, rules

Each adjective maps to ONE factor with a direction: +1 indicates the HIGH end,
-1 indicates the LOW end. 88 words, 22 per factor (14 high / 8 low).
"""

from __future__ import annotations

# ─── the original adjective bank ────────────────────────────────────────────
ADJECTIVES: list[tuple[str, str, int]] = [
    # ── A: Dominance — high (+1)
    ("assertive", "A", 1), ("decisive", "A", 1), ("competitive", "A", 1),
    ("bold", "A", 1), ("direct", "A", 1), ("self-reliant", "A", 1),
    ("ambitious", "A", 1), ("strong-willed", "A", 1), ("resolute", "A", 1),
    ("daring", "A", 1), ("commanding", "A", 1), ("forthright", "A", 1),
    ("driven", "A", 1), ("unafraid of conflict", "A", 1),
    # ── A: Dominance — low (-1)
    ("accommodating", "A", -1), ("agreeable", "A", -1), ("modest", "A", -1),
    ("gentle", "A", -1), ("obliging", "A", -1), ("soft-spoken", "A", -1),
    ("deferential", "A", -1), ("harmony-seeking", "A", -1),

    # ── B: Influence — high (+1)
    ("outgoing", "B", 1), ("talkative", "B", 1), ("persuasive", "B", 1),
    ("enthusiastic", "B", 1), ("charming", "B", 1), ("lively", "B", 1),
    ("expressive", "B", 1), ("sociable", "B", 1), ("upbeat", "B", 1),
    ("animated", "B", 1), ("convincing", "B", 1), ("warm", "B", 1),
    ("engaging", "B", 1), ("crowd-energized", "B", 1),
    # ── B: Influence — low (-1)
    ("reserved", "B", -1), ("quiet", "B", -1), ("private", "B", -1),
    ("introspective", "B", -1), ("matter-of-fact", "B", -1),
    ("solitary", "B", -1), ("reflective", "B", -1), ("understated", "B", -1),

    # ── C: Steadiness — high (+1)
    ("patient", "C", 1), ("calm", "C", 1), ("steady", "C", 1),
    ("consistent", "C", 1), ("loyal", "C", 1), ("even-keeled", "C", 1),
    ("unhurried", "C", 1), ("persistent", "C", 1), ("supportive", "C", 1),
    ("predictable", "C", 1), ("composed", "C", 1), ("attentive", "C", 1),
    ("routine-loving", "C", 1), ("settled", "C", 1),
    # ── C: Steadiness — low (-1)
    ("restless", "C", -1), ("impulsive", "C", -1), ("quick-paced", "C", -1),
    ("easily bored", "C", -1), ("spontaneous", "C", -1),
    ("variety-seeking", "C", -1), ("change-hungry", "C", -1), ("freewheeling", "C", -1),

    # ── D: Conscientiousness — high (+1)
    ("precise", "D", 1), ("organized", "D", 1), ("thorough", "D", 1),
    ("careful", "D", 1), ("exacting", "D", 1), ("systematic", "D", 1),
    ("accurate", "D", 1), ("disciplined", "D", 1), ("detail-minded", "D", 1),
    ("orderly", "D", 1), ("meticulous", "D", 1), ("by-the-book", "D", 1),
    ("quality-focused", "D", 1), ("rule-respecting", "D", 1),
    # ── D: Conscientiousness — low (-1)
    ("casual", "D", -1), ("informal", "D", -1), ("freethinking", "D", -1),
    ("improvisational", "D", -1), ("big-picture", "D", -1),
    ("rule-bending", "D", -1), ("unstructured", "D", -1), ("loose with details", "D", -1),
]

# ─── original reference-profile archetypes (ideal sigma vectors A,B,C,D) ──────
REFERENCE_PROFILES: list[dict] = [
    {"slug": "trailblazer", "name": "Trailblazer",
     "tagline": "An independent self-starter who moves fast and owns the outcome.",
     "description": "Trailblazers push into new ground without waiting for permission. They set "
                    "their own bar, decide quickly, and would rather ask forgiveness than wait for "
                    "consensus. Best where speed and ownership beat polish.",
     "ideal": (2.0, 0.5, -1.5, -1.0)},
    {"slug": "catalyst", "name": "Catalyst",
     "tagline": "A driving force who rallies people around a goal.",
     "description": "Catalysts combine push with pull: they set an aggressive direction and bring "
                    "people along with energy and conviction. They thrive on momentum and visible wins.",
     "ideal": (1.5, 1.5, -1.0, -0.5)},
    {"slug": "dynamo", "name": "Dynamo",
     "tagline": "High-energy, fast-moving, and at their best in front of people.",
     "description": "Dynamos light up a room and hate standing still. They sell the vision, spark "
                    "action, and keep teams moving — happiest with variety and an audience.",
     "ideal": (1.0, 2.0, -1.5, -1.0)},
    {"slug": "connector", "name": "Connector",
     "tagline": "A relationship-led communicator who wins people over.",
     "description": "Connectors build trust quickly and keep networks warm. They persuade through "
                    "relationships rather than pressure, and they read a room better than a spreadsheet.",
     "ideal": (0.5, 2.0, 0.0, -0.5)},
    {"slug": "harmonizer", "name": "Harmonizer",
     "tagline": "A warm, steady presence that keeps the team glued together.",
     "description": "Harmonizers pair sociability with patience. They smooth friction, support "
                    "teammates, and keep a stable rhythm — the person everyone is glad is in the room.",
     "ideal": (-0.5, 1.5, 1.5, 0.0)},
    {"slug": "diplomat", "name": "Diplomat",
     "tagline": "Considerate and structured; influence through credibility.",
     "description": "Diplomats are careful with people and with facts. They move deliberately, "
                    "honor commitments, and win arguments by being prepared rather than loud.",
     "ideal": (-1.0, 1.0, 1.0, 1.0)},
    {"slug": "anchor", "name": "Anchor",
     "tagline": "Calm, consistent, and reliable under pressure.",
     "description": "Anchors are the stable core of a team. They prefer known rhythms, finish what "
                    "they start, and keep their composure when everything else is moving.",
     "ideal": (-1.0, 0.0, 2.0, 0.5)},
    {"slug": "steward", "name": "Steward",
     "tagline": "A careful custodian of process, quality, and the long term.",
     "description": "Stewards protect what matters: standards, systems, and commitments. They are "
                    "patient, precise, and allergic to corner-cutting.",
     "ideal": (-1.0, -0.5, 1.5, 1.5)},
    {"slug": "craftsman", "name": "Craftsman",
     "tagline": "Quietly excellent — deep skill, steady pace, exact standards.",
     "description": "Craftsmen go deep rather than wide. They master their domain, work best with "
                    "focus time, and let the quality of the work speak for them.",
     "ideal": (-1.0, -1.0, 1.5, 1.5)},
    {"slug": "examiner", "name": "Examiner",
     "tagline": "An exacting analyst who trusts evidence over opinion.",
     "description": "Examiners want the data, the definition, and the proof. They catch what others "
                    "miss and would rather be right than fast.",
     "ideal": (-0.5, -1.5, 0.5, 2.0)},
    {"slug": "architect", "name": "Architect",
     "tagline": "A systems-builder: driving on outcomes, rigorous on details.",
     "description": "Architects combine push with precision. They design the machine and hold it to "
                    "spec — demanding about both results and how results are produced.",
     "ideal": (1.5, -1.0, -0.5, 1.5)},
    {"slug": "pathfinder", "name": "Pathfinder",
     "tagline": "An independent analytical explorer of hard problems.",
     "description": "Pathfinders work the frontier alone or in small groups: ambiguous problems, "
                    "first-principles thinking, little need for applause.",
     "ideal": (1.0, -1.5, -1.0, 0.5)},
    {"slug": "allrounder", "name": "Allrounder",
     "tagline": "Flexible and balanced — adapts to what the situation needs.",
     "description": "Allrounders sit near the middle on every drive, which is its own strength: they "
                    "flex between styles, fill gaps, and translate between very different teammates.",
     "ideal": (0.0, 0.0, 0.0, 0.0)},
]

# ─── small ORIGINAL sample cognitive items (Phase 3 expands the bank) ─────────
COGNITIVE_ITEMS: list[dict] = [
    {"item_type": "numerical", "prompt": "A crew finishes 3 floors in 12 days. At the same rate, how many days for 5 floors?",
     "options": ["15", "18", "20", "24"], "answer": 2, "is_sample": True},
    {"item_type": "numerical", "prompt": "Which number continues the series: 2, 6, 18, 54, ...",
     "options": ["108", "162", "148", "216"], "answer": 1, "is_sample": True},
    {"item_type": "verbal", "prompt": "DURABLE is to FRAGILE as RIGID is to:",
     "options": ["stiff", "flexible", "solid", "narrow"], "answer": 1, "is_sample": True},
    {"item_type": "verbal", "prompt": "Choose the word closest in meaning to CONCISE:",
     "options": ["brief", "complete", "careful", "polite"], "answer": 0, "is_sample": True},
    {"item_type": "abstract", "prompt": "Square, triangle, square, triangle, square, ... what comes next?",
     "options": ["square", "circle", "triangle", "pentagon"], "answer": 2, "is_sample": True},
    {"item_type": "abstract", "prompt": "If all blorts are crims, and no crims are vands, then blorts are:",
     "options": ["sometimes vands", "never vands", "always vands", "unknowable"], "answer": 1, "is_sample": True},
]
