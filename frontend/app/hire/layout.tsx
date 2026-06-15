"use client";

import RequireAuth from "../components/RequireAuth";

// Gates the entire employer surface (/hire and /hire/[jobId]) behind sign-in.
export default function HireLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
