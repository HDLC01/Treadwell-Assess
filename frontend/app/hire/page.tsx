"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createJob, deleteJob, getOrCreateLink, listJobs, updateJob, type JobSummary } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { btnPrimary, btnSecondary, card, inputCls } from "../lib/ui";

// Priority/highlighted jobs are flagged purely client-side (no backend column),
// persisted as a Set of job ids in localStorage under this key.
const STARRED_KEY = "assess.hire.starred";
const PAGE_SIZE = 25;

// Per-row "Copy assessment link" — reuses the same getOrCreateLink + clipboard
// flow as the job detail page's CopyLinkButton, scoped to one job row.
function CopyLinkButton({ jobId, name }: { jobId: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const copy = async () => {
    setBusy(true);
    try {
      const { token } = await getOrCreateLink(jobId);
      const url = `${window.location.origin}/a?t=${token}`;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        window.prompt("Copy the assessment link:", url);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={copy}
      disabled={busy}
      aria-label={`Copy assessment link for ${name}`}
      title="Copy assessment link"
      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {copied ? "Copied!" : "Copy assessment link"}
    </button>
  );
}

// Hiring Center — the jobs list. (Employer auth gates this before deploy.)
export default function HiringCenterPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [deleting, setDeleting] = useState<JobSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [starred, setStarred] = useState<Set<string>>(new Set());

  const refresh = () => {
    listJobs()
      .then((r) => setJobs(r.jobs))
      .catch(() => setError("Could not load jobs — is the API running?"))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  // Load highlighted/starred job ids from localStorage (client-only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STARRED_KEY);
      if (raw) setStarred(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore malformed/blocked storage */
    }
  }, []);

  const toggleStar = (id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(STARRED_KEY, JSON.stringify([...next]));
      } catch {
        /* storage may be unavailable — keep in-memory state regardless */
      }
      return next;
    });
  };

  // Reset to page 1 whenever the search query changes.
  useEffect(() => {
    setPage(1);
  }, [query]);

  // Displayed list: filter by search → sort (starred first, original order
  // preserved within each group) → paginate.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? jobs.filter(
          (j) =>
            j.name.toLowerCase().includes(q) ||
            (j.folder || "").toLowerCase().includes(q),
        )
      : jobs;
    return [...matched].sort((a, b) => {
      const sa = starred.has(a.id) ? 0 : 1;
      const sb = starred.has(b.id) ? 0 : 1;
      return sa - sb; // stable sort keeps existing order within each group
    });
  }, [jobs, query, starred]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageJobs = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );
  // Clamp page if the filtered set shrinks below the current page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const add = async () => {
    if (!name.trim()) return;
    await createJob(name.trim(), folder.trim());
    setName("");
    setFolder("");
    setShowNew(false);
    refresh();
  };

  const startEdit = (j: JobSummary) => {
    setEditingId(j.id);
    setEditName(j.name);
    setEditFolder(j.folder || "");
  };
  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setBusy(true);
    await updateJob(id, { name: editName.trim(), folder: editFolder.trim() });
    setBusy(false);
    setEditingId(null);
    refresh();
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    await deleteJob(deleting.id);
    setBusy(false);
    setDeleting(null);
    refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Jobs</h1>
          <div className="flex items-center gap-3">
            {!loading && !error && jobs.length > 0 && (
              <span className="text-xs text-slate-400">{jobs.length} total</span>
            )}
            <button onClick={() => setShowNew((v) => !v)} className={btnPrimary}>
              + New job
            </button>
          </div>
        </div>
        {showNew && (
          <div className={`mb-6 flex flex-wrap items-end gap-3 p-4 ${card}`}>
            <label className="text-xs font-semibold text-slate-600">
              Job name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1 block w-64 ${inputCls}`}
                placeholder="e.g. Project Manager"
                autoFocus
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Folder <span className="font-normal text-slate-400">(optional)</span>
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className={`mt-1 block w-48 ${inputCls}`}
                placeholder="e.g. Office Staff"
              />
            </label>
            <button onClick={add} disabled={!name.trim()} className={btnPrimary}>
              Create
            </button>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search jobs"
                aria-label="Search jobs by name or folder"
                className={`w-64 pl-9 ${inputCls}`}
              />
            </div>
            {query.trim() && (
              <span className="text-xs text-slate-400">
                {filtered.length} match{filtered.length === 1 ? "" : "es"}
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className={`flex flex-col divide-y divide-slate-100 ${card}`}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
                <div className="flex-1">
                  <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" />
                  <div className="mt-2 h-2.5 w-24 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : jobs.length === 0 ? (
          <div className={`px-6 py-12 text-center ${card}`}>
            <p className="text-sm font-semibold text-slate-700">No jobs yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Create your first job to define a target and start assessing candidates.
            </p>
            <button onClick={() => setShowNew(true)} className={`mt-4 ${btnPrimary}`}>
              + New job
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={`px-6 py-12 text-center ${card}`}>
            <p className="text-sm font-semibold text-slate-700">No matching jobs</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Nothing matches &ldquo;{query.trim()}&rdquo;. Try a different search.
            </p>
          </div>
        ) : (
          <div className={`overflow-hidden ${card}`}>
            {pageJobs.map((j) => {
              const isStarred = starred.has(j.id);
              return (
              <div
                key={j.id}
                className={`group flex items-center gap-4 border-b px-5 py-4 transition last:border-0 ${
                  isStarred
                    ? "border-amber-100 bg-amber-50/50 hover:bg-amber-50"
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <button
                  onClick={() => toggleStar(j.id)}
                  aria-pressed={isStarred}
                  aria-label={isStarred ? `Unstar ${j.name}` : `Star ${j.name}`}
                  title={isStarred ? "Unstar (remove priority)" : "Star (flag as priority)"}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-lg leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    isStarred
                      ? "text-amber-500 hover:text-amber-600"
                      : "text-slate-300 hover:text-slate-500"
                  }`}
                >
                  {isStarred ? "★" : "☆"}
                </button>
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-extrabold ring-1 ${
                    isStarred
                      ? "bg-amber-100 text-amber-700 ring-amber-200"
                      : "bg-sky-50 text-sky-600 ring-sky-100"
                  }`}
                >
                  {j.name.slice(0, 1).toUpperCase()}
                </span>
                {editingId === j.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`w-56 ${inputCls}`}
                      placeholder="Job name"
                      autoFocus
                    />
                    <input
                      value={editFolder}
                      onChange={(e) => setEditFolder(e.target.value)}
                      className={`w-44 ${inputCls}`}
                      placeholder="Folder (optional)"
                    />
                    <button onClick={() => saveEdit(j.id)} disabled={busy || !editName.trim()} className={btnPrimary}>
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} disabled={busy} className={btnSecondary}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      href={`/hire/${j.id}`}
                      className="min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                      <p className="truncate text-sm font-bold text-slate-900 group-hover:text-sky-700">{j.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                        {j.folder && <span>{j.folder} ·</span>}
                        <span>
                          {j.candidate_count} candidate{j.candidate_count === 1 ? "" : "s"}
                        </span>
                        {!j.has_target && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                            no target
                          </span>
                        )}
                      </p>
                    </Link>
                    <div className="flex items-center gap-1">
                      <CopyLinkButton jobId={j.id} name={j.name} />
                      <button
                        onClick={() => startEdit(j)}
                        aria-label={`Edit ${j.name}`}
                        title="Edit"
                        className="grid h-9 w-9 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleting(j)}
                        aria-label={`Delete ${j.name}`}
                        title="Delete"
                        className="grid h-9 w-9 place-items-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                      <Link
                        href={`/hire/${j.id}`}
                        className="ml-1 text-xs font-semibold text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-sky-600"
                      >
                        Open →
                      </Link>
                    </div>
                  </>
                )}
              </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              <span>
                Showing <span className="font-semibold tabular-nums text-slate-700">{pageJobs.length}</span> of{" "}
                <span className="font-semibold tabular-nums text-slate-700">{filtered.length}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                >
                  ‹
                </button>
                <span className="tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !busy && setDeleting(null)}
        >
          <div className={`w-full max-w-sm p-5 ${card}`} onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-slate-900">Delete this job?</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              <span className="font-semibold">{deleting.name}</span> and its {deleting.candidate_count}{" "}
              candidate{deleting.candidate_count === 1 ? "" : "s"}{" "}
              (with all their results) will be permanently removed. This can&apos;t be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} disabled={busy} className={btnSecondary}>
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
