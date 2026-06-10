import type { FactorScore } from "../lib/api";

const SCALE_TICKS = [-3, -2, -1, 0, 1, 2, 3];

// Per-factor sigma bars for the candidate result: dots for Self / Expected / Synthesis.
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
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-800">
              ({f.factor}) {f.name}
            </span>
            <span className="text-xs font-semibold text-sky-700">{f.band}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-20 text-right">{LOW_LABEL[f.factor][0]}</span>
            <div className="relative h-8 flex-1 rounded-full bg-slate-100">
              {SCALE_TICKS.map((t) => (
                <span
                  key={t}
                  className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-slate-300"
                  style={{ left: pos(t) }}
                />
              ))}
              {/* self-concept (expected) — hollow */}
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-violet-500 bg-white"
                style={{ left: pos(f.self_concept) }}
                title={`Expected: ${f.self_concept}`}
              />
              {/* self (natural) — outline square */}
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-emerald-500 bg-white"
                style={{ left: pos(f.self) }}
                title={`Self: ${f.self}`}
              />
              {/* synthesis — solid */}
              <span
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 ring-2 ring-white"
                style={{ left: pos(f.synthesis) }}
                title={`Synthesis: ${f.synthesis}`}
              />
            </div>
            <span className="w-20">{LOW_LABEL[f.factor][1]}</span>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
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
