"use client";

import { useState, useEffect } from "react";
import { useTimeTracker, formatElapsed } from "@/context/TimeTrackerContext";
import { Play, Square, ChevronDown, Clock } from "lucide-react";
import type { Task } from "@/types";

export function TimeTracker() {
  const { active, elapsed, isLoading, start, stop } = useTimeTracker();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/tasks?status=todo")
        .then((r) => r.json())
        .then((d) => {
          fetch("/api/tasks?status=in_progress")
            .then((r) => r.json())
            .then((d2) => {
              const all = [...(Array.isArray(d) ? d : []), ...(Array.isArray(d2) ? d2 : [])];
              setTasks(all);
            });
        });
    }
  }, [open]);

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleStart = async (task: Task) => {
    await start(task.id, task.title, task.category?.color);
    setOpen(false);
    setSearch("");
  };

  if (active) {
    return (
      <div className="mx-2 mb-3 rounded-2xl p-3.5 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#22C55E" }}>
            Pracuji
          </span>
        </div>
        <p className="text-[13px] font-semibold line-clamp-1 mb-2.5" style={{ color: "var(--text-1)" }}>
          {active.taskTitle}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[22px] font-bold tabular-nums tracking-tight" style={{ color: "var(--text-1)" }}>
            {formatElapsed(elapsed)}
          </span>
          <button
            onClick={stop}
            disabled={isLoading}
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

  return (
    <div className="mx-2 mb-3 relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-[13px] font-semibold transition-all hover:opacity-80"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-2)", boxShadow: "var(--shadow-sm)" }}
      >
        <Play className="w-3.5 h-3.5 fill-current" style={{ color: "var(--accent)" }} />
        <span className="flex-1 text-left">Zahájit práci</span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-3)", transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-2xl border overflow-hidden z-50"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", boxShadow: "0 -8px 32px rgba(0,0,0,0.1)" }}>
          <div className="p-2 border-b" style={{ borderColor: "var(--border)" }}>
            <input
              autoFocus
              placeholder="Hledat úkol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[13px] px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", color: "var(--text-1)" }}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-[12.5px] text-center py-5" style={{ color: "var(--text-3)" }}>Žádné aktivní úkoly</p>
            )}
            {filtered.map((task) => (
              <button
                key={task.id}
                onClick={() => handleStart(task)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-black/[0.03]"
              >
                {task.category && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: task.category.color }} />
                )}
                {!task.category && (
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                )}
                <span className="text-[13px] font-medium line-clamp-1" style={{ color: "var(--text-1)" }}>
                  {task.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
