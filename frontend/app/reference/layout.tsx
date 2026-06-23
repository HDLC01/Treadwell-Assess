"use client";

import RequireAuth from "../components/RequireAuth";

// Gates the PI ↔ Archetype reference page behind sign-in, same as /hire.
export default function ReferenceLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
