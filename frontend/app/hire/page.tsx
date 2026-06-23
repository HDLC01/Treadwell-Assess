"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createJob, listJobs, type JobSummary } from "../lib/api";

// Hiring Center — the jobs list. (Employer auth gates this before deploy.)
export default function HiringCenterPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("");

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded bg-sky-500" />
            <span className="text-sm font-extrabold tracking-wide text-slate-900">
              Treadwell Assess
            </span>
            <span className="ml-2 text-xs text-slate-400">Hiring Center</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/reference"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              PI ↔ Archetype reference
            </Link>
            <button
              onClick={() => setShowNew((v) => !v)}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
            >
              + New job
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {showNew && (
          <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="text-xs font-semibold text-slate-600">
              Job name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. Project Manager"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Folder <span className="font-normal text-slate-400">(optional)</span>
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. Office Staff"
              />
            </label>
            <button
              onClick={add}
              disabled={!name.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              Create
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : error ? (
          <p className="text-rose-600">{error}</p>
        ) : jobs.length === 0 ? (
          <p className="text-slate-500">No jobs yet — create the first one.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {jobs.map((j) => (
              <Link
                key={j.id}
                href={`/hire/${j.id}`}
                className="flex items-center justify-between border-b border-slate-100 px-5 py-4 transition last:border-0 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{j.name}</p>
                  <p className="text-xs text-slate-500">
                    {j.folder ? `${j.folder} · ` : ""}
                    {j.candidate_count} candidate{j.candidate_count === 1 ? "" : "s"}
                    {!j.has_target && " · no target yet"}
                  </p>
                </div>
                <span className="text-xs font-semibold text-sky-600">Open →</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
