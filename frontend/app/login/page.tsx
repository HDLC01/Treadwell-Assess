"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../lib/auth";

function LoginInner() {
  const { ready, authEnabled, allowedDomain, user, signInWithGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const denied = params.get("denied");

  const email = (user?.email || "").toLowerCase();
  const signedIn = !!user && email.endsWith("@" + allowedDomain);

  // Already signed in (or auth disabled in dev) → go straight to the Hiring Center.
  useEffect(() => {
    if (ready && (!authEnabled || signedIn)) router.replace("/hire");
  }, [ready, authEnabled, signedIn, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-slate-100">
      <main className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" aria-hidden>
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3.1" fill="#fff" stroke="none" />
            </svg>
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
            Treadwell Assess
          </span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Hiring Center sign in</h1>
        <p className="text-sm text-slate-400">
          For Treadwell staff. Use your <span className="font-medium text-slate-200">@{allowedDomain}</span>{" "}
          Google account.
        </p>

        {denied && (
          <p className="w-full rounded-lg border border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-300">
            That isn&apos;t a @{allowedDomain} account. Please use your Treadwell Google account.
          </p>
        )}

        <button
          onClick={() => signInWithGoogle()}
          disabled={!ready || !authEnabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6.1C12.2 13.2 17.6 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16z" />
            <path fill="#FBBC05" d="M10.3 28.4c-.5-1.4-.8-2.9-.8-4.4s.3-3 .8-4.4l-7.8-6.1C.9 16.7 0 20.2 0 24s.9 7.3 2.5 10.5l7.8-6.1z" />
            <path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.1-5.5c-2 1.4-4.6 2.2-7.9 2.2-6.4 0-11.8-3.7-13.7-9l-7.8 6.1C6.4 42.6 14.6 48 24 48z" />
          </svg>
          {authEnabled ? "Sign in with Google" : "Sign-in not configured"}
        </button>

        {!authEnabled && ready && (
          <p className="text-xs text-slate-500">
            Auth isn&apos;t configured on this server — the Hiring Center is open.
          </p>
        )}
      </main>
      <footer className="absolute bottom-6 text-[11px] text-slate-600">
        Independent assessment — not affiliated with The Predictive Index.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
