// 0–5 star rating (halves supported) — overlay trick: amber stars clipped over gray.
export default function Stars({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
  return (
    <span
      className="relative inline-block align-middle leading-none"
      title={`${value.toFixed(1)} / 5`}
      aria-label={`Behavioral fit ${value.toFixed(1)} out of 5`}
    >
      <span className="text-[15px] tracking-tight text-slate-300 select-none">★★★★★</span>
      <span
        className="absolute inset-0 overflow-hidden whitespace-nowrap text-[15px] tracking-tight text-amber-500 select-none"
        style={{ width: `${pct}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}
