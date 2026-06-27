"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import NotificationBell from "./NotificationBell";
import AssistantPanel from "./AssistantPanel";

// One shared product nav for every employer page: brand + section links (with an
// active state) on the left, and an account menu on the right. Candidate-facing
// pages (/a) and /login do NOT use this — they have their own minimal chrome.
const NAV = [
  { href: "/hire", label: "Jobs", match: (p: string) => p === "/hire" || p.startsWith("/hire/") },
  { href: "/candidates", label: "Candidates", match: (p: string) => p.startsWith("/candidates") },
  { href: "/reference", label: "Reference", match: (p: string) => p.startsWith("/reference") },
];

function Bullseye() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3.1" fill="#fff" stroke="none" />
      </svg>
    </span>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
        active ? "bg-sky-50 text-sky-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}

export default function AppHeader() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { authEnabled, user, signOut } = useAuth();
  const email = (user?.email || "").toLowerCase();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside-click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link
          href="/hire"
          className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          <Bullseye />
          <span className="text-sm font-extrabold tracking-tight text-slate-900">Treadwell Assess</span>
        </Link>

        {/* desktop nav */}
        <nav className="ml-3 hidden items-center gap-1 sm:flex" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} active={n.match(pathname)} />
          ))}
        </nav>

        <div className="flex-1" />

        {authEnabled && user ? (
          <>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                {email.slice(0, 1).toUpperCase() || "?"}
              </span>
              <span className="hidden max-w-[14rem] truncate sm:inline">{email}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <p className="px-3 py-2 text-xs text-slate-500">
                  Signed in as
                  <span className="mt-0.5 block truncate font-semibold text-slate-800">{email}</span>
                </p>
                <div className="my-1 border-t border-slate-100" />
                <button
                  role="menuitem"
                  onClick={() => signOut().then(() => router.replace("/login"))}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:bg-rose-50"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
            </div>
          </div>
          <AssistantPanel />
          </>
        ) : null}
      </div>

      {/* mobile nav row */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-1.5 sm:hidden" aria-label="Primary">
        {NAV.map((n) => (
          <NavLink key={n.href} href={n.href} label={n.label} active={n.match(pathname)} />
        ))}
      </nav>
    </header>
  );
}
