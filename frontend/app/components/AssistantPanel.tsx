"use client";

import { useEffect, useRef, useState } from "react";
import { askAssistant } from "../lib/api";
import { useDraggable, useResizable, type Corner } from "../lib/useFloating";

type Msg = { role: "user" | "assistant" | "error"; text: string };

const SUGGESTIONS = [
  "Summarize all candidates and what needs my attention",
  "Which jobs still need a target?",
  "How many candidates completed this week?",
];

const LAUNCHER_W = 156;
const LAUNCHER_H = 52;
const GAP = 10;

function Sparkle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 14 9 20 11 14 13 12 19 10 13 4 11 10 9 Z" />
    </svg>
  );
}

export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [enter, setEnter] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [vp, setVp] = useState({ w: 1200, h: 800 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const { pos, btnRef, onMouseDown, onTouchStart, wasDrag } = useDraggable(
    "assess_assistant_pos",
    () => ({ x: (typeof window !== "undefined" ? window.innerWidth : 1200) - LAUNCHER_W - 20, y: (typeof window !== "undefined" ? window.innerHeight : 800) - LAUNCHER_H - 20 }),
  );
  const { size, startResize } = useResizable("assess_assistant_size", { w: 384, h: 520 });

  useEffect(() => {
    const f = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    const id = requestAnimationFrame(f);
    window.addEventListener("resize", f);
    window.addEventListener("orientationchange", f);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", f);
      window.removeEventListener("orientationchange", f);
    };
  }, []);

  // gentle slide-up + fade on open; Escape closes. setState only in rAF/cleanup
  // (never the effect body) to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setEnter(true));
    taRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      setEnter(false);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question || loading) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
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

  const positioned = pos.x >= 0;

  // Panel anchors to the launcher and flips by quadrant so it always lands
  // on-screen; clamped to the viewport regardless of where the launcher sits.
  const launcherRight = pos.x > vp.w / 2;
  const launcherBottom = pos.y > vp.h / 2;
  const panelW = Math.min(size.w, vp.w - 24);
  const panelH = Math.min(size.h, vp.h - 24);
  let left = launcherRight ? pos.x + LAUNCHER_W - panelW : pos.x;
  left = Math.max(12, Math.min(vp.w - panelW - 12, left));
  let top = launcherBottom ? pos.y - panelH - GAP : pos.y + LAUNCHER_H + GAP;
  top = Math.max(12, Math.min(vp.h - panelH - 12, top));
  const corner: Corner = launcherRight ? (launcherBottom ? "nw" : "sw") : (launcherBottom ? "ne" : "se");
  const cornerPos = { nw: "top-0 left-0", ne: "top-0 right-0", sw: "bottom-0 left-0", se: "bottom-0 right-0" }[corner];
  const cornerCursor = corner === "nw" || corner === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize";

  const noDragFromButton = (e: React.MouseEvent | React.TouchEvent) =>
    (e.target as HTMLElement).closest("button, textarea, a, input");

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Assistant"
          style={{ position: "fixed", left, top, width: panelW, height: panelH, zIndex: 50 }}
          className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-[opacity,transform] duration-200 ease-out ${
            enter ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          {/* header — drag handle (clicks on its buttons don't drag) */}
          <div
            onMouseDown={(e) => { if (!noDragFromButton(e)) onMouseDown(e); }}
            onTouchStart={(e) => { if (!noDragFromButton(e)) onTouchStart(e); }}
            className="flex shrink-0 cursor-grab items-center gap-2 border-b border-slate-200 px-3 py-2.5 active:cursor-grabbing"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-white">
              <Sparkle className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1 select-none">
              <p className="text-sm font-bold leading-tight text-slate-900">Assistant</p>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-600">Online</span>
              </span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                aria-label="New conversation"
                title="New conversation"
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-sky-50 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-3">
            {messages.length === 0 && !loading && (
              <div className="pt-3 text-center">
                <p className="text-sm font-semibold text-slate-700">Ask about your candidates and jobs</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                  I give summaries and counts. For a candidate&apos;s results, name them. I won&apos;t rank candidates against each other.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50/60"
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
                  className={`max-w-[85%] whitespace-pre-wrap px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-2xl rounded-br-sm bg-sky-600 text-white"
                      : m.role === "error"
                        ? "rounded-2xl rounded-bl-sm border border-rose-100 bg-rose-50 text-rose-700"
                        : "rounded-2xl rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:300ms]" />
                </span>
                Thinking…
              </div>
            )}
          </div>

          {/* input */}
          <div className="shrink-0 border-t border-slate-200 p-2.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={taRef}
                value={input}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask a question…"
                aria-label="Ask the assistant a question"
                className="max-h-[120px] min-h-[38px] min-w-0 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="grid h-[38px] w-[38px] shrink-0 cursor-pointer place-items-center rounded-lg bg-sky-600 text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 12 3.3 3.1A59.8 59.8 0 0 1 21.5 12 59.8 59.8 0 0 1 3.3 20.9L6 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              Candidate results stay private. Open a report to see them.
            </p>
          </div>

          {/* resize grip — far corner from the launcher */}
          <div
            onMouseDown={startResize(corner)}
            title="Drag to resize"
            className={`absolute ${cornerPos} ${cornerCursor} z-10 grid h-5 w-5 place-items-center text-slate-300 hover:text-sky-500`}
          >
            <svg className="h-3 w-3 pointer-events-none" viewBox="0 0 16 16" fill="none" style={{ transform: corner === "ne" ? "scaleX(-1)" : corner === "sw" ? "scaleY(-1)" : corner === "se" ? "rotate(180deg)" : undefined }}>
              <path d="M1 14 L14 1 M5 14 L14 5 M9 14 L14 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      {/* draggable floating launcher */}
      <button
        ref={btnRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={() => { if (!wasDrag()) setOpen((v) => !v); }}
        aria-label={open ? "Minimize assistant" : "Ask the assistant"}
        aria-expanded={open}
        style={{ position: "fixed", left: 0, top: 0, zIndex: 50, opacity: positioned ? 1 : 0, touchAction: "none" }}
        className="flex h-[52px] cursor-grab select-none items-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 px-4 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-sky-600/30 transition-colors will-change-transform hover:from-sky-600 hover:to-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 active:cursor-grabbing sm:px-5 print:hidden"
      >
        {open ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        ) : (
          <Sparkle />
        )}
        <span className="hidden sm:inline">{open ? "Close" : "Assistant"}</span>
      </button>
    </>
  );
}
