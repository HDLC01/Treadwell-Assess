"use client";

import { AuthProvider } from "./lib/auth";

// Client-side providers wrapped around the whole app. The AuthProvider only
// *gates* nothing by itself — RequireAuth does the gating for employer routes;
// the candidate flow stays public.
export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
