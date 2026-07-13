"use client";

import { useTimeTracker } from "@/context/TimeTrackerContext";
import { AlertTriangle, Clock } from "lucide-react";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}
function fmtDur(fromIso: string, toIso: string) {
  const mins = Math.max(1, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000));
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

// Shown when a running timer looks forgotten (no check-in for a while — the
// laptop was probably closed). Lets the user count only up to the last activity.
export function TimerCorrection() {
  const { staleInfo, resolveStale, isLoading } = useTimeTracker();
  if (!staleInfo) return null;

  const { startedAt, suggestedEnd, taskTitle } = staleInfo;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" />
      <div className="relative w-full max-w-[420px] rounded-3xl glass-strong border p-5 animate-scale-in"
        style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#F59E0B22" }}>
            <AlertTriangle className="w-5 h-5" style={{ color: "#F59E0B" }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>Běžel ti timer</h3>
            <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Vypadá to, že jsi měl zapnutý časovač i když jsi byl pryč.</p>
          </div>
        </div>

        <div className="rounded-2xl p-3 mb-4 text-[13px]" style={{ background: "var(--bg-subtle)" }}>
          <p className="font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>{taskTitle || "Úkol"}</p>
          <div className="flex items-center gap-2" style={{ color: "var(--text-2)" }}>
            <Clock className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
            Začátek {fmtTime(startedAt)} · poslední aktivita {fmtTime(suggestedEnd)}
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={() => resolveStale("stopAt")} disabled={isLoading}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)" }}>
            <span>Ukončit v {fmtTime(suggestedEnd)}</span>
            <span className="opacity-90">{fmtDur(startedAt, suggestedEnd)}</span>
          </button>
          <button onClick={() => resolveStale("stopNow")} disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-2xl text-[13px] font-semibold border transition-colors hover:bg-[var(--hover)] disabled:opacity-50"
            style={{ borderColor: "var(--border-md)", color: "var(--text-2)" }}>
            Ukončit teď (počítat i tuto dobu)
          </button>
          <button onClick={() => resolveStale("keep")} disabled={isLoading}
            className="w-full px-4 py-2 rounded-2xl text-[12.5px] font-medium transition-colors hover:bg-[var(--hover)] disabled:opacity-50"
            style={{ color: "var(--text-3)" }}>
            Nechat běžet dál
          </button>
        </div>
      </div>
    </div>
  );
}
