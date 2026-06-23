"use client";

import Link from "next/link";
import ArchetypeIcon from "../components/ArchetypeIcon";
import {
  ARCHETYPE_BY_SLUG,
  ARCHETYPE_TO_PI,
  FACTOR_MAP,
  PI_PROFILES,
  type FactorLevel,
  type PiGroup,
} from "../lib/referenceMap";

// /reference — a cheat sheet that translates Predictive Index Reference Profiles
// into Treadwell Assess's 13 original archetypes (and back). Mappings are by
// behavioral-factor pattern; it's a translation aid, not an equivalence.

const GROUP_BADGE: Record<PiGroup, string> = {
  Analytical: "bg-violet-50 text-violet-700 ring-violet-200",
  Social: "bg-sky-50 text-sky-700 ring-sky-200",
  Stabilizing: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Persistent: "bg-amber-50 text-amber-700 ring-amber-200",
};

function GroupBadge({ group }: { group: PiGroup }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${GROUP_BADGE[group]}`}>
      {group}
    </span>
  );
}

const LEVEL_STYLE: Record<FactorLevel, { cls: string; mark: string }> = {
  high: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", mark: "↑" },
  low: { cls: "bg-slate-50 text-slate-500 ring-slate-200", mark: "↓" },
  mid: { cls: "bg-white text-slate-400 ring-slate-200", mark: "–" },
};

function FactorChip({ letter, level }: { letter: string; level: FactorLevel }) {
  const s = LEVEL_STYLE[level];
  return (
    <span
      className={`inline-flex h-6 w-7 items-center justify-center rounded-md text-[11px] font-bold tabular-nums ring-1 ${s.cls}`}
      title={`${letter} ${level}`}
    >
      {letter}
      <span aria-hidden className="ml-0.5">{s.mark}</span>
    </span>
  );
}

function Pattern({ p }: { p: { d: FactorLevel; e: FactorLevel; p: FactorLevel; f: FactorLevel } }) {
  return (
    <span className="inline-flex gap-1">
      <FactorChip letter="D" level={p.d} />
      <FactorChip letter="E" level={p.e} />
      <FactorChip letter="P" level={p.p} />
      <FactorChip letter="F" level={p.f} />
    </span>
  );
}

function ArchetypeCell({ slug, size = 26 }: { slug: string; size?: number }) {
  const a = ARCHETYPE_BY_SLUG[slug];
  return (
    <span className="inline-flex items-center gap-2">
      <ArchetypeIcon slug={slug} size={size} />
      <span className="font-semibold text-slate-900">{a?.name ?? slug}</span>
    </span>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded bg-sky-500" />
            <span className="text-sm font-extrabold tracking-wide text-slate-900">Treadwell Assess</span>
            <span className="ml-2 text-xs text-slate-400">PI ↔ Archetype reference</span>
          </div>
          <Link href="/hire" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
            ← Hiring Center
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

const TH = "px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500";
const TD = "px-4 py-3 align-top";

export default function ReferencePage() {
  return (
    <Frame>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        {/* Intro */}
        <section>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            Coming from Predictive Index? Here&apos;s the map.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Treadwell Assess uses its own 13 archetypes. If your team thinks in PI Reference
            Profiles, this page shows the closest Treadwell archetype for each PI profile — and
            the reverse. Matches are based on the underlying behavioral-factor pattern, so treat
            this as a <span className="font-semibold text-slate-800">translation aid, not an exact
            equivalence</span>.
          </p>
        </section>

        {/* Trailblazer / Venturer caveat */}
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">⚠ &ldquo;Trailblazer&rdquo; is a trap — read this first</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-amber-900/90">
            <li>
              • <span className="font-semibold">PI has no profile named &ldquo;Trailblazer.&rdquo;</span> The PI profile
              described as a <em>&ldquo;trailblazing strategist&rdquo;</em> is the <span className="font-semibold">Venturer</span>,
              which maps to our <span className="font-semibold">Pathfinder</span>.
            </li>
            <li>
              • Our archetype named <span className="font-semibold">Trailblazer</span>{" "}
              is a different pattern (high drive + some social pull, fast and informal) — closest to PI&apos;s{" "}
              <span className="font-semibold">Maverick / Captain</span>.
            </li>
            <li>
              • So don&apos;t match PI&apos;s &ldquo;trailblazer&rdquo; to our Trailblazer by name. PI trailblazer (Venturer)
              → <span className="font-semibold">Pathfinder</span>; our Trailblazer → PI{" "}
              <span className="font-semibold">Maverick / Captain</span>.
            </li>
          </ul>
        </section>

        {/* Factor correspondence */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-800">How the factors line up</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              PI&apos;s four drives correspond almost 1:1 with ours — every mapping below rests on this.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={TH}>PI factor</th>
                  <th className={TH}>Treadwell Assess factor</th>
                  <th className={TH}>Spectrum (high ↔ low)</th>
                </tr>
              </thead>
              <tbody>
                {FACTOR_MAP.map((f) => (
                  <tr key={f.pi} className="border-b border-slate-50 last:border-0">
                    <td className={`${TD} font-semibold text-slate-900`}>{f.pi}</td>
                    <td className={`${TD} text-slate-700`}>{f.tw}</td>
                    <td className={`${TD} text-slate-500`}>{f.spectrum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Table A — PI → Treadwell */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-800">PI profile → our archetype (all 17)</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Pattern reads <span className="font-semibold">D</span>ominance ·{" "}
              <span className="font-semibold">E</span>xtraversion ·{" "}
              <span className="font-semibold">P</span>atience ·{" "}
              <span className="font-semibold">F</span>ormality. ↑ high · ↓ low · – mid.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={TH}>PI profile</th>
                  <th className={TH}>Pattern</th>
                  <th className={TH}>→ Treadwell</th>
                  <th className={TH}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {PI_PROFILES.map((pi) => (
                  <tr
                    key={pi.name}
                    className={`border-b border-slate-50 last:border-0 ${pi.flag ? "bg-sky-50/60" : "hover:bg-slate-50"}`}
                  >
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{pi.name}</span>
                        {pi.flag && <span className="text-xs">⚠</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <GroupBadge group={pi.group} />
                      </div>
                      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-500">{pi.blurb}</p>
                    </td>
                    <td className={TD}>
                      <Pattern p={pi.pattern} />
                    </td>
                    <td className={TD}>
                      <ArchetypeCell slug={pi.primarySlug} />
                    </td>
                    <td className={`${TD} max-w-xs text-xs leading-relaxed text-slate-600`}>{pi.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Table B — Treadwell → PI */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-800">Our 13 archetypes → closest PI profile</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              The reverse lookup: see a Treadwell archetype on a report, recall the PI label it&apos;s near.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={TH}>Treadwell archetype</th>
                  <th className={TH}>Factor shape</th>
                  <th className={TH}>≈ PI profile(s)</th>
                  <th className={TH}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {ARCHETYPE_TO_PI.map((row) => {
                  const a = ARCHETYPE_BY_SLUG[row.slug];
                  return (
                    <tr
                      key={row.slug}
                      className={`border-b border-slate-50 last:border-0 ${row.flag ? "bg-sky-50/60" : "hover:bg-slate-50"}`}
                    >
                      <td className={TD}>
                        <ArchetypeCell slug={row.slug} />
                        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-500">{a?.tagline}</p>
                      </td>
                      <td className={`${TD} text-xs text-slate-600`}>{row.shape}</td>
                      <td className={`${TD} font-semibold text-slate-900`}>{row.piNames.join(" / ")}</td>
                      <td className={`${TD} max-w-xs text-xs leading-relaxed text-slate-600`}>{row.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Trademark footer */}
        <p className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-400">
          Predictive Index® and its Reference Profile names are trademarks of The Predictive Index,
          used here for comparison only. Treadwell Assess&apos;s assessment, scoring, and archetypes
          are original content and are not affiliated with or derived from Predictive Index.
        </p>
      </main>
    </Frame>
  );
}
