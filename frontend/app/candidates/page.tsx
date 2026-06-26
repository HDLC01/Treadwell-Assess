"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listAllCandidates, type CandidateRow } from "../lib/api";
import AppHeader from "../components/AppHeader";
import Stars from "../components/Stars";
import Sparkline from "../components/Sparkline";
import ArchetypeIcon from "../components/ArchetypeIcon";
import { card, inputCls } from "../lib/ui";

const FIT_BADGE: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  low: "bg-rose-100 text-rose-700",
};

// Cross-job candidate directory — every assessed candidate, searchable, with the
// role they applied for. Rows link to the same per-candidate report.
export default function CandidatesPage() {
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [minFit, setMinFit] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const refresh = useCallback(
    () =>
      listAllCandidates({
        q: q || undefined,
        min_fit: minFit === "" ? undefined : Number(minFit),
        page,
      })
        .then((r) => {
          setRows(r.items);
          setTotal(r.total);
          setTotalPages(r.total_pages || 1);
        })
        .catch(() => setError("Could not load candidates — is the API running?"))
        .finally(() => setLoading(false)),
    [q, minFit, page],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Candidates</h1>
            <p className="mt-0.5 text-sm text-slate-500">Everyone you&apos;ve assessed, across all roles.</p>
          </div>
          {!loading && !error && <span className="text-xs text-slate-400">{total} total</span>}
        </div>

        <div className={`overflow-hidden ${card}`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
            <label className="sr-only" htmlFor="minfit">Minimum behavioral fit</label>
            <select
              id="minfit"
              value={minFit}
              onChange={(e) => { setMinFit(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
            >
              <option value="">Minimum Behavioral Fit</option>
              <option value="2">★ 2+</option>
              <option value="3">★ 3+</option>
              <option value="4">★ 4+</option>
              <option value="4.5">★ 4.5+</option>
            </select>
            <div className="relative ml-auto">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search by name, email, or role"
                aria-label="Search candidates"
                className={`w-64 pl-9 ${inputCls}`}
              />
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                  <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="m-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          ) : rows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No candidates yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Open a job, copy its assessment link, and candidates will show up here as they finish.
              </p>
              <Link href="/hire" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700">
                Go to Jobs →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Behavioral Fit</th>
                    <th className="px-4 py-3">Reference Profile</th>
                    <th className="px-4 py-3">Assessed</th>
                    <th className="px-4 py-3">Pattern</th>
                    <th className="px-4 py-3">Cognitive Fit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/hire/${c.job_id}/candidate/${c.id}`)}
                      className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/hire/${c.job_id}/candidate/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-slate-900 hover:text-sky-700 hover:underline"
                        >
                          {c.full_name}
                        </Link>
                        {c.email && <p className="text-xs text-slate-500">{c.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/hire/${c.job_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-600 hover:text-sky-700 hover:underline"
                        >
                          {c.job_name}
                        </Link>
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
                      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                        {c.assessed_at ? c.assessed_at.slice(0, 10) : "pending"}
                      </td>
                      <td className="px-4 py-3"><Sparkline synthesis={c.synthesis} /></td>
                      <td className="px-4 py-3">
                        {c.cognitive_fit ? (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${FIT_BADGE[c.cognitive_fit] ?? ""}`}>
                            {c.cognitive_fit === "strong" ? "Strong fit" : c.cognitive_fit}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>Showing {rows.length} of {total}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                className="rounded border border-slate-300 px-2 py-1 transition hover:bg-slate-50 disabled:opacity-40"
              >
                ‹
              </button>
              <span className="tabular-nums">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="rounded border border-slate-300 px-2 py-1 transition hover:bg-slate-50 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
