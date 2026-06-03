"use client";

import { useState } from "react";
import Link from "next/link";
import { TaskCard } from "@/components/tasks/TaskCard";
import type { Task, TaskStatus } from "@/types";

interface RecentTasksProps {
  allTasks: Task[];
  myTasks: Task[];
  isManager?: boolean;
}

export function RecentTasks({ allTasks, myTasks, isManager = true }: RecentTasksProps) {
  const [view, setView] = useState<"all" | "mine">(isManager ? "all" : "mine");
  const [state, setState] = useState({ all: allTasks, mine: myTasks });

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
        all: prev.all.map((t) => (t.id === taskId ? updated : t)),
        mine: prev.mine.map((t) => (t.id === taskId ? updated : t)),
      }));
    }
  };

  return (
    <div className="rounded-3xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
            {isManager ? "Úkoly" : "Moje úkoly"}
          </h2>
          {isManager && (
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
              <button
                onClick={() => setView("all")}
                className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
                style={view === "all"
                  ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                  : { color: "var(--text-3)" }}
              >
                Všechny
              </button>
              <button
                onClick={() => setView("mine")}
                className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
                style={view === "mine"
                  ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                  : { color: "var(--text-3)" }}
              >
                Moje
              </button>
            </div>
          )}
        </div>
        <Link
          href={view === "mine" ? "/tasks?mine=1" : "/tasks"}
          className="text-[13px] font-semibold hover:opacity-80 transition-opacity"
          style={{ color: "var(--accent)" }}
        >
          Zobrazit vše
        </Link>
      </div>
      <div className="px-6 pb-7 space-y-4">
        {visible.length === 0 && (
          <p className="text-[13.5px] text-center py-8" style={{ color: "var(--text-3)" }}>Žádné úkoly</p>
        )}
        {visible.map((task) => (
          <TaskCard key={task.id} task={task} compact onStatusAdvance={handleStatusAdvance} />
        ))}
      </div>
    </div>
  );
}
