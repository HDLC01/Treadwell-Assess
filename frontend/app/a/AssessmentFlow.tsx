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
import { btnPrimary, btnSecondary, inputCls } from "../lib/ui";

// Emerald sibling of the shared primary button — used for the "go" moments
// (start the timed test, finish). Mirrors btnPrimary's focus/disabled states.
const btnPrimaryEmerald =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type Step =
  | "loading"
  | "error"
  | "start"
  | "list1"
  | "list2"
  | "bsubmitting"
  | "cog_intro"
  | "practice"
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
  // practice (untimed warm-up before the real timed test)
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Map<number, number>>(new Map());

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

  // Begin the real timed test (sets the deadline and starts the countdown).
  const startTimedTest = (t?: CognitiveTest) => {
    const test = t ?? cogTestRef.current;
    if (!test) return;
    setCogIdx(0);
    setCogAnswers(new Map());
    submittedRef.current = false;
    setRemaining(test.time_limit_sec);
    setDeadline(Date.now() + test.time_limit_sec * 1000);
    setStep("cog");
    window.scrollTo(0, 0);
  };

  // Load the cognitive test, then run the untimed practice round first (if any).
  const loadCognitive = async () => {
    try {
      const t = await getCognitive(token, candidateId);
      cogTestRef.current = t;
      setCogTest(t);
      setDeadline(null);
      if (t.practice.length > 0) {
        setPracticeIdx(0);
        setPracticeAnswers(new Map());
        setStep("practice");
        window.scrollTo(0, 0);
      } else {
        startTimedTest(t);
      }
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
        <ErrorState message="This link is missing its token. Use the exact link you were sent." />
      </Shell>
    );
  }
  if (step === "loading") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-6 text-center" role="status" aria-live="polite">
          <Spinner />
          <p className="text-sm text-slate-500">Loading your assessment…</p>
        </div>
      </Shell>
    );
  }
  if (step === "error") {
    return (
      <Shell>
        <ErrorState message={error} />
      </Shell>
    );
  }
  if (!meta) return null;

  if (step === "start") {
    return (
      <Shell>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-600">Welcome</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
          {meta.job_name} assessment
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Thanks for taking the time. It&apos;s two short sections and takes about 15 minutes.
          There are no right or wrong answers in the first section — just answer honestly.
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          <li className="flex items-start gap-3">
            <StepBadge n={1} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Word checklists</p>
              <p className="text-sm text-slate-500">
                Untimed, about 6 minutes. Pick every word that applies (at least {meta.min_words} per list).
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <StepBadge n={2} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Cognitive section</p>
              <p className="text-sm text-slate-500">
                A short timed set of problems, with untimed practice first so you know what to expect.
              </p>
            </div>
          </li>
        </ul>
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cand-name" className="text-sm font-semibold text-slate-700">
              Full name
            </label>
            <input
              id="cand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={`${inputCls} w-full`}
              placeholder="Your name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cand-email" className="text-sm font-semibold text-slate-700">
              Email <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="cand-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              className={`${inputCls} w-full`}
              placeholder="you@example.com"
            />
            <p className="text-xs text-slate-400">We&apos;ll only use this to follow up about your application.</p>
          </div>
          <button onClick={begin} disabled={!name.trim()} className={`${btnPrimary} mt-1 w-full py-3 text-sm`}>
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
    const remainingToPick = Math.max(0, meta.min_words - picks.size);
    return (
      <Shell wide>
        <JourneyProgress current={isFirst ? 1 : 2} />
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-600">
            Word checklist · {isFirst ? "1 of 2" : "2 of 2"}
          </p>
          <p className="text-xs font-medium text-slate-500" aria-live="polite">
            <span className="tabular-nums font-bold text-slate-700">{picks.size}</span> selected
          </p>
        </div>
        <h2 className="mt-2 text-lg font-bold leading-snug text-slate-900">{prompt}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Select all that apply — at least {meta.min_words}.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {meta.words.map((w) => {
            const on = picks.has(w.id);
            return (
              <button
                key={w.id}
                aria-pressed={on}
                onClick={() =>
                  setPicks((prev) => {
                    const next = new Set(prev);
                    if (next.has(w.id)) next.delete(w.id);
                    else next.add(w.id);
                    return next;
                  })
                }
                className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 motion-safe:duration-150 ${
                  on
                    ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:bg-sky-50/50"
                }`}
              >
                {on && (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="-ml-0.5 flex-none">
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                )}
                {w.word}
              </button>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          {!enough && (
            <span className="text-center text-xs text-slate-500 sm:text-right">
              Select at least {remainingToPick} more
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
            className={`${btnPrimary} py-3 text-sm sm:px-6`}
          >
            {isFirst ? "Continue" : "Continue to timed section"}
          </button>
        </div>
        <Footnote />
      </Shell>
    );
  }

  if (step === "bsubmitting") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-6 text-center" role="status" aria-live="polite">
          <Spinner />
          <p className="text-sm text-slate-500">Saving your responses…</p>
        </div>
      </Shell>
    );
  }

  if (step === "cog_intro") {
    const mins = Math.round((cogTest?.time_limit_sec ?? 600) / 60);
    return (
      <Shell>
        <JourneyProgress current={3} />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.25em] text-sky-600">Cognitive section</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">A few quick problems</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          We&apos;ll start with a couple of <span className="font-semibold text-slate-900">practice questions</span>{" "}
          (untimed, and they don&apos;t count) so you know exactly what to expect. Then the real
          section <span className="font-semibold text-slate-900">is timed</span> — about {mins} minutes to answer
          as many as you can, a mix of numerical, verbal, and pattern problems.
        </p>
        <ul className="mt-5 flex flex-col gap-2.5 text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <CheckDot />
            <span>You can skip any question and come back with <span className="font-medium text-slate-700">Back</span>.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckDot />
            <span>It submits automatically when the timer reaches zero.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckDot />
            <span>Find a quiet moment — once the timed test starts, the clock keeps running.</span>
          </li>
        </ul>
        <button onClick={() => void loadCognitive()} className={`${btnPrimary} mt-6 w-full py-3 text-sm sm:w-auto sm:px-6`}>
          Start with practice
        </button>
        <Footnote />
      </Shell>
    );
  }

  if (step === "practice" && cogTest) {
    const item = cogTest.practice[practiceIdx];
    const chosen = practiceAnswers.get(item.id);
    const answered = chosen !== undefined;
    const isLast = practiceIdx === cogTest.practice.length - 1;
    const choose = (i: number) => {
      if (answered) return; // lock after the first pick so the feedback is stable
      setPracticeAnswers((prev) => new Map(prev).set(item.id, i));
    };
    return (
      <Shell wide>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600">
            Practice · {practiceIdx + 1} of {cogTest.practice.length}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4.75a.75.75 0 00-1.5 0v3.5c0 .2.08.39.22.53l2 2a.75.75 0 101.06-1.06l-1.78-1.78V6.75z" />
            </svg>
            Not timed · doesn&apos;t count
          </span>
        </div>
        <h2 className="mt-5 text-lg font-semibold leading-snug text-slate-900">{item.prompt}</h2>
        <div className="mt-4 flex flex-col gap-2.5">
          {item.options.map((opt, i) => {
            const isChosen = chosen === i;
            const isCorrect = i === item.answer;
            let cls = "border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:bg-sky-50/50 focus-visible:ring-sky-500";
            let badge = "border-slate-300 text-slate-500";
            if (answered) {
              if (isCorrect) {
                cls = "border-emerald-500 bg-emerald-50 text-slate-900 focus-visible:ring-emerald-500";
                badge = "border-emerald-500 bg-emerald-500 text-white";
              } else if (isChosen) {
                cls = "border-rose-400 bg-rose-50 text-slate-900 focus-visible:ring-rose-400";
                badge = "border-rose-400 bg-rose-400 text-white";
              } else {
                cls = "border-slate-200 bg-white text-slate-400 focus-visible:ring-slate-400";
                badge = "border-slate-200 text-slate-300";
              }
            } else if (isChosen) {
              cls = "border-sky-600 bg-sky-50 text-slate-900 focus-visible:ring-sky-500";
              badge = "border-sky-600 bg-sky-600 text-white";
            }
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered}
                className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-default motion-safe:duration-150 ${cls}`}
              >
                <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[11px] font-bold transition ${badge}`}>
                  {answered && isCorrect ? (
                    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                  ) : answered && isChosen ? (
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                      <path d="M5 5l10 10M15 5L5 15" />
                    </svg>
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
        <div className="mt-3 min-h-[1.25rem]" aria-live="polite">
          {answered && (
            <p className={`text-sm font-semibold ${chosen === item.answer ? "text-emerald-700" : "text-rose-700"}`}>
              {chosen === item.answer
                ? "Correct — that's the idea."
                : `Not quite — the answer is ${String.fromCharCode(65 + item.answer)}.`}
            </p>
          )}
        </div>
        <div className="mt-7 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          {!answered && (
            <span className="text-center text-xs text-slate-500 sm:text-right">Pick an answer to see how it works</span>
          )}
          {isLast ? (
            <button onClick={() => startTimedTest()} className={`${btnPrimaryEmerald} py-3 text-sm sm:px-6`}>
              Start the timed test
            </button>
          ) : (
            <button
              onClick={() => {
                setPracticeIdx((i) => i + 1);
                window.scrollTo(0, 0);
              }}
              className={`${btnPrimary} py-3 text-sm sm:px-6`}
            >
              Next practice question
            </button>
          )}
        </div>
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
    const answeredCount = cogAnswers.size;
    const choose = (i: number) =>
      setCogAnswers((prev) => new Map(prev).set(item.id, i));
    return (
      <Shell wide>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-600">
              Question {cogIdx + 1} of {cogTest.items.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-400 tabular-nums">{answeredCount} answered</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-bold tabular-nums transition-colors ${
              low ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300 motion-safe:animate-pulse" : "bg-slate-100 text-slate-600"
            }`}
            role="timer"
            aria-label={`Time remaining ${mm} minutes ${ss} seconds`}
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="10" cy="11" r="7" />
              <path d="M10 8v3.2M7.5 2.5h5" />
            </svg>
            {mm}:{ss}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-sky-500 transition-all motion-safe:duration-300"
            style={{ width: `${((cogIdx + 1) / cogTest.items.length) * 100}%` }}
          />
        </div>

        <h2 className="mt-5 text-lg font-semibold leading-snug text-slate-900">{item.prompt}</h2>
        <div className="mt-4 flex flex-col gap-2.5">
          {item.options.map((opt, i) => {
            const on = chosen === i;
            return (
              <button
                key={i}
                aria-pressed={on}
                onClick={() => choose(i)}
                className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 motion-safe:duration-150 ${
                  on
                    ? "border-sky-600 bg-sky-50 text-slate-900 shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:bg-sky-50/50"
                }`}
              >
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[11px] font-bold transition ${
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
            className={`${btnSecondary} py-2.5`}
          >
            Back
          </button>
          {isLast ? (
            <button onClick={() => void submitCog(false)} className={`${btnPrimaryEmerald} py-2.5 sm:px-6`}>
              Finish
            </button>
          ) : (
            <button
              onClick={() => {
                setCogIdx((i) => Math.min(cogTest.items.length - 1, i + 1));
                window.scrollTo(0, 0);
              }}
              className={`${btnPrimary} py-2.5 sm:px-6`}
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
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-6 text-center" role="status" aria-live="polite">
          <Spinner />
          <p className="text-sm text-slate-500">Scoring your assessment…</p>
        </div>
      </Shell>
    );
  }

  // done
  return (
    <Shell wide>
      <div className="flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 motion-safe:animate-[pop_300ms_ease-out]">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">Assessment complete</p>
        <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
          Thanks, {name.split(" ")[0]}!
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Your results have been shared with the hiring team. Here&apos;s a snapshot of your behavioral profile.
        </p>
      </div>

      {result?.reference_profile && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">Your reference profile</p>
          <div className="mt-2 flex items-center gap-4">
            <span className="grid h-14 w-14 flex-none place-items-center rounded-xl bg-white shadow-sm ring-1 ring-sky-100">
              <ArchetypeIcon slug={result.reference_profile.slug} size={44} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-extrabold leading-tight text-slate-900">{result.reference_profile.name}</p>
              <p className="mt-0.5 text-sm font-medium text-sky-700">{result.reference_profile.tagline}</p>
            </div>
          </div>
          {result.reference_profile.description && (
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {result.reference_profile.description}
            </p>
          )}
        </div>
      )}
      {result && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-bold text-slate-800">Your behavioral pattern</p>
          <p className="mt-0.5 text-xs text-slate-400">How you tend to show up across the four factors.</p>
          <div className="my-5 flex justify-center">
            <RadarChart factors={result.factors} />
          </div>
          <FactorBars factors={result.factors} />
        </div>
      )}
      <p className="mt-6 text-center text-sm text-slate-400">
        You can safely close this page.
      </p>
      <Footnote />
    </Shell>
  );
}

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-8 sm:py-10">
      <div className={`mx-auto ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="mb-4 flex items-center justify-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" aria-hidden>
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3.1" fill="#fff" stroke="none" />
            </svg>
          </span>
          <span className="text-sm font-extrabold tracking-tight text-slate-900">Treadwell Assess</span>
        </div>
        <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </main>
      </div>
      <style>{`@keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}`}</style>
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

// A calm step indicator across the candidate journey: 1 Checklists · 2 Cognitive
// · 3 Done. Purely visual orientation — does not drive the step state machine.
function JourneyProgress({ current }: { current: number }) {
  const steps = ["Checklists", "Cognitive", "Done"];
  return (
    <ol className="flex items-center gap-2" aria-label={`Step ${current} of ${steps.length}`}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition ${
                done
                  ? "bg-sky-600 text-white"
                  : active
                    ? "bg-sky-100 text-sky-700 ring-2 ring-sky-500"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? (
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 10.5l4 4 8-9" />
                </svg>
              ) : (
                n
              )}
            </span>
            <span className={`hidden text-xs font-semibold sm:inline ${active ? "text-slate-900" : done ? "text-slate-500" : "text-slate-400"}`}>
              {label}
            </span>
            {n < steps.length && (
              <span className={`h-px flex-1 rounded ${done ? "bg-sky-300" : "bg-slate-200"}`} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-sky-100 text-xs font-extrabold tabular-nums text-sky-700">
      {n}
    </span>
  );
}

function CheckDot() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 flex-none text-sky-500">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 text-sky-500 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center" role="alert">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4.5M12 16h.01" />
        </svg>
      </span>
      <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
      <p className="max-w-sm text-sm leading-relaxed text-slate-600">{message}</p>
    </div>
  );
}
