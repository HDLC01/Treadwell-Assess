"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { listNotifications, type AssessNotification } from "../lib/api";

// "Seen" is the newest completion timestamp the admin has opened the bell on.
// String compare works on the server's "YYYY-MM-DD HH:MM:SS…" format, so we
// avoid any timezone parsing for the unread count.
const SEEN_KEY = "assess_notif_seen";

function relTime(iso: string): string {
  const t = new Date(iso.replace(" ", "T") + (/[Z+]/.test(iso) ? "" : "Z")).getTime();
  const diff = Date.now() - t;
  if (Number.isNaN(diff)) return iso.slice(0, 10);
  const m = Math.max(0, Math.round(diff / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return iso.slice(0, 10);
}

export default function NotificationBell() {
  const [items, setItems] = useState<AssessNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listNotifications()
      .then((r) => {
        setItems(r.items);
        setSeen(localStorage.getItem(SEEN_KEY) || "");
      })
      .catch(() => { /* non-fatal: just an empty bell */ });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const needsTarget = items.filter((i) => i.kind === "needs_target");
  const completions = items.filter((i) => i.kind === "completion");
  const newCompletions = completions.filter((i) => i.at > seen).length;
  const badge = needsTarget.length + newCompletions;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && completions[0]) {
      localStorage.setItem(SEEN_KEY, completions[0].at);
      setSeen(completions[0].at);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label={badge > 0 ? `Notifications, ${badge} need attention` : "Notifications"}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            Notifications
          </p>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">You&apos;re all caught up.</p>
            ) : (
              <>
                {needsTarget.map((n) => (
                  <Link
                    key={`t-${n.job_id}`}
                    href={`/hire/${n.job_id}`}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className="flex items-start gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-amber-50/60"
                  >
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                        <path d="M12 9v4" /><path d="M12 17h.01" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold">{n.job_name}</span> needs a behavioral target
                      </p>
                      <p className="text-xs text-amber-700">
                        Set one so its {n.candidate_count} candidate{n.candidate_count === 1 ? "" : "s"} can be scored →
                      </p>
                    </div>
                  </Link>
                ))}
                {completions.map((n) => (
                  <Link
                    key={`c-${n.candidate_id}`}
                    href={`/hire/${n.job_id}/candidate/${n.candidate_id}`}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className="flex items-start gap-3 border-b border-slate-50 px-4 py-3 transition last:border-0 hover:bg-slate-50"
                  >
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold">{n.full_name}</span> completed{" "}
                        <span className="text-slate-600">{n.job_name}</span>
                      </p>
                      <p className="text-xs text-slate-400">{relTime(n.at)}</p>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
