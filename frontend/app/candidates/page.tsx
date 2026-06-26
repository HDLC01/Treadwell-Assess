"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listAllCandidates, type CandidateRow } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { card, inputCls } from "../lib/ui";

// Cross-job candidate directory. Per Treadwell policy, candidate RESULTS are
// never shown alongside other candidates' — this list is navigation only
// (name, role, when, status). Results live on each candidate's own report.
export default function CandidatesPage() {
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const refresh = useCallback(
    () =>
      listAllCandidates({ q: q || undefined, page })
        .then((r) => {
          setRows(r.items);
          setTotal(r.total);
          setTotalPages(r.total_pages || 1);
        })
        .catch(() => setError("Could not load candidates — is the API running?"))
        .finally(() => setLoading(false)),
    [q, page],
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
            <p className="mt-0.5 text-sm text-slate-500">
              Everyone you&apos;ve assessed, across all roles. Open a candidate to see their results.
            </p>
          </div>
          {!loading && !error && <span className="text-xs text-slate-400">{total} total</span>}
        </div>

        <div className={`overflow-hidden ${card}`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
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
                  <div className="h-4 w-44 animate-pulse rounded bg-slate-100" />
                  <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="m-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          ) : rows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">
                {q ? "No matching candidates" : "No candidates yet"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {q ? "Try a different search." : "Open a job, copy its assessment link, and candidates will show up here as they finish."}
              </p>
              {!q && (
                <Link href="/hire" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700">
                  Go to Jobs →
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2.5">Candidate</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Assessed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/hire/${c.job_id}/candidate/${c.id}`)}
                      className="group cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-sky-50/40"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/hire/${c.job_id}/candidate/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-slate-900 transition-colors group-hover:text-sky-700 hover:underline"
                        >
                          {c.full_name}
                        </Link>
                        {c.email && <p className="truncate text-xs text-slate-500">{c.email}</p>}
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
                      <td className="px-4 py-3">
                        {c.has_behavioral ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                            In progress
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-slate-500">
                        {c.assessed_at ? c.assessed_at.slice(0, 10) : <span className="text-slate-400">—</span>}
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
