"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTimeTracker, formatElapsed } from "@/context/TimeTrackerContext";
import { Square, Maximize2, PictureInPicture2, GripVertical, Timer } from "lucide-react";

// A small always-visible timer while a task is running. It can be "popped out"
// into a Document Picture-in-Picture window that floats over the whole system
// (Chromium browsers). Where that API is missing (Safari/Firefox) it stays as a
// draggable in-app pill.

interface Dpip { requestWindow(opts: { width?: number; height?: number }): Promise<Window>; }
function getDpip(): Dpip | null {
  if (typeof window === "undefined") return null;
  return (window as any).documentPictureInPicture ?? null;
}

// Copy the app's styles + current theme into a picture-in-picture document.
function cloneStyles(target: Window) {
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    target.document.head.appendChild(node.cloneNode(true));
  });
  const root = document.documentElement;
  const troot = target.document.documentElement;
  const theme = root.getAttribute("data-theme");
  if (theme) troot.setAttribute("data-theme", theme);
  troot.className = root.className;
  target.document.body.style.margin = "0";
  target.document.body.style.background = "transparent";
}

function TimerBody({ variant, onPopOut, onBackToApp }: {
  variant: "pill" | "pip";
  onPopOut?: () => void;
  onBackToApp?: () => void;
}) {
  const { active, elapsed, stop, openFocus, isLoading } = useTimeTracker();
  if (!active) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-[13px]" style={{ color: "var(--text-3)" }}>
        <Timer className="w-4 h-4" /> Žádný běžící časovač
      </div>
    );
  }
  const dpipAvailable = !!getDpip();
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: "var(--bg-card)" }}>
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#22C55E" }} />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#22C55E" }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold leading-none tabular-nums" style={{ color: "var(--text-1)" }}>
          {formatElapsed(elapsed)}
        </p>
        <p className="text-[11.5px] truncate mt-0.5" style={{ color: "var(--text-3)" }}>{active.taskTitle}</p>
      </div>

      {variant === "pill" && dpipAvailable && (
        <button onClick={onPopOut} title="Odepnout nad systém (plovoucí okno)"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--hover)] flex-shrink-0"
          style={{ color: "var(--text-2)" }}>
          <PictureInPicture2 className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={variant === "pip" ? onBackToApp : openFocus}
        title={variant === "pip" ? "Zpět do aplikace" : "Otevřít fokus"}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--hover)] flex-shrink-0"
        style={{ color: "var(--text-2)" }}>
        <Maximize2 className="w-4 h-4" />
      </button>
      <button onClick={() => stop()} disabled={isLoading} title="Zastavit časovač"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex-shrink-0"
        style={{ background: "var(--danger, #ef4444)" }}>
        <Square className="w-3.5 h-3.5" fill="currentColor" />
      </button>
    </div>
  );
}

export function FloatingTimer() {
  const { active } = useTimeTracker();
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  // Restore last pill position.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("timerPillPos");
      if (raw) setPos(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const openPip = useCallback(async () => {
    const dpip = getDpip();
    if (!dpip) return;
    try {
      const w = await dpip.requestWindow({ width: 280, height: 96 });
      cloneStyles(w);
      w.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(w);
    } catch { /* user dismissed / unsupported */ }
  }, []);

  const backToApp = useCallback(() => {
    try { window.focus(); } catch { /* ignore */ }
    pipWindow?.close();
    setPipWindow(null);
  }, [pipWindow]);

  // Close the PiP window automatically when the timer stops.
  useEffect(() => {
    if (!active && pipWindow) { pipWindow.close(); setPipWindow(null); }
  }, [active, pipWindow]);

  // Dragging the in-app pill.
  const onPointerDown = (e: React.PointerEvent) => {
    const start = pos ?? { x: window.innerWidth - 300, y: window.innerHeight - 120 };
    dragRef.current = { dx: e.clientX - start.x, dy: e.clientY - start.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const x = Math.min(Math.max(8, e.clientX - dragRef.current.dx), window.innerWidth - 260);
    const y = Math.min(Math.max(8, e.clientY - dragRef.current.dy), window.innerHeight - 70);
    setPos({ x, y });
  };
  const onPointerUp = () => {
    dragRef.current = null;
    if (pos) { try { localStorage.setItem("timerPillPos", JSON.stringify(pos)); } catch { /* ignore */ } }
  };

  if (!active) return null;

  // While popped out, the PiP window is the timer — render into it, hide the pill.
  if (pipWindow) {
    return createPortal(
      <div style={{ height: "100vh", display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%", borderRadius: 0 }}>
          <TimerBody variant="pip" onBackToApp={backToApp} />
        </div>
      </div>,
      pipWindow.document.body
    );
  }

  return (
    <div
      className="fixed z-40 rounded-2xl border overflow-hidden glass-strong flex items-stretch"
      style={{
        // Default bottom-left (clears the chat bubble at bottom-right and the
        // mobile bottom nav); draggable afterwards.
        left: pos ? pos.x : 16,
        top: pos ? pos.y : undefined,
        bottom: pos ? undefined : 88,
        borderColor: "var(--border-md)",
        boxShadow: "var(--shadow-overlay)",
        width: 260,
      }}
    >
      {/* Drag handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex items-center px-1 cursor-grab active:cursor-grabbing touch-none"
        style={{ color: "var(--text-3)", background: "var(--bg-subtle)" }}
        title="Přesunout"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <TimerBody variant="pill" onPopOut={openPip} />
      </div>
    </div>
  );
}
