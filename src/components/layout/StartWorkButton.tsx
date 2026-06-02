"use client";

import { useState, useEffect } from "react";
import { useTimeTracker, formatElapsed } from "@/context/TimeTrackerContext";
import { Play, ChevronDown, Clock } from "lucide-react";
import type { Task } from "@/types";

export function StartWorkButton() {
  const { active, elapsed, start, openFocus } = useTimeTracker();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/tasks?status=todo").then((r) => r.json()),
        fetch("/api/tasks?status=in_progress").then((r) => r.json()),
      ]).then(([a, b]) => {
        setTasks([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);
      });
    }
  }, [open]);

  const filtered = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));

  const handleStart = async (task: Task) => {
    await start(task.id, task.title, task.category?.color);
    setOpen(false);
    setSearch("");
  };

  if (active) {
    return (
      <button
        onClick={openFocus}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all hover:opacity-90"
        style={{ background: "#16a34a", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }}
      >
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="tabular-nums">{formatElapsed(elapsed)}</span>
        <span className="hidden sm:inline opacity-90">Pracovní mód</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-black/[0.03]"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}
      >
        <Play className="w-3.5 h-3.5 fill-current" style={{ color: "#16a34a" }} />
        <span className="hidden sm:inline">Zahájit práci</span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-72 rounded-2xl border overflow-hidden z-50"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}>
            <div className="p-2 border-b" style={{ borderColor: "var(--border)" }}>
              <input
                autoFocus
                placeholder="Hledat úkol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-[13px] px-2.5 py-2 rounded-lg outline-none"
                style={{ background: "var(--bg-subtle)", color: "var(--text-1)" }}
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-[12.5px] text-center py-6" style={{ color: "var(--text-3)" }}>Žádné aktivní úkoly</p>
              )}
              {filtered.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleStart(task)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-black/[0.03]"
                >
                  {task.category ? (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.category.color }} />
                  ) : (
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                  )}
                  <span className="text-[13px] font-medium line-clamp-1" style={{ color: "var(--text-1)" }}>
                    {task.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
