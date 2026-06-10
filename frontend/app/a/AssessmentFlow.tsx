"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ApiError,
  getAssessment,
  startAssessment,
  submitBehavioral,
  type AssessmentMeta,
  type BehavioralResult,
} from "../lib/api";
import FactorBars from "../components/FactorBars";

type Step = "loading" | "error" | "start" | "list1" | "list2" | "submitting" | "done";

export default function AssessmentFlow() {
  const params = useSearchParams();
  const token = params.get("t") || "";

  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<AssessmentMeta | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [picks1, setPicks1] = useState<Set<number>>(new Set());
  const [picks2, setPicks2] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<BehavioralResult | null>(null);

  useEffect(() => {
    if (!token) {
      setError("This link is missing its token. Use the exact link you were sent.");
      setStep("error");
      return;
    }
    getAssessment(token)
      .then((m) => {
        setMeta(m);
        setStep("start");
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : "Could not load the assessment.");
        setStep("error");
      });
  }, [token]);

  const begin = async () => {
    if (!name.trim()) return;
    try {
      const r = await startAssessment(token, name.trim(), email.trim());
      setCandidateId(r.candidate_id);
      setStep("list1");
      window.scrollTo(0, 0);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Could not start the assessment.");
      setStep("error");
    }
  };

  const submit = async () => {
    setStep("submitting");
    try {
      const r = await submitBehavioral(token, candidateId, [...picks1], [...picks2]);
      setResult(r);
      setStep("done");
      window.scrollTo(0, 0);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Could not submit your answers.");
      setStep("error");
    }
  };

  if (step === "loading") {
    return <Shell><p className="text-slate-500">Loading your assessment…</p></Shell>;
  }
  if (step === "error") {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-slate-600">{error}</p>
      </Shell>
    );
  }
  if (!meta) return null;

  if (step === "start") {
    return (
      <Shell>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-600">Treadwell Assess</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
          Behavioral assessment — {meta.job_name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          You&apos;ll see the same list of words twice, with two different questions. There are no
          right or wrong answers and it isn&apos;t timed — most people finish in about 6 minutes.
          Pick every word that applies (at least {meta.min_words} per list).
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-700">
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              placeholder="Your name"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Email <span className="font-normal text-slate-400">(optional)</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </label>
          <button
            onClick={begin}
            disabled={!name.trim()}
            className="mt-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition enabled:hover:bg-sky-700 disabled:opacity-40"
          >
            Start the assessment
          </button>
        </div>
        <Footnote />
      </Shell>
    );
  }

  if (step === "list1" || step === "list2") {
    const isFirst = step === "list1";
    const picks = isFirst ? picks1 : picks2;
    const setPicks = isFirst ? setPicks1 : setPicks2;
    const prompt = meta.prompts[isFirst ? 0 : 1];
    const enough = picks.size >= meta.min_words;
    return (
      <Shell wide>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-600">
            Checklist {isFirst ? "1 of 2" : "2 of 2"}
          </p>
          <p className="text-xs text-slate-500">{picks.size} selected</p>
        </div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">{prompt}</h2>
        <p className="mt-1 text-xs text-slate-500">
          Select all that apply — at least {meta.min_words}.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {meta.words.map((w) => {
            const on = picks.has(w.id);
            return (
              <button
                key={w.id}
                onClick={() =>
                  setPicks((prev) => {
                    const next = new Set(prev);
                    if (next.has(w.id)) next.delete(w.id);
                    else next.add(w.id);
                    return next;
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  on
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-sky-400"
                }`}
              >
                {w.word}
              </button>
            );
          })}
        </div>
        <div className="mt-8 flex items-center justify-end gap-3">
          {!enough && (
            <span className="text-xs text-slate-500">
              Select at least {meta.min_words - picks.size} more
            </span>
          )}
          <button
            onClick={() => {
              if (isFirst) {
                setStep("list2");
                window.scrollTo(0, 0);
              } else {
                void submit();
              }
            }}
            disabled={!enough}
            className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-bold text-white transition enabled:hover:bg-sky-700 disabled:opacity-40"
          >
            {isFirst ? "Continue" : "Finish"}
          </button>
        </div>
        <Footnote />
      </Shell>
    );
  }

  if (step === "submitting") {
    return <Shell><p className="text-slate-500">Scoring your assessment…</p></Shell>;
  }

  // done
  return (
    <Shell wide>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">
        Assessment complete
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Thanks, {name.split(" ")[0]}!</h1>
      {result?.reference_profile && (
        <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-600">Your profile</p>
          <p className="mt-1 text-xl font-extrabold text-slate-900">{result.reference_profile.name}</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{result.reference_profile.tagline}</p>
          {result.reference_profile.description && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {result.reference_profile.description}
            </p>
          )}
        </div>
      )}
      {result && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-4 text-sm font-bold text-slate-800">Your behavioral pattern</p>
          <FactorBars factors={result.factors} />
        </div>
      )}
      <p className="mt-6 text-sm text-slate-500">
        Your results have been shared with the hiring team. You can close this page.
      </p>
      <Footnote />
    </Shell>
  );
}

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <main
        className={`mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        {children}
      </main>
    </div>
  );
}

function Footnote() {
  return (
    <p className="mt-8 text-center text-[10px] text-slate-400">
      Independent assessment — not affiliated with The Predictive Index.
    </p>
  );
}
