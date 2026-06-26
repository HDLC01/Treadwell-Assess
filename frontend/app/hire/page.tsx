"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createJob, deleteJob, listJobs, updateJob, type JobSummary } from "../lib/api";
import AppHeader from "../components/AppHeader";
import { btnPrimary, btnSecondary, card, inputCls } from "../lib/ui";

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

  const refresh = () => {
    listJobs()
      .then((r) => setJobs(r.jobs))
      .catch(() => setError("Could not load jobs — is the API running?"))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

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
        ) : (
          <div className={`overflow-hidden ${card}`}>
            {jobs.map((j) => (
              <div
                key={j.id}
                className="group flex items-center gap-4 border-b border-slate-100 px-5 py-4 transition last:border-0 hover:bg-slate-50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sm font-extrabold text-sky-600 ring-1 ring-sky-100">
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
            ))}
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
              candidate{deleting.candidate_count === 1 ? "" : "s"} (with all their results) will be
              permanently removed. This can&apos;t be undone.
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
