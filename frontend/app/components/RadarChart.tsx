import { DISC_LETTER, type Factor, type FactorScore } from "../lib/api";

// DISC "fingerprint" — a 4-axis radar of the synthesis sigmas, drawn as inline SVG.
// Axes: Dominance (top), Influence (right), Steadiness (bottom), Conscientiousness
// (left) — i.e. D / I / S / C clockwise. Sigma -3..+3 maps to center..edge.
const DIRS: Record<Factor, [number, number]> = {
  A: [0, -1], // Dominance — top
  B: [1, 0], // Influence — right
  C: [0, 1], // Steadiness — bottom
  D: [-1, 0], // Conscientiousness — left
};
const ORDER: Factor[] = ["A", "B", "C", "D"];

export default function RadarChart({
  factors,
  size = 240,
}: {
  factors: FactorScore[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 34;
  const byKey = new Map(factors.map((f) => [f.factor as Factor, f]));

  const at = (f: Factor, r: number): [number, number] => [
    cx + DIRS[f][0] * r,
    cy + DIRS[f][1] * r,
  ];
  const rScale = (sigma: number) => ((Math.max(-3, Math.min(3, sigma)) + 3) / 6) * maxR;
  const poly = (r: (f: Factor) => number) =>
    ORDER.map((f) => at(f, r(f)).map((n) => n.toFixed(1)).join(",")).join(" ");

  const grid = [0.25, 0.5, 0.75, 1].map((frac) => poly(() => frac * maxR));
  const dataPoly = poly((f) => rScale(byKey.get(f)?.synthesis ?? 0));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="DISC behavioral fingerprint"
      className="mx-auto"
    >
      {/* grid rings */}
      {grid.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill={i === 1 ? "#f1f5f9" : "none"}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      ))}
      {/* axes */}
      {ORDER.map((f) => {
        const [x, y] = at(f, maxR);
        return <line key={f} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth={1} />;
      })}
      {/* data polygon */}
      <polygon points={dataPoly} fill="rgba(2,132,199,0.18)" stroke="#0284c7" strokeWidth={2} />
      {/* data vertices */}
      {ORDER.map((f) => {
        const [x, y] = at(f, rScale(byKey.get(f)?.synthesis ?? 0));
        return <circle key={f} cx={x} cy={y} r={3.5} fill="#0284c7" />;
      })}
      {/* axis labels: DISC letter */}
      {ORDER.map((f) => {
        const [x, y] = at(f, maxR + 16);
        return (
          <text
            key={f}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-700"
            fontSize={13}
            fontWeight={800}
          >
            {DISC_LETTER[f]}
          </text>
        );
      })}
    </svg>
  );
}
