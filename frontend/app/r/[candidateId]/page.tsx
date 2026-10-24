"use client";

import { use, useEffect, useState } from "react";
import {
  ApiError,
  getPublicReport,
  publicReportPdfUrl,
  type CandidateReport,
} from "../../lib/api";
import Stars from "../../components/Stars";
import FactorBars from "../../components/FactorBars";
import RadarChart from "../../components/RadarChart";
import CognitiveGauge from "../../components/CognitiveGauge";
import ArchetypeIcon from "../../components/ArchetypeIcon";
import { btnSecondary } from "../../lib/ui";

const FIT_BADGE: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  low: "bg-rose-100 text-rose-700",
};

// Section shell — identical rhythm to the employer report (eyebrow row with a
// numbered marker + title + optional trailing slot over a hairline, then body).
// `print:break-inside-avoid` keeps a section from splitting across PDF pages.
function Section({
  step,
  title,
  trailing,
  children,
}: {
  step: number;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:mt-4 print:break-inside-avoid print:shadow-none sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-[11px] font-bold tabular-nums text-slate-500">
            {step}
          </span>
          <h2 className="text-sm font-bold tracking-tight text-slate-800">{title}</h2>
        </div>
        {trailing}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

// Public, no-login candidate report — opened by URL (/r/<candidateId>). Renders
// the same content the employer candidate-detail page shows, reusing the exact
// same report components, but with its own minimal public chrome (no AppHeader,
// no RequireAuth). Backed by the public GET /api/report/{id} endpoint.
export default function PublicReportPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = use(params);
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getPublicReport(candidateId)
      .then(setReport)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(true);
        } else {
          setError(e instanceof ApiError ? e.message : "Could not load this report.");
        }
      });
  }, [candidateId]);

  if (notFound) {
    return (
      <Frame>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-5xl font-extrabold tracking-tight text-slate-300">404</p>
          <h1 className="mt-3 text-lg font-bold text-slate-800">Report not found</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            This report link is invalid or the candidate no longer exists.
          </p>
        </div>
      </Frame>
    );
  }

  if (error) {
    return (
      <Frame>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
              <circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" />
            </svg>
            {error}
          </p>
        </div>
      </Frame>
    );
  }

  if (!report) {
    // Skeleton mirrors the real layout so the page doesn't jump when it loads.
    return (
      <Frame>
        <div className="mx-auto max-w-3xl animate-pulse px-4 py-6" aria-hidden>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-3 w-28 rounded bg-slate-100" />
            <div className="mt-2 h-7 w-56 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-40 rounded bg-slate-100" />
          </div>
          <div className="mt-5 h-64 rounded-xl border border-slate-200 bg-white shadow-sm" />
          <div className="mt-5 h-36 rounded-xl border border-slate-200 bg-white shadow-sm" />
        </div>
        <span className="sr-only">Loading candidate report…</span>
      </Frame>
    );
  }

  const { candidate, job, behavioral, cognitive } = report;
  const first = candidate.full_name?.trim().split(/\s+/)[0] || "this candidate";

  return (
    <Frame>
      <div className="mx-auto max-w-3xl px-4 py-6 print:py-0">
        {/* Report header — reads like the masthead of a one-page deliverable. */}
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600">Candidate report</p>
              <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-slate-900">
                {candidate.full_name}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
                <span className="font-medium text-slate-600">{job.name}</span>
                {candidate.email && (
                  <>
                    <span aria-hidden className="text-slate-300">·</span>
                    <span className="truncate">{candidate.email}</span>
                  </>
                )}
              </p>
            </div>
            {/* Download hides on print — it isn't part of the deliverable. */}
            <div className="flex items-center gap-2 print:hidden">
              <a href={publicReportPdfUrl(candidateId)} className={btnSecondary}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
                </svg>
                Download PDF
              </a>
            </div>
          </div>
        </header>

        {/* Behavioral */}
        <Section
          step={1}
          title="Behavioral fit"
          trailing={
            behavioral ? (
              <div className="flex items-center gap-2">
                <Stars value={behavioral.fit_stars} />
                {behavioral.fit_stars != null && (
                  <span className="text-sm font-bold tabular-nums text-slate-700">
                    {behavioral.fit_stars.toFixed(1)}
                    <span className="font-medium text-slate-400"> / 5</span>
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )
          }
        >
          {behavioral ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Reference profile leads as the hero of the section. */}
                {behavioral.reference_profile && (
                  <div className="order-1 flex flex-col rounded-lg border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600">Reference profile</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-sky-100">
                        <ArchetypeIcon slug={behavioral.reference_profile.slug} size={40} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xl font-extrabold leading-tight tracking-tight text-slate-900">
                          {behavioral.reference_profile.name}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-sky-700">{behavioral.reference_profile.tagline}</p>
                      </div>
                    </div>
                    {behavioral.reference_profile.description && (
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {behavioral.reference_profile.description}
                      </p>
                    )}
                  </div>
                )}
                <div className="order-2 flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="self-start text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    DISC fingerprint
                  </p>
                  <RadarChart factors={behavioral.factors} />
                </div>
              </div>

              {behavioral.narrative && (
                <div className="mt-6 flex flex-col gap-6 border-t border-slate-100 pt-6">
                  {behavioral.narrative.summary && (
                    <p className="text-[15px] leading-relaxed text-slate-700">{behavioral.narrative.summary}</p>
                  )}
                  {behavioral.narrative.strongest.length > 0 && (
                    <Bullets title="Strongest behaviors" items={behavioral.narrative.strongest} dot="bg-slate-800" />
                  )}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Bullets title="Strengths" items={behavioral.narrative.strengths} dot="bg-emerald-500" />
                    <Bullets title="Potential watch-outs" items={behavioral.narrative.watch_outs} dot="bg-amber-500" />
                  </div>
                  <Bullets title={`How to work with ${first}`} items={behavioral.narrative.working_with} dot="bg-sky-500" />
                  {behavioral.narrative.needs && (
                    <div className="rounded-lg border-l-2 border-slate-300 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">What {first} needs</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">{behavioral.narrative.needs}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 border-t border-slate-100 pt-6">
                <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Behavioral pattern</p>
                <FactorBars factors={behavioral.factors} />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">This candidate hasn&apos;t completed the behavioral section yet.</p>
          )}
        </Section>

        {/* Cognitive */}
        <Section
          step={2}
          title="Cognitive"
          trailing={
            cognitive?.fit ? (
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${FIT_BADGE[cognitive.fit] ?? ""}`}>
                {cognitive.fit === "strong" ? "Strong fit" : `${cognitive.fit} fit`}
              </span>
            ) : undefined
          }
        >
          {cognitive ? (
            <>
              <div className="flex flex-wrap items-center gap-6">
                <CognitiveGauge score={cognitive.scaled_score} max={job.scale_max} fit={cognitive.fit} />
                <dl className="flex flex-col gap-3">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Correct</dt>
                    <dd className="text-sm font-semibold tabular-nums text-slate-800">
                      {cognitive.raw_score}
                      <span className="font-normal text-slate-500"> of {cognitive.num_items}</span>
                    </dd>
                  </div>
                  {job.cognitive_target != null && (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Target</dt>
                      <dd className="text-sm font-semibold tabular-nums text-slate-800">
                        {job.cognitive_target}
                        <span className="font-normal text-slate-500"> / {job.scale_max}</span>
                      </dd>
                    </div>
                  )}
                  <span
                    className={`inline-flex w-fit items-center gap-1.5 text-xs font-medium ${
                      cognitive.status === "expired" ? "text-amber-600" : "text-slate-400"
                    }`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                    </svg>
                    {cognitive.status === "expired" ? "Timed out" : "Completed"}
                  </span>
                </dl>
              </div>
              {cognitive.interpretation && (
                <p className="mt-4 border-t border-slate-100 pt-4 text-[15px] leading-relaxed text-slate-700">
                  {cognitive.interpretation}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">Not taken yet.</p>
          )}
        </Section>

        {/* Self-reported skills & software — shown only when the candidate provided any. */}
        {(candidate.skills?.length || candidate.software?.length) ? (
          <Section step={3} title="Skills & software">
            <div className="flex flex-col gap-5">
              {candidate.skills?.length ? <Pills title="Skills" items={candidate.skills} /> : null}
              {candidate.software?.length ? <Pills title="Software" items={candidate.software} /> : null}
            </div>
          </Section>
        ) : null}

        <p className="mt-6 text-center text-[11px] text-slate-400 print:mt-4">
          Independent assessment — not affiliated with The Predictive Index.
        </p>
      </div>
    </Frame>
  );
}

function Bullets({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <ul className="mt-2.5 flex flex-col gap-2">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-slate-700">
            <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
            <span className="leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pills({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {items.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 ring-1 ring-inset ring-sky-200"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// Minimal public chrome — an "Assess" wordmark masthead (NOT the employer
// AppHeader / nav), nothing more. Mirrors how /a stays outside the gated layout.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-4 py-3">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" aria-hidden>
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3.1" fill="#fff" stroke="none" />
            </svg>
          </span>
          <span className="text-sm font-extrabold tracking-tight text-slate-900">Assess</span>
        </div>
      </header>
      {children}
    </div>
  );
}
