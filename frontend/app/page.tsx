// Landing stub — Phase 1 foundation. The real surfaces land in later phases:
// /a?t=<token>  candidate assessment flow
// /hire         employer Hiring Center (jobs, targets, candidates)
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-slate-100">
      <main className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded bg-sky-500" />
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
            Treadwell Assess
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Hire on evidence, not gut feel.
        </h1>
        <p className="max-w-md text-base leading-relaxed text-slate-400">
          A behavioral and cognitive assessment platform: define the role&apos;s ideal
          behavioral range, send candidates one link, and see who actually fits.
        </p>
        <p className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-500">
          Foundation build — candidate flow and hiring dashboard arrive in the next phases.
        </p>
      </main>
      <footer className="absolute bottom-6 text-[11px] text-slate-600">
        Independent assessment — not affiliated with The Predictive Index.
      </footer>
    </div>
  );
}
