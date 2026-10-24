"use client";

import { useState } from "react";
import { inputCls } from "../lib/ui";

// Free-text "type-then-Enter" chip input. Pressing Enter or comma commits the
// trimmed value as a chip; Backspace on an empty field removes the last chip;
// blur with text present commits it too. De-duped case-insensitively (first
// wins). Controlled — the parent owns `values`.
export default function ChipInput({
  label,
  values,
  onChange,
  placeholder,
  id,
}: {
  label?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    // De-dupe case-insensitively; the first-added casing wins.
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  };

  const removeAt = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      removeAt(values.length - 1);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 ring-1 ring-inset ring-sky-200"
            >
              {v}
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${v}`}
                className="grid h-4 w-4 flex-none place-items-center rounded-full text-sky-500 transition hover:bg-sky-200/60 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={placeholder}
        className={`${inputCls} w-full`}
      />
    </div>
  );
}
