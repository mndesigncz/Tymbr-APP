"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Clock } from "lucide-react";
import type { Task } from "@/types";
import { isOverdue } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  todo: "#6B7280", in_progress: "#3B82F6", review: "#EAB308", done: "#22C55E",
};
const STATUS_LABELS: Record<string, string> = {
  todo: "K provedení", in_progress: "Probíhá", review: "Ke kontrole", done: "Hotovo",
};
const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTH_NAMES = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
const WEEKDAY_FULL = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Returns "HH:MM" if the due date carries a non-midnight time, otherwise null. */
function timeLabel(due: Date): string | null {
  const h = due.getHours();
  const m = due.getMinutes();
  if (h === 0 && m === 0) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface Props { tasks: Task[] }

export function CalendarView({ tasks }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState(dateKey(today));

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedKey(dateKey(today)); };

  // Build calendar grid (always 6 rows × 7 cols, Monday-based)
  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const cells: { date: Date; current: boolean }[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, daysInPrev - i), current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), current: true });
    }
    while (cells.length < 42) {
      cells.push({ date: new Date(year, month + 1, cells.length - daysInMonth - startOffset + 1), current: false });
    }
    return cells;
  }, [year, month]);

  // Map tasks to local date keys
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = dateKey(new Date(t.dueDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    // Sort each day's tasks by time (timed first, then all-day)
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ta = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const tb = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return ta - tb;
      });
    }
    return map;
  }, [tasks]);

  const todayKey = dateKey(today);
  const selectedTasks = tasksByDate.get(selectedKey) ?? [];
  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedKey]);

  const monthTaskCount = useMemo(
    () => days.filter((c) => c.current).reduce((sum, c) => sum + (tasksByDate.get(dateKey(c.date))?.length ?? 0), 0),
    [days, tasksByDate]
  );

  return (
    <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 lg:gap-6">

        {/* ── Calendar card ── */}
        <div className="rounded-3xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>

          {/* Month header */}
          <div className="flex items-center justify-between px-4 sm:px-5 pt-5 pb-4">
            <div>
              <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
                {MONTH_NAMES[month]} <span style={{ color: "var(--text-3)" }}>{year}</span>
              </h2>
              <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-3)" }}>
                {monthTaskCount} {monthTaskCount === 1 ? "úkol" : monthTaskCount >= 2 && monthTaskCount <= 4 ? "úkoly" : "úkolů"} tento měsíc
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} aria-label="Předchozí měsíc"
                className="p-2 rounded-xl transition-colors hover:bg-black/[0.05]" style={{ color: "var(--text-2)" }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={goToday}
                className="px-3 py-1.5 text-[12.5px] font-semibold rounded-xl border transition-colors hover:opacity-80"
                style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--accent)" }}>
                Dnes
              </button>
              <button onClick={nextMonth} aria-label="Další měsíc"
                className="p-2 rounded-xl transition-colors hover:bg-black/[0.05]" style={{ color: "var(--text-2)" }}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 px-2 sm:px-3">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold py-2 uppercase tracking-wide"
                style={{ color: "var(--text-3)" }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 px-2 sm:px-3 pb-3">
            {days.map((cell, i) => {
              const key = dateKey(cell.date);
              const cellTasks = tasksByDate.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              const hasOverdue = cellTasks.some((t) => t.status !== "done" && isOverdue(t.dueDate));
              return (
                <button
                  key={i}
                  onClick={() => setSelectedKey(key)}
                  className="group relative aspect-square sm:aspect-auto sm:min-h-[78px] rounded-xl sm:rounded-2xl p-1 sm:p-1.5 flex flex-col items-center sm:items-stretch transition-colors"
                  style={{
                    background: isSelected
                      ? "var(--accent)"
                      : cell.current ? "transparent" : "transparent",
                    outline: isSelected ? "none" : "none",
                    border: isSelected ? "none" : `1px solid ${isToday ? "var(--accent)" : "transparent"}`,
                  }}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-center sm:justify-start">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full text-[12.5px] font-semibold"
                      style={{
                        color: isSelected
                          ? "#fff"
                          : isToday ? "var(--accent)" : cell.current ? "var(--text-1)" : "var(--text-3)",
                      }}>
                      {cell.date.getDate()}
                    </span>
                  </div>

                  {/* Desktop: task pills */}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-0.5 flex-1 w-full overflow-hidden">
                    {cellTasks.slice(0, 2).map((t) => {
                      const overdue = t.status !== "done" && isOverdue(t.dueDate);
                      const c = overdue ? "#ef4444" : STATUS_COLORS[t.status] ?? "#6B7280";
                      return (
                        <span key={t.id}
                          className="block text-[10px] font-medium px-1 py-0.5 rounded truncate leading-tight"
                          style={{
                            background: isSelected ? "rgba(255,255,255,0.22)" : `${c}18`,
                            color: isSelected ? "#fff" : c,
                          }}
                          title={t.title}>
                          {t.title}
                        </span>
                      );
                    })}
                    {cellTasks.length > 2 && (
                      <span className="text-[10px] px-1 font-medium"
                        style={{ color: isSelected ? "rgba(255,255,255,0.85)" : "var(--text-3)" }}>
                        +{cellTasks.length - 2} dalších
                      </span>
                    )}
                  </div>

                  {/* Mobile: dots */}
                  {cellTasks.length > 0 && (
                    <div className="flex sm:hidden items-center justify-center gap-0.5 mt-0.5">
                      {cellTasks.slice(0, 3).map((t, di) => {
                        const overdue = t.status !== "done" && isOverdue(t.dueDate);
                        return (
                          <span key={di} className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: isSelected
                                ? "#fff"
                                : overdue ? "#ef4444" : STATUS_COLORS[t.status] ?? "#6B7280",
                            }} />
                        );
                      })}
                    </div>
                  )}

                  {/* Overdue marker (desktop, top-right) */}
                  {hasOverdue && !isSelected && (
                    <span className="hidden sm:block absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                      style={{ background: "#ef4444" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Day agenda panel ── */}
        <div className="rounded-3xl border overflow-hidden lg:sticky lg:top-4 lg:self-start"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
                  {selectedKey === todayKey ? "Dnes" : WEEKDAY_FULL[selectedDate.getDay()]}
                </p>
                <h3 className="text-[20px] font-bold tracking-tight mt-0.5" style={{ color: "var(--text-1)" }}>
                  {selectedDate.getDate()}. {MONTH_NAMES[selectedDate.getMonth()].toLowerCase()}
                </h3>
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--bg-subtle)" }}>
                <CalendarDays className="w-5 h-5" style={{ color: "var(--accent)" }} />
              </div>
            </div>
            <p className="text-[12.5px] mt-2" style={{ color: "var(--text-3)" }}>
              {selectedTasks.length === 0
                ? "Žádné úkoly"
                : `${selectedTasks.length} ${selectedTasks.length === 1 ? "úkol" : selectedTasks.length <= 4 ? "úkoly" : "úkolů"}`}
            </p>
          </div>

          <div className="p-3 space-y-1.5 max-h-[420px] lg:max-h-[60vh] overflow-y-auto">
            {selectedTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarDays className="w-8 h-8 mb-2 opacity-30" style={{ color: "var(--text-3)" }} />
                <p className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>Volný den</p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>Žádné naplánované úkoly</p>
              </div>
            )}
            {selectedTasks.map((t) => {
              const overdue = t.status !== "done" && isOverdue(t.dueDate);
              const c = overdue ? "#ef4444" : STATUS_COLORS[t.status] ?? "#6B7280";
              const time = t.dueDate ? timeLabel(new Date(t.dueDate)) : null;
              return (
                <Link key={t.id} href={`/tasks/${t.id}`}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-2xl transition-colors hover:bg-black/[0.03]">
                  <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: c }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold leading-snug line-clamp-2" style={{ color: "var(--text-1)" }}>
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                        style={{ background: `${c}15`, color: c }}>
                        {overdue ? "Po termínu" : STATUS_LABELS[t.status] ?? t.status}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11.5px]" style={{ color: "var(--text-3)" }}>
                        <Clock className="w-3 h-3" />
                        {time ?? "Celý den"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
            <Link href="/tasks/new"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}>
              <Plus className="w-4 h-4" />
              Nový úkol
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
