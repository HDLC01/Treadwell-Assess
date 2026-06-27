"use client";

import { useEffect, useRef, useState } from "react";
import { askAssistant } from "../lib/api";

type Msg = { role: "user" | "assistant" | "error"; text: string };

const SUGGESTIONS = [
  "How many candidates completed this week?",
  "Which jobs still need a target?",
  "How many candidates are in progress?",
];

export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const r = await askAssistant(question);
      setMessages((m) => [...m, { role: "assistant", text: r.answer }]);
    } catch {
      setMessages((m) => [...m, { role: "error", text: "Sorry, I couldn't answer that right now. Try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask the assistant"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3 14 9 20 11 14 13 12 19 10 13 4 11 10 9 Z" />
        </svg>
        <span className="hidden sm:inline">Ask</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Assistant">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-white">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 3 14 9 20 11 14 13 12 19 10 13 4 11 10 9 Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Assistant</p>
                  <p className="text-[11px] text-slate-400">Summaries from your hiring data</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && !loading && (
                <div className="pt-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">Ask about your candidates and jobs</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                    I give summaries and counts. For a candidate&apos;s results, name them — I won&apos;t rank candidates against each other.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50/50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-sky-600 text-white"
                        : m.role === "error"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-100 px-3.5 py-2 text-sm text-slate-400">Thinking…</div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2 border-t border-slate-200 p-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question…"
                aria-label="Ask the assistant a question"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
            <p className="px-4 pb-3 text-center text-[10px] text-slate-400">
              Candidate results stay private — open a report to see them.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
