"use client";

import { useEffect, useRef, useState } from "react";
import {
  askAssistant,
  listAssistantConversations,
  getAssistantConversation,
  deleteAssistantConversation,
  type AssistantConversation,
} from "../lib/api";
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
const CONVO_KEY = "assess_assistant_convo";

function Sparkle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 14 9 20 11 14 13 12 19 10 13 4 11 10 9 Z" />
    </svg>
  );
}

function relTime(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [enter, setEnter] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [vp, setVp] = useState({ w: 1200, h: 800 });
  const [convoId, setConvoId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [convos, setConvos] = useState<AssistantConversation[]>([]);
  const [convoPage, setConvoPage] = useState(1);
  const [convoPages, setConvoPages] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const restored = useRef(false);

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

  // gentle slide-up + fade on open; Escape closes. setState only in rAF/cleanup.
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

  // restore the last conversation the first time the widget opens.
  useEffect(() => {
    if (!open || restored.current) return;
    restored.current = true;
    let saved: string | null = null;
    try { saved = localStorage.getItem(CONVO_KEY); } catch { /* ignore */ }
    if (!saved) return;
    getAssistantConversation(saved)
      .then((c) => { setConvoId(c.id); setMessages(c.messages.map((m) => ({ role: m.role, text: m.text }))); })
      .catch(() => { try { localStorage.removeItem(CONVO_KEY); } catch { /* ignore */ } });
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const persistConvo = (id: string | null) => {
    setConvoId(id);
    try {
      if (id) localStorage.setItem(CONVO_KEY, id);
      else localStorage.removeItem(CONVO_KEY);
    } catch { /* ignore */ }
  };

  const loadConvos = (page = 1) => {
    listAssistantConversations(page)
      .then((r) => { setConvos(r.items); setConvoPage(r.page); setConvoPages(r.total_pages); })
      .catch(() => { setConvos([]); });
  };

  const openHistory = () => { setConfirmDelete(null); setHistoryOpen(true); loadConvos(1); };

  const openConvo = (id: string) => {
    getAssistantConversation(id)
      .then((c) => {
        persistConvo(c.id);
        setMessages(c.messages.map((m) => ({ role: m.role, text: m.text })));
        setHistoryOpen(false);
      })
      .catch(() => loadConvos(convoPage));
  };

  const newChat = () => { setMessages([]); persistConvo(null); setHistoryOpen(false); };

  const removeConvo = (id: string) => {
    deleteAssistantConversation(id)
      .then(() => {
        setConfirmDelete(null);
        if (id === convoId) newChat();
        loadConvos(convoPage);
      })
      .catch(() => setConfirmDelete(null));
  };

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question || loading) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const r = await askAssistant(question, convoId);
      persistConvo(r.conversation_id);
      setMessages((m) => [...m, { role: "assistant", text: r.answer }]);
    } catch {
      setMessages((m) => [...m, { role: "error", text: "Sorry, I couldn't answer that right now. Try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const positioned = pos.x >= 0;

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
            className="flex shrink-0 cursor-grab items-center gap-1.5 border-b border-slate-200 px-3 py-2.5 active:cursor-grabbing"
          >
            <button
              onClick={() => (historyOpen ? setHistoryOpen(false) : openHistory())}
              aria-label="Chat history"
              title="Chat history"
              className={`grid h-7 w-7 cursor-pointer place-items-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${historyOpen ? "bg-sky-50 text-sky-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" />
              </svg>
            </button>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-white">
              <Sparkle className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1 select-none">
              <p className="truncate text-sm font-bold leading-tight text-slate-900">Assistant</p>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-600">Online</span>
              </span>
            </div>
            <button
              onClick={newChat}
              aria-label="New conversation"
              title="New conversation"
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-sky-50 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
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

          {historyOpen ? (
            /* conversation history */
            <div className="flex-1 overflow-y-auto bg-slate-50/60">
              {convos.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-slate-400">No saved conversations yet.</p>
              ) : (
                convos.map((c) => (
                  <div key={c.id} className="group flex items-stretch border-b border-slate-100 hover:bg-white">
                    {confirmDelete === c.id ? (
                      <div className="flex flex-1 items-center justify-between gap-2 px-3 py-2.5">
                        <span className="text-xs text-slate-600">Delete this chat?</span>
                        <span className="flex gap-1.5">
                          <button onClick={() => removeConvo(c.id)} className="cursor-pointer rounded-md bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700">Delete</button>
                          <button onClick={() => setConfirmDelete(null)} className="cursor-pointer rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                        </span>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => openConvo(c.id)} className="min-w-0 flex-1 cursor-pointer px-3 py-2.5 text-left">
                          <p className={`truncate text-sm font-medium ${c.id === convoId ? "text-sky-700" : "text-slate-800"}`}>{c.title || "New chat"}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{relTime(c.updated_at)}</p>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c.id)}
                          aria-label="Delete conversation"
                          title="Delete conversation"
                          className="grid w-9 cursor-pointer place-items-center text-slate-300 opacity-0 transition hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
              {convoPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-3 text-xs text-slate-500">
                  <button disabled={convoPage <= 1} onClick={() => loadConvos(convoPage - 1)} className="cursor-pointer rounded px-2 py-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
                  <span>{convoPage} / {convoPages}</span>
                  <button disabled={convoPage >= convoPages} onClick={() => loadConvos(convoPage + 1)} className="cursor-pointer rounded px-2 py-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}

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
