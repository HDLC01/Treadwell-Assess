"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <span className="h-3.5 w-3.5 rounded bg-sky-500" />
          <span className="text-sm font-extrabold tracking-wide text-slate-900">Treadwell Assess</span>
        </div>
      </header>
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
    <button
      onClick={copy}
      className="rounded-lg border border-sky-600 px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
    >
      {copied ? "Copied!" : "🔗 Copy assessment link"}
    </button>
  );
}

// ── Job Target tab ────────────────────────────────────────────────────────────
function TargetTab({ job, onSaved }: { job: JobDetail; onSaved: () => void }) {
  const [target, setTarget] = useState<BehavioralTarget>(job.behavioral_target ?? DEFAULT_TARGET);
  const [cog, setCog] = useState<string>(job.cognitive_target?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const setRange = (f: Factor, key: "low" | "high", v: number) =>
    setTarget((t) => ({ ...t, [f]: { ...t[f], [key]: v } }));

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

  const pct = (v: number) => `${((v + 3) / 6) * 100}%`;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold text-slate-800">Behavioral Target</p>
        <p className="mt-1 text-xs text-slate-500">
          Your ideal candidate will likely fall into these highlighted ranges of behaviors.
        </p>
        <div className="mt-6 flex flex-col gap-7">
          {FACTORS.map((f) => {
            const rng = target[f];
            return (
              <div key={f}>
                <p className="mb-1 text-sm font-bold text-slate-800">
                  ({DISC_LETTER[f]}) {job.factor_names[f]}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-20 text-right">{FACTOR_ENDS[f][0]}</span>
                  <div className="relative h-7 flex-1 rounded-full bg-slate-100">
                    <span
                      className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-orange-300/80"
                      style={{ left: pct(Math.min(rng.low, rng.high)), width: `calc(${pct(Math.max(rng.low, rng.high))} - ${pct(Math.min(rng.low, rng.high))})` }}
                    />
                    {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
                      <span key={t} className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-slate-300" style={{ left: pct(t) }} />
                    ))}
                  </div>
                  <span className="w-20">{FACTOR_ENDS[f][1]}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 sm:pl-22">
                  <label className="flex min-w-0 items-center gap-2">
                    Low
                    <input
                      type="range" min={-3} max={3} step={0.5} value={rng.low}
                      onChange={(e) => setRange(f, "low", Number(e.target.value))}
                      className="w-28 accent-sky-600 sm:w-40"
                    />
                    <span className="w-8 font-mono">{rng.low > 0 ? `+${rng.low}` : rng.low}σ</span>
                  </label>
                  <label className="flex min-w-0 items-center gap-2">
                    High
                    <input
                      type="range" min={-3} max={3} step={0.5} value={rng.high}
                      onChange={(e) => setRange(f, "high", Number(e.target.value))}
                      className="w-28 accent-sky-600 sm:w-40"
                    />
                    <span className="w-8 font-mono">{rng.high > 0 ? `+${rng.high}` : rng.high}σ</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
          <label className="text-xs font-semibold text-slate-600">
            Cognitive target (min score)
            <input
              value={cog}
              onChange={(e) => setCog(e.target.value.replace(/[^0-9]/g, ""))}
              className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="—"
            />
          </label>
          <div className="flex-1" />
          {savedAt && <span className="text-xs text-emerald-600">Saved ✓</span>}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save target"}
          </button>
        </div>
      </div>

      {job.key_characteristics.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
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
        <div className="rounded-xl border border-slate-200 bg-white p-6">
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
    <div className="rounded-xl border border-slate-200 bg-white">
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
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
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
                      onClick={() => toggleBookmark(c)}
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
