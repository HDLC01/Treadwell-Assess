"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

// Gates the employer surface. When auth is disabled (local dev, no Supabase
// keys) it renders children freely. Otherwise: no session → /login; wrong
// domain → sign out + /login?denied=1. Also renders a compact "signed in" bar.
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, authEnabled, allowedDomain, user, signOut } = useAuth();
  const router = useRouter();

  const email = (user?.email || "").toLowerCase();
  const wrongDomain = !!user && !email.endsWith("@" + allowedDomain);

  useEffect(() => {
    if (!ready || !authEnabled) return;
    if (!user) {
      router.replace("/login");
    } else if (wrongDomain) {
      signOut().then(() => router.replace("/login?denied=1"));
    }
  }, [ready, authEnabled, user, wrongDomain, router, signOut]);

  // Decide nothing until the auth state is known — otherwise the employer page
  // would flash (and fire a premature, rejected API call) before redirecting.
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading…
      </div>
    );
  }
  if (authEnabled && (!user || wrongDomain)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <>
      {authEnabled && user && (
        <div className="flex items-center justify-end gap-3 border-b border-slate-800 bg-slate-950 px-4 py-1.5 text-xs text-slate-400">
          <span>
            Signed in as <span className="font-medium text-slate-200">{email}</span>
          </span>
          <button
            onClick={() => signOut().then(() => router.replace("/login"))}
            className="rounded border border-slate-700 px-2 py-0.5 font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      )}
      {children}
    </>
  );
}
