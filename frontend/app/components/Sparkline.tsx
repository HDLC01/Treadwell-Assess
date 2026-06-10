import { FACTORS, type Factor } from "../lib/api";

// Tiny behavioral-pattern sparkline: A/B/C/D synthesis sigmas on a -3..+3 scale.
export default function Sparkline({
  synthesis,
}: {
  synthesis: Record<Factor, number> | null;
}) {
  if (!synthesis) return <span className="text-xs text-slate-400">—</span>;
  const W = 84;
  const H = 30;
  const xs = [10, 31, 52, 73];
  const y = (sigma: number) => H / 2 - (Math.max(-3, Math.min(3, sigma)) / 3) * (H / 2 - 4);
  const pts = FACTORS.map((f, i) => `${xs[i]},${y(synthesis[f] ?? 0).toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} role="img" aria-label="Behavioral pattern" className="shrink-0">
      <line x1={4} y1={H / 2} x2={W - 4} y2={H / 2} stroke="#e2e8f0" strokeWidth={1} />
      <polyline points={pts} fill="none" stroke="#0f172a" strokeWidth={1.4} />
      {FACTORS.map((f, i) => (
        <circle key={f} cx={xs[i]} cy={y(synthesis[f] ?? 0)} r={2.6} fill="#0f172a" />
      ))}
    </svg>
  );
}
