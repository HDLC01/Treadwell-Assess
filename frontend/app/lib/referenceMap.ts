// Content for the /reference cheat sheet: a translation aid between Predictive
// Index (PI) Reference Profiles and Treadwell Assess's 17 original archetypes.
//
// Mappings are by BEHAVIORAL-FACTOR PATTERN (nearest archetype in 4-factor space),
// not an equivalence. PI profile NAMES are used nominatively for comparison only;
// all blurbs here are our own paraphrase — no PI description text is copied.
//
// PI's four factors line up ~1:1 with ours:
//   Dominance→Dominance(A), Extraversion→Influence(B),
//   Patience→Steadiness(C), Formality→Conscientiousness(D).

export type FactorLevel = "high" | "low" | "mid";
export type PiGroup = "Analytical" | "Social" | "Stabilizing" | "Persistent";

// ─── the 17 archetypes — mirror of backend/seed/data.py REFERENCE_PROFILES ─────
// (slug, name, tagline, description copied verbatim — keep in sync with the seed)
export interface Archetype {
  slug: string;
  name: string;
  tagline: string;
  description: string;
}

export const ARCHETYPES: Archetype[] = [
  {
    slug: "trailblazer",
    name: "Trailblazer",
    tagline: "An independent self-starter who moves fast and owns the outcome.",
    description:
      "Trailblazers push into new ground without waiting for permission. They set their own bar, decide quickly, and would rather ask forgiveness than wait for consensus. Best where speed and ownership beat polish.",
  },
  {
    slug: "catalyst",
    name: "Catalyst",
    tagline: "A driving force who rallies people around a goal.",
    description:
      "Catalysts combine push with pull: they set an aggressive direction and bring people along with energy and conviction. They thrive on momentum and visible wins.",
  },
  {
    slug: "dynamo",
    name: "Dynamo",
    tagline: "High-energy, fast-moving, and at their best in front of people.",
    description:
      "Dynamos light up a room and hate standing still. They sell the vision, spark action, and keep teams moving — happiest with variety and an audience.",
  },
  {
    slug: "connector",
    name: "Connector",
    tagline: "A relationship-led communicator who wins people over.",
    description:
      "Connectors build trust quickly and keep networks warm. They persuade through relationships rather than pressure, and they read a room better than a spreadsheet.",
  },
  {
    slug: "harmonizer",
    name: "Harmonizer",
    tagline: "A warm, steady presence that keeps the team glued together.",
    description:
      "Harmonizers pair sociability with patience. They smooth friction, support teammates, and keep a stable rhythm — the person everyone is glad is in the room.",
  },
  {
    slug: "diplomat",
    name: "Diplomat",
    tagline: "Considerate and structured; influence through credibility.",
    description:
      "Diplomats are careful with people and with facts. They move deliberately, honor commitments, and win arguments by being prepared rather than loud.",
  },
  {
    slug: "anchor",
    name: "Anchor",
    tagline: "Calm, consistent, and reliable under pressure.",
    description:
      "Anchors are the stable core of a team. They prefer known rhythms, finish what they start, and keep their composure when everything else is moving.",
  },
  {
    slug: "steward",
    name: "Steward",
    tagline: "A careful custodian of process, quality, and the long term.",
    description:
      "Stewards protect what matters: standards, systems, and commitments. They are patient, precise, and allergic to corner-cutting.",
  },
  {
    slug: "craftsman",
    name: "Craftsman",
    tagline: "Quietly excellent — deep skill, steady pace, exact standards.",
    description:
      "Craftsmen go deep rather than wide. They master their domain, work best with focus time, and let the quality of the work speak for them.",
  },
  {
    slug: "examiner",
    name: "Examiner",
    tagline: "An exacting analyst who trusts evidence over opinion.",
    description:
      "Examiners want the data, the definition, and the proof. They catch what others miss and would rather be right than fast.",
  },
  {
    slug: "architect",
    name: "Architect",
    tagline: "A systems-builder: driving on outcomes, rigorous on details.",
    description:
      "Architects combine push with precision. They design the machine and hold it to spec — demanding about both results and how results are produced.",
  },
  {
    slug: "pathfinder",
    name: "Pathfinder",
    tagline: "An independent analytical explorer of hard problems.",
    description:
      "Pathfinders work the frontier alone or in small groups: ambiguous problems, first-principles thinking, little need for applause.",
  },
  {
    slug: "visionary",
    name: "Visionary",
    tagline: "A long-range strategist who sets the direction and drives toward it.",
    description:
      "Visionaries think in years, not weeks. They read where things are heading, commit to a bold direction, and push hard to get there — light on the fine print, heavy on the destination.",
  },
  {
    slug: "ranger",
    name: "Ranger",
    tagline: "Independent and self-reliant; works steadily on their own terms.",
    description:
      "Rangers do their best work with autonomy and room to operate. They are self-directed and deliberate, set their own pace, and need little supervision to get hard things done.",
  },
  {
    slug: "technician",
    name: "Technician",
    tagline: "A reliable, precise executor who delivers accurate work to spec.",
    description:
      "Technicians turn a plan into clean, repeatable results. They follow the method, check their work, and hit the spec every time — the person you trust with the build that has to be right.",
  },
  {
    slug: "sage",
    name: "Sage",
    tagline: "A deep thinker driven by understanding and mastery.",
    description:
      "Sages chase the why behind the work. They study a subject until they truly understand it, value accuracy and depth over speed, and become the quiet expert others come to for answers.",
  },
  {
    slug: "allrounder",
    name: "Allrounder",
    tagline: "Flexible and balanced — adapts to what the situation needs.",
    description:
      "Allrounders sit near the middle on every drive, which is its own strength: they flex between styles, fill gaps, and translate between very different teammates.",
  },
];

export const ARCHETYPE_BY_SLUG: Record<string, Archetype> = Object.fromEntries(
  ARCHETYPES.map((a) => [a.slug, a]),
);

// ─── factor correspondence (the basis of every mapping) ───────────────────────
export interface FactorRow {
  pi: string;
  tw: string;
  spectrum: string;
}

export const FACTOR_MAP: FactorRow[] = [
  { pi: "Dominance", tw: "Dominance (A)", spectrum: "independent ↔ collaborative" },
  { pi: "Extraversion", tw: "Influence (B)", spectrum: "sociable ↔ reserved" },
  { pi: "Patience", tw: "Steadiness (C)", spectrum: "steady ↔ fast-paced" },
  { pi: "Formality", tw: "Conscientiousness (D)", spectrum: "precise ↔ flexible" },
];

// ─── Table A: PI profile → nearest Treadwell archetype (all 17) ───────────────
export interface PiProfile {
  name: string;
  group: PiGroup;
  // PI factors: d=Dominance, e=Extraversion, p=Patience, f=Formality
  pattern: { d: FactorLevel; e: FactorLevel; p: FactorLevel; f: FactorLevel };
  blurb: string;
  primarySlug: string;
  altSlug?: string;
  note?: string;
  flag?: boolean; // highlight (the Venturer / "trailblazer" row)
}

export const PI_PROFILES: PiProfile[] = [
  // Analytical
  {
    name: "Venturer",
    group: "Analytical",
    pattern: { d: "high", e: "low", p: "low", f: "low" },
    blurb: "Self-starting risk-taker who pushes into new territory — PI's “trailblazing strategist.”",
    primarySlug: "pathfinder",
    note: "PI's “trailblazer” maps to Pathfinder — NOT to our Trailblazer.",
    flag: true,
  },
  {
    name: "Strategist",
    group: "Analytical",
    pattern: { d: "high", e: "low", p: "low", f: "low" },
    blurb: "Big-picture, analytical planner focused on long-term results.",
    primarySlug: "visionary",
    note: "Long-range, big-picture driver → our Visionary.",
  },
  {
    name: "Controller",
    group: "Analytical",
    pattern: { d: "high", e: "low", p: "low", f: "high" },
    blurb: "Precise and results-driven; runs a tight, efficient operation.",
    primarySlug: "architect",
    note: "Drives on outcomes, rigorous on detail.",
  },
  {
    name: "Analyzer",
    group: "Analytical",
    pattern: { d: "low", e: "low", p: "high", f: "high" },
    blurb: "Methodical and fact-driven; decides only with the full data set.",
    primarySlug: "examiner",
    note: "Evidence-led, data-driven analyst.",
  },
  {
    name: "Specialist",
    group: "Analytical",
    pattern: { d: "low", e: "low", p: "high", f: "high" },
    blurb: "Deep, careful expert who works to exact standards.",
    primarySlug: "craftsman",
    note: "Deep expertise, exact standards.",
  },
  // Social
  {
    name: "Captain",
    group: "Social",
    pattern: { d: "high", e: "high", p: "low", f: "mid" },
    blurb: "Driven, outgoing leader who rallies the team toward a goal.",
    primarySlug: "catalyst",
    note: "Rallies people toward a goal.",
  },
  {
    name: "Maverick",
    group: "Social",
    pattern: { d: "high", e: "high", p: "low", f: "low" },
    blurb: "Fast, inventive, and goal-driven; challenges the status quo.",
    primarySlug: "trailblazer",
    note: "Fast, independent, challenges the status quo.",
  },
  {
    name: "Persuader",
    group: "Social",
    pattern: { d: "high", e: "high", p: "low", f: "low" },
    blurb: "Charismatic, confident communicator who motivates others.",
    primarySlug: "connector",
    note: "Wins people through relationships.",
  },
  {
    name: "Promoter",
    group: "Social",
    pattern: { d: "low", e: "high", p: "low", f: "low" },
    blurb: "Gregarious, casual, high-energy people-mover.",
    primarySlug: "dynamo",
    note: "High-energy people-mover.",
  },
  {
    name: "Altruist",
    group: "Social",
    pattern: { d: "low", e: "high", p: "high", f: "low" },
    blurb: "Warm, cooperative, and focused on team harmony.",
    primarySlug: "harmonizer",
    note: "Warm, steady, team-glue.",
  },
  {
    name: "Collaborator",
    group: "Social",
    pattern: { d: "low", e: "high", p: "high", f: "high" },
    blurb: "Cooperative, patient, consensus-building team player.",
    primarySlug: "diplomat",
    note: "Structured, consensus-building.",
  },
  // Stabilizing
  {
    name: "Operator",
    group: "Stabilizing",
    pattern: { d: "low", e: "low", p: "high", f: "high" },
    blurb: "Reliable, pragmatic, steady team contributor.",
    primarySlug: "anchor",
    note: "Reliable, pragmatic, steady.",
  },
  {
    name: "Guardian",
    group: "Stabilizing",
    pattern: { d: "low", e: "low", p: "high", f: "high" },
    blurb: "Dependable and structured; oriented to process and rules.",
    primarySlug: "steward",
    note: "Dependable; process & rules custodian.",
  },
  {
    name: "Craftsman",
    group: "Stabilizing",
    pattern: { d: "low", e: "low", p: "high", f: "high" },
    blurb: "Steady, precise, planful executor who values accuracy.",
    primarySlug: "technician",
    note: "Precise, planful executor; values accuracy. (Shares PI's name.)",
  },
  {
    name: "Adapter",
    group: "Stabilizing",
    pattern: { d: "mid", e: "mid", p: "mid", f: "mid" },
    blurb: "Flexible and balanced; adjusts to whatever the situation needs.",
    primarySlug: "allrounder",
    note: "Flexible, adjusts to the situation.",
  },
  // Persistent
  {
    name: "Individualist",
    group: "Persistent",
    pattern: { d: "high", e: "low", p: "high", f: "low" },
    blurb: "Independent, self-reliant, and deliberate.",
    primarySlug: "ranger",
    note: "Independent, self-reliant, deliberate.",
  },
  {
    name: "Scholar",
    group: "Persistent",
    pattern: { d: "low", e: "low", p: "high", f: "high" },
    blurb: "Analytical and precise; driven by deep understanding.",
    primarySlug: "sage",
    note: "Driven by deep understanding and mastery.",
  },
];

// ─── Table B: Treadwell archetype → matching PI profile (all 17, one-to-one) ──
// Authored (not auto-inverted) because the two directions aren't strict inverses.
export interface ArchetypeToPi {
  slug: string;
  shape: string;
  piNames: string[];
  note?: string;
  flag?: boolean;
}

export const ARCHETYPE_TO_PI: ArchetypeToPi[] = [
  {
    slug: "trailblazer",
    shape: "↑Dominance, +Influence, fast, informal",
    piNames: ["Maverick"],
    note: "Fast and independent — PI's Maverick, not Venturer.",
    flag: true,
  },
  { slug: "catalyst", shape: "↑Dominance ↑Influence, fast", piNames: ["Captain"] },
  { slug: "dynamo", shape: "↑Influence, fast, informal", piNames: ["Promoter"] },
  { slug: "connector", shape: "↑Influence, relationship-led", piNames: ["Persuader"] },
  { slug: "harmonizer", shape: "+Influence ↑Steadiness, warm", piNames: ["Altruist"] },
  { slug: "diplomat", shape: "+Influence +Steadiness, precise", piNames: ["Collaborator"] },
  { slug: "anchor", shape: "↑Steadiness, low Dominance", piNames: ["Operator"] },
  { slug: "steward", shape: "↑Steadiness ↑precision, rule-minded", piNames: ["Guardian"] },
  { slug: "craftsman", shape: "↑Steadiness ↑precision, reserved", piNames: ["Specialist"] },
  {
    slug: "technician",
    shape: "↑Steadiness ↑precision, executes to spec",
    piNames: ["Craftsman"],
    note: "Shares PI's name; the precise executor.",
  },
  { slug: "examiner", shape: "↑precision, evidence-led", piNames: ["Analyzer"] },
  { slug: "sage", shape: "↑precision ↑Steadiness, deep understanding", piNames: ["Scholar"] },
  { slug: "architect", shape: "↑Dominance ↑precision", piNames: ["Controller"] },
  { slug: "visionary", shape: "↑Dominance, reserved, fast, big-picture", piNames: ["Strategist"] },
  {
    slug: "pathfinder",
    shape: "↑Dominance, reserved, analytical",
    piNames: ["Venturer"],
    note: "PI's “trailblazer” (Venturer) lands here.",
    flag: true,
  },
  { slug: "ranger", shape: "↑Dominance, reserved, steady, independent", piNames: ["Individualist"] },
  { slug: "allrounder", shape: "center on all four", piNames: ["Adapter"] },
];
