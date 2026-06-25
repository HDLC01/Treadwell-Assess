"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  emailReport,
  fetchReportPdf,
  getCandidateReport,
  type CandidateReport,
} from "../../../../lib/api";
import Stars from "../../../../components/Stars";
import FactorBars from "../../../../components/FactorBars";
import RadarChart from "../../../../components/RadarChart";
import CognitiveGauge from "../../../../components/CognitiveGauge";
import ArchetypeIcon from "../../../../components/ArchetypeIcon";

const FIT_BADGE: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  low: "bg-rose-100 text-rose-700",
};

export default function CandidatePage({
  params,
}: {
  params: Promise<{ jobId: string; candidateId: string }>;
}) {
  const { jobId, candidateId } = use(params);
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getCandidateReport(candidateId)
      .then((r) => {
        setReport(r);
        setEmailTo(r.candidate.email ?? "");
      })
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Could not load this candidate."),
      );
  }, [candidateId]);

  const download = async () => {
    setDownloading(true);
    setNote(null);
    try {
      const blob = await fetchReportPdf(candidateId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `treadwell-report-${(report?.candidate.full_name ?? "candidate").replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setNote({ ok: false, text: e instanceof ApiError ? e.message : "Could not download the PDF." });
    } finally {
      setDownloading(false);
    }
  };

  const send = async () => {
    setSending(true);
    setNote(null);
    try {
      const r = await emailReport(candidateId, emailTo.trim());
      setNote({ ok: true, text: `Report emailed to ${r.sent_to}.` });
      setEmailOpen(false);
    } catch (e: unknown) {
      setNote({ ok: false, text: e instanceof ApiError ? e.message : "Could not send the email." });
    } finally {
      setSending(false);
    }
  };

  if (error) {
    return <Frame jobId={jobId}><p className="p-8 text-rose-600">{error}</p></Frame>;
  }
  if (!report) {
    return <Frame jobId={jobId}><p className="p-8 text-slate-500">Loading…</p></Frame>;
  }

  const { candidate, job, behavioral, cognitive } = report;
  const first = candidate.full_name?.trim().split(/\s+/)[0] || "this candidate";

  return (
    <Frame jobId={jobId}>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{candidate.full_name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {job.name}
              {candidate.email ? ` · ${candidate.email}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={download}
              disabled={downloading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {downloading ? "Preparing…" : "Download PDF"}
            </button>
            <button
              onClick={() => { setEmailOpen((v) => !v); setNote(null); }}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
            >
              Email report
            </button>
          </div>
        </div>

        {emailOpen && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <input
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              type="email"
              placeholder="recipient@example.com"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={send}
              disabled={sending || emailTo.trim().length < 3}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        )}
        {note && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              note.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {note.text}
          </p>
        )}

        {/* Behavioral */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Behavioral Fit</h2>
            {behavioral ? <Stars value={behavioral.fit_stars} /> : <span className="text-xs text-slate-400">—</span>}
          </div>
          {behavioral ? (
            <>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="self-start text-xs font-bold uppercase tracking-wider text-slate-500">
                    DISC fingerprint
                  </p>
                  <RadarChart factors={behavioral.factors} />
                </div>
                {behavioral.reference_profile && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-sky-600">Reference Profile</p>
                    <div className="mt-1 flex items-center gap-3">
                      <ArchetypeIcon slug={behavioral.reference_profile.slug} size={48} />
                      <p className="text-lg font-extrabold text-slate-900">
                        {behavioral.reference_profile.name}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-700">{behavioral.reference_profile.tagline}</p>
                    {behavioral.reference_profile.description && (
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {behavioral.reference_profile.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {behavioral.narrative && (
                <div className="mt-5 flex flex-col gap-5 border-t border-slate-100 pt-5">
                  {behavioral.narrative.summary && (
                    <p className="text-sm leading-relaxed text-slate-700">{behavioral.narrative.summary}</p>
                  )}
                  {behavioral.narrative.strongest.length > 0 && (
                    <Bullets title="Strongest behaviors" items={behavioral.narrative.strongest} dot="bg-slate-800" />
                  )}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Bullets title="Strengths" items={behavioral.narrative.strengths} dot="bg-emerald-500" />
                    <Bullets title="Potential watch-outs" items={behavioral.narrative.watch_outs} dot="bg-amber-500" />
                  </div>
                  <Bullets title={`How to work with ${first}`} items={behavioral.narrative.working_with} dot="bg-sky-500" />
                  {behavioral.narrative.needs && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">What {first} needs</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">{behavioral.narrative.needs}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-5">
                <p className="mb-4 text-sm font-bold text-slate-800">Behavioral pattern</p>
                <FactorBars factors={behavioral.factors} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">This candidate hasn&apos;t completed the behavioral section yet.</p>
          )}
        </section>

        {/* Cognitive */}
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-800">Cognitive</h2>
          {cognitive ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
                <CognitiveGauge score={cognitive.scaled_score} max={job.scale_max} fit={cognitive.fit} />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {cognitive.fit && (
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${FIT_BADGE[cognitive.fit] ?? ""}`}>
                        {cognitive.fit === "strong" ? "Strong fit" : `${cognitive.fit} fit`}
                      </span>
                    )}
                    {job.cognitive_target != null && (
                      <span className="text-xs text-slate-500">Target: {job.cognitive_target} / {job.scale_max}</span>
                    )}
                  </div>
                  <span className="text-slate-600">
                    {cognitive.raw_score} of {cognitive.num_items} correct
                  </span>
                  <span className="text-xs text-slate-400">
                    {cognitive.status === "expired" ? "timed out" : "completed"}
                  </span>
                </div>
              </div>
              {cognitive.interpretation && (
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{cognitive.interpretation}</p>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Not taken yet.</p>
          )}
        </section>
      </div>
    </Frame>
  );
}

function Bullets({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700">
            <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span className="leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Frame({ jobId, children }: { jobId: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <Link href={`/hire/${jobId}`} className="text-xs font-semibold text-sky-600 hover:underline">
          ‹ Back to candidates
        </Link>
      </div>
      {children}
    </div>
  );
}
