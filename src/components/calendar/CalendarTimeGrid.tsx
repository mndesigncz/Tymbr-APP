"use client";

import { useEffect, useRef } from "react";
import {
  format, startOfDay, endOfDay, addDays, isToday, isSameDay,
  differenceInMinutes,
} from "date-fns";
import { cs } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { isOverdue } from "@/lib/utils";
import type { CalendarEvent, Task, Vacation } from "@/types";

const HOUR_HEIGHT = 48; // px per hour
const DAY_HEIGHT = HOUR_HEIGHT * 24;

const STATUS_COLORS: Record<string, string> = {
  todo: "#6B7280", in_progress: "#3B82F6", review: "#EAB308", done: "#22C55E",
};
const VACATION_COLOR = "#0EA5E9";
const VACATION_LABELS: Record<string, string> = { vacation: "Dovolená", sick: "Nemoc", personal: "Volno" };

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function taskColor(t: Task) {
  if (t.status !== "done" && isOverdue(t.dueDate)) return "var(--danger)";
  return STATUS_COLORS[t.status] ?? "#6B7280";
}

interface Positioned {
  ev: CalendarEvent;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
}

// Lay out a day's timed events into non-overlapping lanes (side-by-side columns).
function layoutDay(events: CalendarEvent[], day: Date): Positioned[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const items = events
    .filter((e) => !e.allDay && new Date(e.startAt) <= dayEnd && new Date(e.endAt) >= dayStart)
    .map((e) => {
      const s = new Date(e.startAt) < dayStart ? dayStart : new Date(e.startAt);
      const en = new Date(e.endAt) > dayEnd ? dayEnd : new Date(e.endAt);
      const startMin = differenceInMinutes(s, dayStart);
      const durMin = Math.max(20, differenceInMinutes(en, s));
      return { ev: e, start: startMin, end: startMin + durMin };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const out: Positioned[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const laneEnds: number[] = [];
    const laneOf = new Map<(typeof cluster)[number], number>();
    for (const it of cluster) {
      let placed = false;
      for (let i = 0; i < laneEnds.length; i++) {
        if (it.start >= laneEnds[i]) { laneOf.set(it, i); laneEnds[i] = it.end; placed = true; break; }
      }
      if (!placed) { laneOf.set(it, laneEnds.length); laneEnds.push(it.end); }
    }
    const laneCount = laneEnds.length;
    for (const it of cluster) {
      out.push({
        ev: it.ev,
        top: (it.start / 60) * HOUR_HEIGHT,
        height: ((it.end - it.start) / 60) * HOUR_HEIGHT,
        lane: laneOf.get(it) ?? 0,
        laneCount,
      });
    }
    cluster = [];
  };

  for (const it of items) {
    if (cluster.length && it.start >= clusterEnd) { flush(); clusterEnd = -Infinity; }
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return out;
}

export function CalendarTimeGrid({
  mode,
  anchor,
  events,
  tasks,
  vacations,
  showEvents,
  showTasks,
  onSelectEvent,
  onCreateAt,
  onSelectDay,
}: {
  mode: "week" | "day";
  anchor: Date;
  events: CalendarEvent[];
  tasks: Task[];
  vacations: Vacation[];
  showEvents: boolean;
  showTasks: boolean;
  onSelectEvent: (ev: CalendarEvent) => void;
  onCreateAt: (at: Date) => void;
  onSelectDay: (day: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = mode === "day"
    ? [anchor]
    : Array.from({ length: 7 }, (_, i) => addDays(anchor, i));

  // Scroll to ~7:00 on mount / when the range changes.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT - 8;
  }, [mode, anchor]);

  // All-day strip items for a given day: all-day events, tasks due, vacations.
  const allDayItems = (day: Date) => {
    const out: { key: string; label: string; color: string; node?: React.ReactNode }[] = [];
    if (showEvents) {
      for (const e of events) {
        if (e.allDay && new Date(e.startAt) <= endOfDay(day) && new Date(e.endAt) >= startOfDay(day)) {
          out.push({ key: "e" + e.id, label: e.title, color: e.color || "var(--accent)" });
        }
      }
    }
    if (showTasks) {
      for (const t of tasks) {
        if (t.dueDate && isSameDay(new Date(t.dueDate), day)) {
          out.push({ key: "t" + t.id, label: t.title, color: taskColor(t) });
        }
      }
    }
    for (const v of vacations) {
      if (new Date(v.startDate) <= endOfDay(day) && new Date(v.endDate) >= startOfDay(day)) {
        out.push({ key: "v" + v.id, label: `${v.user?.name ?? "Člen"} · ${VACATION_LABELS[v.type] ?? "Dovolená"}`, color: VACATION_COLOR });
      }
    }
    return out;
  };

  const now = new Date();
  const nowOffset = (differenceInMinutes(now, startOfDay(now)) / 60) * HOUR_HEIGHT;

  return (
    <div className="rounded-3xl border overflow-hidden flex flex-col"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      {/* Day headers */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        <div className="w-14 flex-shrink-0" />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => onSelectDay(day)}
              className="flex-1 min-w-0 py-2.5 flex flex-col items-center border-l transition-colors hover:bg-[var(--hover)]"
              style={{ borderColor: "var(--border)" }}>
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: today ? "var(--accent)" : "var(--text-3)" }}>
                {cap(format(day, "EEE", { locale: cs }))}
              </span>
              <span className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-[14px] font-bold"
                style={today ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-1)" }}>
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* All-day strip */}
      <div className="flex border-b" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
        <div className="w-14 flex-shrink-0 flex items-center justify-end pr-2 py-1.5">
          <span className="text-[9.5px] font-semibold uppercase" style={{ color: "var(--text-3)" }}>Celý den</span>
        </div>
        {days.map((day) => {
          const items = allDayItems(day);
          return (
            <div key={day.toISOString()} className="flex-1 min-w-0 border-l px-1 py-1 space-y-0.5 min-h-[30px]"
              style={{ borderColor: "var(--border)" }}>
              {items.slice(0, 3).map((it) => (
                <div key={it.key} className="text-[10.5px] font-medium px-1.5 py-0.5 rounded truncate"
                  style={{ background: `color-mix(in srgb, ${it.color} 18%, transparent)`, color: "var(--text-1)" }}
                  title={it.label}>
                  {it.label}
                </div>
              ))}
              {items.length > 3 && (
                <div className="text-[10px] px-1" style={{ color: "var(--text-3)" }}>+{items.length - 3}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "62vh" }}>
        <div className="flex" style={{ height: DAY_HEIGHT }}>
          {/* Hour gutter */}
          <div className="w-14 flex-shrink-0 relative">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-medium"
                style={{ top: h * HOUR_HEIGHT, color: "var(--text-3)" }}>
                {h > 0 ? `${String(h).padStart(2, "0")}:00` : ""}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const positioned = showEvents ? layoutDay(events, day) : [];
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className="flex-1 min-w-0 relative border-l"
                style={{ borderColor: "var(--border)" }}>
                {/* Hour cells (click to create) */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    onClick={() => { const d = new Date(day); d.setHours(h, 0, 0, 0); onCreateAt(d); }}
                    className="absolute left-0 right-0 cursor-pointer hover:bg-[var(--hover)] transition-colors"
                    style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT, borderTop: "1px solid var(--border)" }}
                  />
                ))}

                {/* Current-time indicator */}
                {today && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowOffset }}>
                    <div className="h-[2px]" style={{ background: "var(--danger, #ef4444)" }} />
                    <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full" style={{ background: "var(--danger, #ef4444)" }} />
                  </div>
                )}

                {/* Timed events */}
                {positioned.map((p, i) => {
                  const widthPct = 100 / p.laneCount;
                  const color = p.ev.color || "var(--accent)";
                  return (
                    <button
                      key={p.ev.id + i}
                      onClick={(e) => { e.stopPropagation(); onSelectEvent(p.ev); }}
                      className="absolute z-10 rounded-lg px-1.5 py-1 text-left overflow-hidden transition-shadow hover:shadow-md"
                      style={{
                        top: p.top + 1,
                        height: Math.max(18, p.height - 2),
                        left: `calc(${p.lane * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        background: `color-mix(in srgb, ${color} 20%, var(--bg-card))`,
                        borderLeft: `3px solid ${color}`,
                      }}
                      title={p.ev.title}
                    >
                      <div className="text-[11px] font-semibold leading-tight truncate flex items-center gap-1" style={{ color: "var(--text-1)" }}>
                        {p.ev.recurring && p.ev.recurring !== "none" && <RefreshCw className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />}
                        {p.ev.title}
                      </div>
                      {p.height > 34 && (
                        <div className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                          {format(new Date(p.ev.startAt), "HH:mm")}–{format(new Date(p.ev.endAt), "HH:mm")}
                          {p.ev.location && <> · {p.ev.location}</>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
