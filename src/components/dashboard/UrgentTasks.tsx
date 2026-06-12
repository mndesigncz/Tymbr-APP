"use client";

import { useState } from "react";
import { TaskCard } from "@/components/tasks/TaskCard";
import { AlertCircle } from "lucide-react";
import type { Task } from "@/types";

interface UrgentTasksProps {
  allUrgent: Task[];
  myUrgent: Task[];
  isManager?: boolean;
}

export function UrgentTasks({ allUrgent, myUrgent, isManager = true }: UrgentTasksProps) {
  const [view, setView] = useState<"all" | "mine">(isManager ? "all" : "mine");
  const [state, setState] = useState({ all: allUrgent, mine: myUrgent });

  const visible = view === "all" ? state.all : state.mine;

  const handleStatusAdvance = async (taskId: string, newStatus: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setState((prev) => ({
        all: prev.all.map((t) => (t.id === taskId ? updated : t)).filter((t) => t.status !== "done"),
        mine: prev.mine.map((t) => (t.id === taskId ? updated : t)).filter((t) => t.status !== "done"),
      }));
    }
  };

  const totalCount = isManager ? state.all.length : state.mine.length;
  if (totalCount === 0) return null;

  return (
    <div className="rounded-3xl border"
      style={{
        background: "var(--danger-soft)",
        borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)",
        boxShadow: "var(--shadow-sm)",
      }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-[18px] h-[18px]" style={{ color: "var(--danger)" }} />
          <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Urgentní</h2>
          <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-md"
            style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 12%, transparent)" }}>
            {visible.length}
          </span>
        </div>
        {isManager && (
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
            <button
              type="button"
              onClick={() => setView("all")}
              className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all"
              style={view === "all"
                ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                : { color: "var(--text-3)" }}
            >
              Všechny
            </button>
            <button
              type="button"
              onClick={() => setView("mine")}
              className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all"
              style={view === "mine"
                ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                : { color: "var(--text-3)" }}
            >
              Moje
            </button>
          </div>
        )}
      </div>
      <div className="px-6 pb-6 space-y-4">
        {visible.length === 0 && (
          <p className="text-[13.5px] text-center py-6" style={{ color: "var(--text-3)" }}>
            Žádné urgentní úkoly
          </p>
        )}
        {visible.map((task) => (
          <TaskCard key={task.id} task={task} compact urgent showUrgentMark />
        ))}
      </div>
    </div>
  );
}
