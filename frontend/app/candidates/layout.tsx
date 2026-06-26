"use client";

import RequireAuth from "../components/RequireAuth";

// Gates the cross-job Candidates directory behind sign-in, same as /hire.
export default function CandidatesLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
