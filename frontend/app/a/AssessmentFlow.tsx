"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ApiError,
  getAssessment,
  getCognitive,
  startAssessment,
  submitBehavioral,
  submitCognitive,
  type AssessmentMeta,
  type BehavioralResult,
  type CognitiveTest,
} from "../lib/api";
import FactorBars from "../components/FactorBars";
import RadarChart from "../components/RadarChart";
import ArchetypeIcon from "../components/ArchetypeIcon";

type Step =
  | "loading"
  | "error"
  | "start"
  | "list1"
  | "list2"
  | "bsubmitting"
  | "cog_intro"
  | "cog"
  | "csubmitting"
  | "done";

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

  // cognitive
  const [cogTest, setCogTest] = useState<CognitiveTest | null>(null);
  const [cogIdx, setCogIdx] = useState(0);
  const [cogAnswers, setCogAnswers] = useState<Map<number, number>>(new Map());
  const [remaining, setRemaining] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);

  // refs so the countdown's auto-submit always reads the latest answers/test once
  const cogTestRef = useRef<CognitiveTest | null>(null);
  const answersRef = useRef(cogAnswers);
  const submittedRef = useRef(false);
  useEffect(() => {
    answersRef.current = cogAnswers;
  }, [cogAnswers]);

  useEffect(() => {
    if (!token) return; // handled in render — nothing to fetch
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

  // behavioral submit -> on to the cognitive section (always administered)
  const submitBehavioralStep = async () => {
    setStep("bsubmitting");
    try {
      const r = await submitBehavioral(token, candidateId, [...picks1], [...picks2]);
      setResult(r);
      setStep("cog_intro");
      window.scrollTo(0, 0);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Could not submit your answers.");
      setStep("error");
    }
  };

  const startCognitive = async () => {
    try {
      const t = await getCognitive(token);
      cogTestRef.current = t;
      setCogTest(t);
      setCogIdx(0);
      setCogAnswers(new Map());
      submittedRef.current = false;
      setDeadline(Date.now() + t.time_limit_sec * 1000);
      setRemaining(t.time_limit_sec);
      setStep("cog");
      window.scrollTo(0, 0);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Could not load the cognitive test.");
      setStep("error");
    }
  };

  const submitCog = useCallback(
    async (expired: boolean) => {
      const test = cogTestRef.current;
      if (submittedRef.current || !test) return;
      submittedRef.current = true;
      setStep("csubmitting");
      const answers = test.items.map((it) => ({
        item_id: it.id,
        chosen: answersRef.current.has(it.id) ? (answersRef.current.get(it.id) as number) : null,
      }));
      try {
        await submitCognitive(token, candidateId, answers, expired);
        setStep("done");
        window.scrollTo(0, 0);
      } catch (e: unknown) {
        setError(e instanceof ApiError ? e.message : "Could not submit the cognitive test.");
        setStep("error");
      }
    },
    [token, candidateId],
  );

  // countdown — ticks while on the cognitive step; auto-submits at zero
  useEffect(() => {
    if (step !== "cog" || deadline == null) return;
    const tick = () => {
      const rem = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) void submitCog(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, deadline, submitCog]);

  if (!token) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-slate-600">
          This link is missing its token. Use the exact link you were sent.
        </p>
      </Shell>
    );
  }
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
          Assessment — {meta.job_name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Two short sections: a behavioral word checklist (untimed, ~6 minutes) and a
          brief timed cognitive section. There are no right or wrong answers in the first
          section. Pick every word that applies (at least {meta.min_words} per list).
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
                void submitBehavioralStep();
              }
            }}
            disabled={!enough}
            className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-bold text-white transition enabled:hover:bg-sky-700 disabled:opacity-40"
          >
            {isFirst ? "Continue" : "Continue to timed section"}
          </button>
        </div>
        <Footnote />
      </Shell>
    );
  }

  if (step === "bsubmitting") {
    return <Shell><p className="text-slate-500">Saving your responses…</p></Shell>;
  }

  if (step === "cog_intro") {
    const mins = Math.round((cogTest?.time_limit_sec ?? 600) / 60);
    return (
      <Shell>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-600">Timed section</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">A few quick problems</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          This part <span className="font-semibold">is timed</span>. You&apos;ll have about{" "}
          {mins} minutes to answer as many questions as you can — a mix of numerical,
          verbal, and pattern problems. Work quickly and accurately; you can skip a
          question and it will be marked unanswered. The test submits automatically when
          time runs out.
        </p>
        <button
          onClick={() => void startCognitive()}
          className="mt-6 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
        >
          Begin the timed section
        </button>
        <Footnote />
      </Shell>
    );
  }

  if (step === "cog" && cogTest) {
    const item = cogTest.items[cogIdx];
    const chosen = cogAnswers.get(item.id);
    const isLast = cogIdx === cogTest.items.length - 1;
    const low = remaining <= 60;
    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");
    const choose = (i: number) =>
      setCogAnswers((prev) => new Map(prev).set(item.id, i));
    return (
      <Shell wide>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-600">
            Question {cogIdx + 1} of {cogTest.items.length}
          </p>
          <span
            className={`rounded-md px-2.5 py-1 font-mono text-sm font-bold tabular-nums ${
              low ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
            }`}
            aria-label="time remaining"
          >
            {mm}:{ss}
          </span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded bg-slate-100">
          <div
            className="h-full bg-sky-500 transition-all"
            style={{ width: `${((cogIdx + 1) / cogTest.items.length) * 100}%` }}
          />
        </div>

        <h2 className="mt-5 text-lg font-semibold leading-snug text-slate-900">{item.prompt}</h2>
        <div className="mt-4 flex flex-col gap-2">
          {item.options.map((opt, i) => {
            const on = chosen === i;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                  on
                    ? "border-sky-600 bg-sky-50 text-slate-900"
                    : "border-slate-300 bg-white text-slate-700 hover:border-sky-400"
                }`}
              >
                <span
                  className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[11px] font-bold ${
                    on ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 text-slate-500"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setCogIdx((i) => Math.max(0, i - 1));
              window.scrollTo(0, 0);
            }}
            disabled={cogIdx === 0}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition enabled:hover:bg-slate-50 disabled:opacity-40"
          >
            Back
          </button>
          {isLast ? (
            <button
              onClick={() => void submitCog(false)}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Finish
            </button>
          ) : (
            <button
              onClick={() => {
                setCogIdx((i) => Math.min(cogTest.items.length - 1, i + 1));
                window.scrollTo(0, 0);
              }}
              className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
            >
              Next
            </button>
          )}
        </div>
        <Footnote />
      </Shell>
    );
  }

  if (step === "csubmitting") {
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
          <div className="mt-1 flex items-center gap-3">
            <ArchetypeIcon slug={result.reference_profile.slug} size={52} />
            <p className="text-xl font-extrabold text-slate-900">{result.reference_profile.name}</p>
          </div>
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
          <div className="mb-4 flex justify-center">
            <RadarChart factors={result.factors} />
          </div>
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
