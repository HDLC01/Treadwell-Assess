// Cognitive score as an SVG donut gauge: an arc of score/max, colored by fit,
// with the scaled score in the center.
const FIT_COLOR: Record<string, string> = {
  strong: "#10b981",
  moderate: "#f59e0b",
  low: "#f43f5e",
};

export default function CognitiveGauge({
  score,
  max,
  fit,
  size = 132,
}: {
  score: number;
  max: number;
  fit: string | null;
  size?: number;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, score / max)) : 0;
  const color = (fit && FIT_COLOR[fit]) || "#0284c7";
  const cx = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Cognitive score ${score} of ${max}${fit ? `, ${fit} fit` : ""}`}
      className="shrink-0"
    >
      {/* track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      {/* score arc */}
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${cx} ${cx})`}
        className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out"
      />
      <text
        x={cx}
        y={cx - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={26}
        fontWeight={800}
        className="fill-slate-900 [font-variant-numeric:tabular-nums]"
      >
        {score}
      </text>
      <text
        x={cx}
        y={cx + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        className="fill-slate-500 [font-variant-numeric:tabular-nums]"
      >
        of {max}
      </text>
    </svg>
  );
}
