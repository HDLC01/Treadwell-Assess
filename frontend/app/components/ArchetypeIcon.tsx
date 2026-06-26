import type { ReactNode } from "react";

// One original, themed monoline emblem per reference-profile archetype. The glyph
// is drawn in a 0..24 box and centered in a 48x48 rounded badge of the theme color.
// Strokes are white by default; filled shapes set fill/stroke explicitly.
type IconDef = { color: string; glyph: ReactNode };

const ICONS: Record<string, IconDef> = {
  // Trailblazer — planted flag (claims new ground)
  trailblazer: {
    color: "#ea580c",
    glyph: (
      <>
        <line x1="7" y1="3" x2="7" y2="22" />
        <path d="M7 4 H18 L15 7.5 L18 11 H7 Z" fill="#fff" stroke="none" />
      </>
    ),
  },
  // Catalyst — spark
  catalyst: {
    color: "#f59e0b",
    glyph: <path d="M12 2 L13.8 10.2 L22 12 L13.8 13.8 L12 22 L10.2 13.8 L2 12 L10.2 10.2 Z" fill="#fff" stroke="none" />,
  },
  // Dynamo — lightning bolt
  dynamo: {
    color: "#ca8a04",
    glyph: <path d="M14 2 L6 13 H11 L9 22 L18 9 H12 Z" fill="#fff" stroke="none" />,
  },
  // Connector — network of nodes
  connector: {
    color: "#0ea5e9",
    glyph: (
      <>
        <path d="M12 12 L5 6 M12 12 L19 8 M12 12 L12 21" />
        <circle cx="12" cy="12" r="2.4" fill="#fff" stroke="none" />
        <circle cx="5" cy="6" r="2.2" fill="#fff" stroke="none" />
        <circle cx="19" cy="8" r="2.2" fill="#fff" stroke="none" />
        <circle cx="12" cy="21" r="2.2" fill="#fff" stroke="none" />
      </>
    ),
  },
  // Harmonizer — overlapping circles (union)
  harmonizer: {
    color: "#ec4899",
    glyph: (
      <>
        <circle cx="9.5" cy="12" r="5.5" />
        <circle cx="14.5" cy="12" r="5.5" />
      </>
    ),
  },
  // Diplomat — balance scale
  diplomat: {
    color: "#6366f1",
    glyph: (
      <>
        <line x1="12" y1="4" x2="12" y2="20" />
        <line x1="8" y1="20" x2="16" y2="20" />
        <line x1="5" y1="8" x2="19" y2="8" />
        <circle cx="12" cy="4.5" r="1.4" fill="#fff" stroke="none" />
        <path d="M5 8 L2.5 13 H7.5 Z" />
        <path d="M19 8 L16.5 13 H21.5 Z" />
      </>
    ),
  },
  // Anchor — anchor
  anchor: {
    color: "#0d9488",
    glyph: (
      <>
        <circle cx="12" cy="5" r="2.2" />
        <line x1="12" y1="7" x2="12" y2="20" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <path d="M5 13 a7 7 0 0 0 14 0" />
        <path d="M5 13 l-1.5 -1 M19 13 l1.5 -1" />
      </>
    ),
  },
  // Steward — shield with check (guards quality)
  steward: {
    color: "#16a34a",
    glyph: (
      <>
        <path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6 Z" />
        <path d="M9 12 l2.2 2.2 L15 10" />
      </>
    ),
  },
  // Craftsman — mallet
  craftsman: {
    color: "#b45309",
    glyph: (
      <>
        <rect x="5" y="4.5" width="14" height="4.5" rx="1.5" fill="#fff" stroke="none" />
        <rect x="10.3" y="9" width="3.4" height="11" rx="1.2" fill="#fff" stroke="none" />
      </>
    ),
  },
  // Examiner — magnifier
  examiner: {
    color: "#7c3aed",
    glyph: (
      <>
        <circle cx="10" cy="10" r="6" />
        <line x1="14.5" y1="14.5" x2="20" y2="20" />
      </>
    ),
  },
  // Architect — set square (drafting triangle)
  architect: {
    color: "#2563eb",
    glyph: (
      <>
        <path d="M5 5 V19 H19 Z" />
        <path d="M5 15.5 H8.5 V19" />
      </>
    ),
  },
  // Pathfinder — compass needle
  pathfinder: {
    color: "#06b6d4",
    glyph: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 5.5 L14.5 12 L12 18.5 L9.5 12 Z" fill="#fff" stroke="none" />
      </>
    ),
  },
  // Visionary — eye (sees where things are heading)
  visionary: {
    color: "#4f46e5",
    glyph: (
      <>
        <path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z" />
        <circle cx="12" cy="12" r="2.6" fill="#fff" stroke="none" />
      </>
    ),
  },
  // Ranger — mountain peaks (self-reliant in open ground)
  ranger: {
    color: "#65a30d",
    glyph: <path d="M2 20 L9 8 L13 14 L16 9 L22 20 Z" fill="#fff" stroke="none" />,
  },
  // Technician — gear (precise, to spec)
  technician: {
    color: "#0e7490",
    glyph: (
      <>
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1.4" fill="#fff" stroke="none" />
        <path d="M12 3 v2.6 M12 18.4 v2.6 M3 12 h2.6 M18.4 12 h2.6 M5.6 5.6 l1.9 1.9 M16.5 16.5 l1.9 1.9 M18.4 5.6 l-1.9 1.9 M5.6 18.4 l1.9 -1.9" />
      </>
    ),
  },
  // Sage — open book (depth of knowledge)
  sage: {
    color: "#7e22ce",
    glyph: (
      <>
        <path d="M12 6 C9.5 4.3 6 4.3 3.5 5.2 V17.8 C6 16.9 9.5 16.9 12 18.6 C14.5 16.9 18 16.9 20.5 17.8 V5.2 C18 4.3 14.5 4.3 12 6 Z" />
        <line x1="12" y1="6" x2="12" y2="18.6" />
      </>
    ),
  },
  // Allrounder — asterisk (flexes every direction)
  allrounder: {
    color: "#64748b",
    glyph: <path d="M12 3 V21 M4.5 7.5 L19.5 16.5 M19.5 7.5 L4.5 16.5" />,
  },
};

export default function ArchetypeIcon({ slug, size = 44 }: { slug: string | null; size?: number }) {
  const def = (slug && ICONS[slug]) || ICONS.allrounder;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`${slug ?? "profile"} emblem`}
      className="shrink-0"
    >
      <rect width="48" height="48" rx="12" fill={def.color} />
      <g
        transform="translate(12 12)"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {def.glyph}
      </g>
    </svg>
  );
}
