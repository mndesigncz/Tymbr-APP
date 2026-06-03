"use client";

import { useState } from "react";
import { TaskCard } from "@/components/tasks/TaskCard";
import { AlertCircle } from "lucide-react";
import type { Task, TaskStatus } from "@/types";

interface UrgentTasksProps {
  allUrgent: Task[];
  myUrgent: Task[];
}

export function UrgentTasks({ allUrgent, myUrgent }: UrgentTasksProps) {
  const [view, setView] = useState<"all" | "mine">("all");
  const [state, setState] = useState({ all: allUrgent, mine: myUrgent });

  const visible = view === "all" ? state.all : state.mine;

  const handleStatusAdvance = async (taskId: string, newStatus: TaskStatus) => {
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

  if (state.all.length === 0) return null;

  return (
    <div className="rounded-3xl border"
      style={{ background: "#EF44440A", borderColor: "rgba(239,68,68,0.22)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-[18px] h-[18px] text-red-500" />
          <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Urgentní</h2>
          <span className="text-[11.5px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
            {visible.length}
          </span>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.6)" }}>
          <button
            onClick={() => setView("all")}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all"
            style={view === "all"
              ? { background: "#fff", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
              : { color: "var(--text-3)" }}
          >
            Všechny
          </button>
          <button
            onClick={() => setView("mine")}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all"
            style={view === "mine"
              ? { background: "#fff", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
              : { color: "var(--text-3)" }}
          >
            Moje
          </button>
        </div>
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
