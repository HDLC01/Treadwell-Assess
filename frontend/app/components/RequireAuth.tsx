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

  // The "signed in as / sign out" affordance now lives in AppHeader's account
  // menu, so the gate just renders the page once auth passes.
  return <>{children}</>;
}
