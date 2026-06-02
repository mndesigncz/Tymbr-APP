"use client";

import { useTimeTracker, formatElapsed } from "@/context/TimeTrackerContext";
import { Square } from "lucide-react";

export function TimeTracker() {
  const { active, elapsed, openFocus, stop } = useTimeTracker();

  if (!active) return null;

  return (
    <div className="mx-2 mb-3 rounded-2xl p-3.5 border"
      style={{ background: "var(--bg-card)", borderColor: "#22C55E30", boxShadow: "var(--shadow-sm)" }}>
      <button onClick={openFocus} className="w-full text-left">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#22C55E" }}>
            Pracuji
          </span>
        </div>
        <p className="text-[13px] font-semibold line-clamp-1 mb-2.5" style={{ color: "var(--text-1)" }}>
          {active.taskTitle}
        </p>
      </button>
      <div className="flex items-center justify-between">
        <span className="text-[20px] font-bold tabular-nums tracking-tight" style={{ color: "var(--text-1)" }}>
          {formatElapsed(elapsed)}
        </span>
        <button
          onClick={stop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all hover:opacity-80"
          style={{ background: "#EF444415", color: "#EF4444" }}
        >
          <Square className="w-3 h-3 fill-current" />
          Stop
        </button>
      </div>
    </div>
  );
}
