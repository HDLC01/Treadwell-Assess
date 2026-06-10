import { Suspense } from "react";
import AssessmentFlow from "./AssessmentFlow";

// Candidate assessment — reached via the shareable link /a?t=<token>.
export default function AssessmentPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading…</div>}>
      <AssessmentFlow />
    </Suspense>
  );
}
