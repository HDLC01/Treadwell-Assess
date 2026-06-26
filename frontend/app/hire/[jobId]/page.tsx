"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DISC_LETTER,
  FACTORS,
  getJob,
  getOrCreateLink,
  listCandidates,
  patchCandidate,
  updateJob,
  type BehavioralTarget,
  type CandidateRow,
  type Factor,
  type JobDetail,
} from "../../lib/api";
import Stars from "../../components/Stars";
import Sparkline from "../../components/Sparkline";
import ArchetypeIcon from "../../components/ArchetypeIcon";
import AppHeader from "../../components/AppHeader";
import { btnPrimary, btnSecondary, inputCls } from "../../lib/ui";

const FACTOR_ENDS: Record<Factor, [string, string]> = {
  A: ["Collaborative", "Independent"],
  B: ["Reserved", "Sociable"],
  C: ["Fast-paced", "Steady"],
  D: ["Flexible", "Precise"],
};

const DEFAULT_TARGET: BehavioralTarget = {
  A: { low: -1, high: 1 },
  B: { low: -1, high: 1 },
  C: { low: -1, high: 1 },
  D: { low: -1, high: 1 },
};

// Every job-target band is ONE locked width so the four factors read uniformly
// (Will's call). The employer only positions the band; the width never changes.
const TARGET_WIDTH = 1.5; // σ — fixed width of every target band
const HALF = TARGET_WIDTH / 2; // 0.75σ on each side of the center
const STEP = 0.5; // the band center snaps to this σ grid
const CENTER_MIN = -3 + HALF; // keep the band fully inside the −3…+3 scale
const CENTER_MAX = 3 - HALF;

const clampCenter = (c: number) => Math.min(CENTER_MAX, Math.max(CENTER_MIN, c));

// Coerce any saved/loaded target to the locked width, centered on its midpoint —
// so older variable-width targets render uniformly and re-save consistently.
function normalizeTarget(t: BehavioralTarget): BehavioralTarget {
  const out = {} as BehavioralTarget;
  for (const f of FACTORS) {
    const mid = clampCenter(Math.round((t[f].low + t[f].high) / 2 / STEP) * STEP);
    out[f] = { low: mid - HALF, high: mid + HALF };
  }
  return out;
}

// One factor's locked-width target band: drag the band (or click the track) to
// reposition; arrow keys nudge it. No more low/high sliders — width is fixed.
function FactorTarget({
  letter,
  name,
  ends,
  low,
  high,
  marker,
  onCenter,
}: {
  letter: string;
  name: string;
  ends: [string, string];
  low: number;
  high: number;
  marker: { value: number; name: string } | null;
  onCenter: (c: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pct = (v: number) => `${((v + 3) / 6) * 100}%`;
  const fmt = (v: number) => `${v > 0 ? "+" : ""}${v}σ`;
  const center = low + HALF;

  const centerFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return center;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return clampCenter(Math.round((frac * 6 - 3) / STEP) * STEP);
  };

  const onBandDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    dragging.current = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onBandMove = (e: React.PointerEvent) => {
    if (dragging.current) onCenter(centerFromX(e.clientX));
  };
  const onBandUp = (e: React.PointerEvent) => {
    dragging.current = false;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onCenter(clampCenter(center + STEP));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onCenter(clampCenter(center - STEP));
    } else if (e.key === "Home") {
      e.preventDefault();
      onCenter(CENTER_MIN);
    } else if (e.key === "End") {
      e.preventDefault();
      onCenter(CENTER_MAX);
    }
  };

  return (
    <div>
      <p className="mb-2 text-sm font-bold text-slate-800">
        ({letter}) {name}
      </p>
      <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
        <span className="w-20 shrink-0 text-right">{ends[0]}</span>
        <div
          ref={trackRef}
          onPointerDown={(e) => onCenter(centerFromX(e.clientX))}
          className="relative h-9 flex-1 cursor-pointer touch-none rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200"
        >
          {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
            <span
              key={t}
              className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-slate-300"
              style={{ left: pct(t) }}
            />
          ))}
          <div
            role="slider"
            tabIndex={0}
            aria-label={`${name} target range`}
            aria-valuemin={-3}
            aria-valuemax={3}
            aria-valuenow={center}
            aria-valuetext={`${fmt(low)} to ${fmt(high)}`}
            onPointerDown={onBandDown}
            onPointerMove={onBandMove}
            onPointerUp={onBandUp}
            onKeyDown={onKey}
            className="absolute top-1/2 flex h-6 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full bg-orange-300 shadow-sm ring-1 ring-orange-400 transition-colors hover:bg-orange-400/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 active:cursor-grabbing"
            style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white/90 ring-1 ring-orange-500/40" />
          </div>
          {marker && (
            <span
              className="pointer-events-none absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-600 shadow"
              style={{ left: pct(marker.value) }}
              title={`${marker.name}: ${fmt(marker.value)}`}
            />
          )}
        </div>
        <span className="w-20 shrink-0">{ends[1]}</span>
      </div>
      <p className="mt-2 pl-[5.75rem] text-xs text-slate-500">
        Target band{" "}
        <span className="font-mono font-semibold tabular-nums text-slate-700">{fmt(low)}</span> to{" "}
        <span className="font-mono font-semibold tabular-nums text-slate-700">{fmt(high)}</span>
        <span className="text-slate-400"> — drag to reposition</span>
      </p>
    </div>
  );
}

export default function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [tab, setTab] = useState<"target" | "candidates">("target");
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    getJob(jobId)
      .then(setJob)
      .catch(() => setError("Could not load this job."));
  }, [jobId]);
  useEffect(refresh, [refresh]);

  if (error) return <Frame><p className="p-8 text-rose-600">{error}</p></Frame>;
  if (!job) return <Frame><p className="p-8 text-slate-500">Loading…</p></Frame>;

  return (
    <Frame>
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <Link href="/hire" className="text-xs font-semibold text-sky-600 hover:underline">
          ← Hiring Center
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{job.name}</h1>
            {job.folder && <p className="text-xs text-slate-500">Folder: {job.folder}</p>}
          </div>
          <CopyLinkButton jobId={job.id} />
        </div>
        <nav className="mt-5 flex gap-6 border-b border-slate-200 text-sm font-semibold">
          {(["target", "candidates"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 pb-2 transition ${
                tab === t
                  ? "border-sky-600 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t === "target" ? "Job Target" : `Candidates (${job.candidate_count})`}
            </button>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-6">
        {tab === "target" ? (
          <TargetTab job={job} onSaved={refresh} />
        ) : (
          <CandidatesTab jobId={job.id} />
        )}
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      {children}
    </div>
  );
}

function CopyLinkButton({ jobId }: { jobId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const { token } = await getOrCreateLink(jobId);
    const url = `${window.location.origin}/a?t=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy the assessment link:", url);
    }
  };
  return (
    <button onClick={copy} className={btnSecondary}>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {copied ? "Copied!" : "Copy assessment link"}
    </button>
  );
}

// ── Job Target tab ────────────────────────────────────────────────────────────
function TargetTab({ job, onSaved }: { job: JobDetail; onSaved: () => void }) {
  const [target, setTarget] = useState<BehavioralTarget>(() =>
    normalizeTarget(job.behavioral_target ?? DEFAULT_TARGET),
  );
  const [cog, setCog] = useState<string>(job.cognitive_target?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Overlay a chosen candidate's behavioral pattern on the target ranges.
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [compareId, setCompareId] = useState<string>("");
  useEffect(() => {
    listCandidates(job.id, { page: 1 })
      .then((r) => {
        const assessed = r.items.filter((c) => c.has_behavioral && c.synthesis);
        setCandidates(assessed);
        // Default to the first assessed candidate so the fit stars + overlay show
        // immediately (the target itself has no rating — fit is per-candidate).
        setCompareId((cur) => cur || (assessed[0]?.id ?? ""));
      })
      .catch(() => { /* non-fatal: just no overlay option */ });
  }, [job.id]);
  const compare = candidates.find((c) => c.id === compareId) ?? null;

  const setCenter = (f: Factor, c: number) =>
    setTarget((t) => ({ ...t, [f]: { low: c - HALF, high: c + HALF } }));

  const save = async () => {
    setSaving(true);
    await updateJob(job.id, {
      behavioral_target: target,
      cognitive_target: cog === "" ? null : Number(cog),
    });
    setSaving(false);
    setSavedAt(Date.now());
    onSaved();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <p className="text-sm font-bold text-slate-800">Behavioral Target</p>
        <p className="mt-1 text-xs text-slate-500">
          Your ideal candidate will likely fall into these highlighted ranges of behaviors.
        </p>

        {candidates.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs font-semibold text-slate-600">Compare a candidate</span>
            <select
              value={compareId}
              onChange={(e) => setCompareId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
            >
              <option value="">— none —</option>
              {candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            {compare && (
              <span className="flex items-center gap-2 text-xs text-slate-600">
                <Stars value={compare.behavioral_fit} />
                {compare.profile_name && <span className="font-semibold text-slate-800">{compare.profile_name}</span>}
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-white bg-sky-600 shadow" />
                  on the bars
                </span>
              </span>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-7">
          {FACTORS.map((f) => (
            <FactorTarget
              key={f}
              letter={DISC_LETTER[f]}
              name={job.factor_names[f]}
              ends={FACTOR_ENDS[f]}
              low={target[f].low}
              high={target[f].high}
              marker={
                compare?.synthesis
                  ? { value: compare.synthesis[f], name: compare.full_name }
                  : null
              }
              onCenter={(c) => setCenter(f, c)}
            />
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
          <label className="text-xs font-semibold text-slate-600">
            Cognitive target (min score)
            <input
              value={cog}
              onChange={(e) => setCog(e.target.value.replace(/[^0-9]/g, ""))}
              className={`ml-2 w-20 ${inputCls}`}
              placeholder="—"
            />
          </label>
          <div className="flex-1" />
          {savedAt && <span className="text-xs text-emerald-600">Saved ✓</span>}
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : "Save target"}
          </button>
        </div>
      </div>

      {job.key_characteristics.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <p className="text-sm font-bold text-slate-800">Key Characteristics</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {job.key_characteristics.map((c) => (
              <div key={c} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {c}
              </div>
            ))}
          </div>
        </div>
      )}

      {job.matched_profiles.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <p className="text-sm font-bold text-slate-800">Common Reference Profiles</p>
          <p className="mt-1 text-xs text-slate-500">
            Candidates matching this target often land in these profiles.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {job.matched_profiles.map((p) => (
              <div key={p.slug} className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-extrabold text-slate-900">{p.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{p.tagline}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Candidates tab ────────────────────────────────────────────────────────────
function CandidatesTab({ jobId }: { jobId: string }) {
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [minFit, setMinFit] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(() => {
    // No synchronous setState here — `loading` starts true and is cleared in
    // `finally`; refetches (search/page/bookmark) update the rows in place.
    return listCandidates(jobId, {
      q: q || undefined,
      min_fit: minFit === "" ? undefined : Number(minFit),
      page,
    })
      .then((r) => {
        setRows(r.items);
        setTotal(r.total);
        setTotalPages(r.total_pages || 1);
      })
      .finally(() => setLoading(false));
  }, [jobId, q, minFit, page]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleBookmark = async (c: CandidateRow) => {
    await patchCandidate(c.id, { bookmarked: !c.bookmarked });
    refresh();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <select
          value={minFit}
          onChange={(e) => { setMinFit(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="">Minimum Behavioral Fit</option>
          <option value="2">★ 2+</option>
          <option value="3">★ 3+</option>
          <option value="4">★ 4+</option>
          <option value="4.5">★ 4.5+</option>
        </select>
        <div className="flex-1" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search for a candidate"
          className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <p className="p-6 text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">
          No candidates yet — copy the assessment link and send it out.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Behavioral Fit</th>
                <th className="px-4 py-3">Reference Profile</th>
                <th className="px-4 py-3">Assessed</th>
                <th className="px-4 py-3">Behavioral Pattern</th>
                <th className="px-4 py-3">Cognitive Fit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/hire/${jobId}/candidate/${c.id}`)}
                  className="cursor-pointer border-b border-slate-50 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/hire/${jobId}/candidate/${c.id}`}
                      className="font-bold text-slate-900 hover:text-sky-700 hover:underline"
                    >
                      {c.full_name}
                    </Link>
                    {c.email && <p className="text-xs text-slate-500">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3"><Stars value={c.behavioral_fit} /></td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.profile_name ? (
                      <span className="flex items-center gap-2">
                        <ArchetypeIcon slug={c.profile_slug} size={24} />
                        {c.profile_name}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.assessed_at ? c.assessed_at.slice(0, 10) : "pending"}
                  </td>
                  <td className="px-4 py-3"><Sparkline synthesis={c.synthesis} /></td>
                  <td className="px-4 py-3">
                    {c.cognitive_fit ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          c.cognitive_fit === "strong"
                            ? "bg-emerald-100 text-emerald-700"
                            : c.cognitive_fit === "moderate"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {c.cognitive_fit === "strong" ? "Strong fit" : c.cognitive_fit}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(c); }}
                      title={c.bookmarked ? "Remove bookmark" : "Bookmark"}
                      className={`text-lg ${c.bookmarked ? "text-amber-500" : "text-slate-300 hover:text-slate-500"}`}
                    >
                      {c.bookmarked ? "★" : "☆"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        <span>
          Showing {rows.length} of {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            ‹
          </button>
          <span>{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
