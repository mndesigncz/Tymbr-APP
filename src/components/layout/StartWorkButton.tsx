"use client";

import { useState, useEffect, useRef } from "react";
import { useTimeTracker, formatElapsed } from "@/context/TimeTrackerContext";
import { Play, ChevronDown, Clock } from "lucide-react";
import { DropdownPortal } from "@/components/ui/DropdownPortal";
import type { Task } from "@/types";

export function StartWorkButton() {
  const { active, elapsed, start, openFocus } = useTimeTracker();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

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
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all hover:opacity-90 flex-shrink-0"
        style={{ background: "var(--success-strong)", boxShadow: "0 4px 12px color-mix(in srgb, var(--success-strong) 30%, transparent)" }}
      >
        <span className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
        <span className="tabular-nums">{formatElapsed(elapsed)}</span>
        <span className="opacity-90 hidden sm:inline">Pracovní mód</span>
      </button>
    );
  }

  return (
    <div className="flex-shrink-0">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-[var(--hover)]"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}
      >
        <Play className="w-3.5 h-3.5 fill-current flex-shrink-0" style={{ color: "var(--success)" }} />
        <span className="sm:hidden">Zahájit</span>
        <span className="hidden sm:inline">Zahájit práci</span>
        <ChevronDown className="w-3.5 h-3.5 hidden sm:block" style={{ color: "var(--text-3)" }} />
      </button>

      <DropdownPortal
        triggerRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        align="left"
        className="w-72 rounded-2xl border overflow-hidden glass-strong animate-scale-in"
        style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)" }}
      >
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
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--hover)]"
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
      </DropdownPortal>
    </div>
  );
}
