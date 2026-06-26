import Link from "next/link";

// One shared brand header for every employer-facing page, so the top of the app
// is identical everywhere. `subtitle` labels the section; `right` holds page
// actions (links, buttons). The mark is a bullseye — on-theme for "Job Target".
export default function AppHeader({
  subtitle,
  right,
}: {
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/hire" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" aria-hidden>
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3.1" fill="#fff" stroke="none" />
            </svg>
          </span>
          <span className="text-sm font-extrabold tracking-tight text-slate-900">Treadwell Assess</span>
          {subtitle && (
            <span className="hidden text-xs font-medium text-slate-400 sm:inline">· {subtitle}</span>
          )}
        </Link>
        {right && <div className="flex items-center gap-3">{right}</div>}
      </div>
    </header>
  );
}
