"use client";

// Self-contained drag + resize hooks for the floating assistant widget.
// Pattern mirrors ARIA's FloatingChat (copied, not imported — Assess is a
// separate system). Drag uses transform: translate3d for compositor-level
// movement; both position and size persist to localStorage and clamp to the
// viewport so the widget is always reachable.

import { useCallback, useEffect, useRef, useState } from "react";

export type Pos = { x: number; y: number };
export type Size = { w: number; h: number };
export type Corner = "nw" | "ne" | "sw" | "se";

/** Make a fixed-position element draggable anywhere on screen. */
export function useDraggable(storageKey: string, initial: () => Pos) {
  const [pos, setPos] = useState<Pos>({ x: -1, y: -1 });
  const posRef = useRef<Pos>({ x: -1, y: -1 });
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ex: 0, ey: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const onStartRef = useRef<(() => void) | null>(null);
  const raf = useRef<number | null>(null);

  const clamp = useCallback((p: Pos): Pos => {
    if (typeof window === "undefined") return p;
    const w = btnRef.current?.offsetWidth ?? 160;
    const h = btnRef.current?.offsetHeight ?? 52;
    const m = 8;
    const maxX = Math.max(m, window.innerWidth - w - m);
    const maxY = Math.max(m, window.innerHeight - h - m);
    return { x: Math.max(m, Math.min(maxX, p.x)), y: Math.max(m, Math.min(maxY, p.y)) };
  }, []);

  const apply = useCallback((p: Pos) => {
    if (btnRef.current) btnRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  }, []);

  // restore + clamp on mount
  useEffect(() => {
    let p = initial();
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const q = JSON.parse(saved);
        if (typeof q?.x === "number" && typeof q?.y === "number") p = q;
      }
    } catch {
      /* ignore */
    }
    p = clamp(p);
    posRef.current = p;
    apply(p);
    const id = requestAnimationFrame(() => setPos(p));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-clamp on viewport change
  useEffect(() => {
    const onResize = () => {
      const n = clamp(posRef.current);
      posRef.current = n;
      setPos(n);
      apply(n);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [clamp, apply]);

  const step = useCallback((cx: number, cy: number) => {
    const d = drag.current;
    const dx = cx - d.sx;
    const dy = cy - d.sy;
    if (!d.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      d.moved = true;
      onStartRef.current?.();
    }
    if (d.moved) {
      const n = clamp({ x: d.ex + dx, y: d.ey + dy });
      posRef.current = n;
      apply(n);
      if (raf.current === null) {
        raf.current = requestAnimationFrame(() => {
          setPos({ ...posRef.current });
          raf.current = null;
        });
      }
    }
  }, [clamp, apply]);

  const finish = useCallback(() => {
    drag.current.active = false;
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
    setPos({ ...posRef.current });
    if (drag.current.moved) {
      try { localStorage.setItem(storageKey, JSON.stringify(posRef.current)); } catch { /* ignore */ }
    }
  }, [storageKey]);

  const begin = useCallback((cx: number, cy: number) => {
    const d = drag.current;
    d.active = true;
    d.moved = false;
    d.sx = cx;
    d.sy = cy;
    d.ex = posRef.current.x;
    d.ey = posRef.current.y;
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    begin(e.clientX, e.clientY);
    const mm = (ev: MouseEvent) => step(ev.clientX, ev.clientY);
    const mu = () => {
      document.removeEventListener("mousemove", mm);
      document.removeEventListener("mouseup", mu);
      finish();
    };
    document.addEventListener("mousemove", mm);
    document.addEventListener("mouseup", mu);
  }, [begin, step, finish]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!e.touches.length) return;
    const t = e.touches[0];
    begin(t.clientX, t.clientY);
    const tm = (ev: TouchEvent) => {
      if (!ev.touches.length) return;
      if (drag.current.moved) ev.preventDefault();
      step(ev.touches[0].clientX, ev.touches[0].clientY);
    };
    const te = () => {
      document.removeEventListener("touchmove", tm);
      document.removeEventListener("touchend", te);
      document.removeEventListener("touchcancel", te);
      finish();
    };
    document.addEventListener("touchmove", tm, { passive: false });
    document.addEventListener("touchend", te);
    document.addEventListener("touchcancel", te);
  }, [begin, step, finish]);

  const wasDrag = useCallback(() => drag.current.moved, []);
  const onDragStart = useCallback((fn: () => void) => { onStartRef.current = fn; }, []);

  return { pos, btnRef, onMouseDown, onTouchStart, wasDrag, onDragStart };
}

/** Resize a panel via a single far-corner grip; size persists + clamps. */
export function useResizable(storageKey: string, defaults: Size, minW = 320, minH = 380) {
  const [size, setSize] = useState<Size>(defaults);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const s = JSON.parse(raw);
          if (typeof s?.w === "number" && typeof s?.h === "number") setSize({ w: s.w, h: s.h });
        }
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [storageKey]);

  const startResize = useCallback((corner: Corner) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const sw = size.w, sh = size.h;
    const west = corner === "nw" || corner === "sw";
    const north = corner === "nw" || corner === "ne";
    let lw = sw, lh = sh, rafId = 0;
    const mm = (ev: MouseEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      let nw = west ? sw - dx : sw + dx;
      let nh = north ? sh - dy : sh + dy;
      const maxW = window.innerWidth - 24;
      const maxH = window.innerHeight - 24;
      nw = Math.max(minW, Math.min(maxW, nw));
      nh = Math.max(minH, Math.min(maxH, nh));
      lw = nw; lh = nh;
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; setSize({ w: lw, h: lh }); });
    };
    const mu = () => {
      document.removeEventListener("mousemove", mm);
      document.removeEventListener("mouseup", mu);
      if (rafId) cancelAnimationFrame(rafId);
      setSize({ w: lw, h: lh });
      try { localStorage.setItem(storageKey, JSON.stringify({ w: lw, h: lh })); } catch { /* ignore */ }
    };
    document.addEventListener("mousemove", mm);
    document.addEventListener("mouseup", mu);
  }, [storageKey, minW, minH, size.w, size.h]);

  return { size, startResize };
}
