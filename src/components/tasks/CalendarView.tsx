"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "@/types";
import { isOverdue } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  todo: "#6B7280", in_progress: "#3B82F6", review: "#EAB308", done: "#22C55E",
};
const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTH_NAMES = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

interface Props { tasks: Task[] }

export function CalendarView({ tasks }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Build calendar grid (always 6 rows × 7 cols)
  const { days } = useMemo(() => {
    const first = new Date(year, month, 1);
    // Monday-based: 0=Mon … 6=Sun
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
    return { days: cells };
  }, [year, month]);

  // Map tasks to date keys
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = new Date(t.dueDate).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  const todayKey = today.toISOString().slice(0, 10);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[18px] font-bold" style={{ color: "var(--text-1)" }}>
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth}
            className="p-2 rounded-xl transition-colors hover:bg-black/[0.05]"
            style={{ color: "var(--text-2)" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            className="px-3 py-1.5 text-[12.5px] font-semibold rounded-xl border transition-colors hover:opacity-80"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--accent)" }}>
            Dnes
          </button>
          <button onClick={nextMonth}
            className="p-2 rounded-xl transition-colors hover:bg-black/[0.05]"
            style={{ color: "var(--text-2)" }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[11.5px] font-semibold py-1.5 uppercase tracking-wide"
            style={{ color: "var(--text-3)" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-2xl overflow-hidden"
        style={{ background: "var(--border)" }}>
        {days.map((cell, i) => {
          const key = cell.date.toISOString().slice(0, 10);
          const cellTasks = tasksByDate.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div key={i} className="min-h-[90px] p-1.5 flex flex-col"
              style={{ background: cell.current ? "var(--bg-card)" : "var(--bg-subtle)" }}>
              {/* Day number */}
              <div className="flex items-center justify-center mb-1">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-semibold
                  ${isToday ? "text-white" : ""}`}
                  style={{
                    background: isToday ? "var(--accent)" : "transparent",
                    color: isToday ? "#fff" : cell.current ? "var(--text-1)" : "var(--text-3)",
                  }}>
                  {cell.date.getDate()}
                </span>
              </div>
              {/* Tasks */}
              <div className="flex flex-col gap-0.5 flex-1">
                {cellTasks.slice(0, 3).map((t) => {
                  const overdue = t.status !== "done" && isOverdue(t.dueDate);
                  return (
                    <Link key={t.id} href={`/tasks/${t.id}`}
                      className="block text-[10.5px] font-medium px-1 py-0.5 rounded truncate leading-tight transition-opacity hover:opacity-80"
                      style={{
                        background: overdue ? "#ef444418" : `${STATUS_COLORS[t.status] ?? "#6B7280"}18`,
                        color: overdue ? "#ef4444" : STATUS_COLORS[t.status] ?? "#6B7280",
                      }}
                      title={t.title}>
                      {t.title}
                    </Link>
                  );
                })}
                {cellTasks.length > 3 && (
                  <span className="text-[10px] px-1" style={{ color: "var(--text-3)" }}>
                    +{cellTasks.length - 3} dalších
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
