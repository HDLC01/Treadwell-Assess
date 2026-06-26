import { DISC_LETTER, type FactorScore } from "../lib/api";

const SCALE_TICKS = [-3, -2, -1, 0, 1, 2, 3];

// Per-factor sigma bars for the candidate result: dots for Self / Expected / Synthesis.
// Markers are distinguished by SHAPE as well as color so the chart reads without color.
export default function FactorBars({ factors }: { factors: FactorScore[] }) {
  const pos = (sigma: number) => `${((Math.max(-3, Math.min(3, sigma)) + 3) / 6) * 100}%`;
  const LOW_LABEL: Record<string, [string, string]> = {
    A: ["Collaborative", "Independent"],
    B: ["Reserved", "Sociable"],
    C: ["Fast-paced", "Steady"],
    D: ["Flexible", "Precise"],
  };
  return (
    <div className="flex flex-col gap-6">
      {factors.map((f) => (
        <div key={f.factor}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-sm font-bold text-slate-800">
              ({DISC_LETTER[f.factor]}) {f.name}
            </span>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
              {f.band}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-20 text-right leading-tight">{LOW_LABEL[f.factor][0]}</span>
            <div
              className="relative h-8 flex-1 rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200"
              role="img"
              aria-label={`${f.name}: synthesis ${f.synthesis.toFixed(1)} sigma, self ${f.self.toFixed(
                1,
              )}, expected ${f.self_concept.toFixed(1)}`}
            >
              {SCALE_TICKS.map((t) => (
                <span
                  key={t}
                  className={
                    t === 0
                      ? "absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-400/70"
                      : "absolute top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-300"
                  }
                  style={{ left: pos(t) }}
                />
              ))}
              {/* self-concept (expected) — hollow circle, violet */}
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-violet-500 bg-white shadow-sm"
                style={{ left: pos(f.self_concept) }}
                title={`Expected: ${f.self_concept.toFixed(1)}σ`}
              />
              {/* self (natural) — hollow diamond, emerald */}
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-emerald-500 bg-white shadow-sm"
                style={{ left: pos(f.self) }}
                title={`Self: ${f.self.toFixed(1)}σ`}
              />
              {/* synthesis — solid dot, slate-900 (the headline value) */}
              <span
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 ring-2 ring-white"
                style={{ left: pos(f.synthesis) }}
                title={`Synthesis: ${f.synthesis.toFixed(1)}σ`}
              />
            </div>
            <span className="w-20 leading-tight">{LOW_LABEL[f.factor][1]}</span>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-slate-900" /> Synthesis
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rotate-45 border-2 border-emerald-500 bg-white" /> Self (natural)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-violet-500 bg-white" /> Expected at work
        </span>
      </div>
    </div>
  );
}
