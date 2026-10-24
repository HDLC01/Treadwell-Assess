"use client";

import { btnSecondary, card } from "../lib/ui";

// Reusable confirm/warning modal. Mirrors the inline delete dialog already used
// on the Hiring Center (frontend/app/hire/page.tsx): full-screen scrim, a
// `card` panel, click-outside / Cancel to dismiss, and a `busy` lock during the
// async action. House rule: every destructive or mutating action confirms here
// first. Pass `children` to host a small form (e.g. the candidate edit fields).
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busyLabel,
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  message?: React.ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  const confirmCls = destructive
    ? "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    : "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => !busy && onCancel()}
    >
      <div className={`w-full max-w-sm p-5 ${card}`} onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        {message && <div className="mt-2 text-sm leading-relaxed text-slate-600">{message}</div>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className={btnSecondary}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={busy || confirmDisabled} className={confirmCls}>
            {busy ? busyLabel ?? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
