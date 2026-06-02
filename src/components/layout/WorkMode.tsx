"use client";

import { useState, useEffect, useCallback } from "react";
import { useTimeTracker, formatElapsed } from "@/context/TimeTrackerContext";
import { Subtasks } from "@/components/tasks/Subtasks";
import { Minimize2, Square, Check, Play } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export function WorkMode() {
  const { active, elapsed, focusOpen, stop, closeFocus, start } = useTimeTracker();
  const [task, setTask] = useState<Task | null>(null);
  const [others, setOthers] = useState<Task[]>([]);

  const loadTask = useCallback(async () => {
    if (!active) return;
    const res = await fetch(`/api/tasks/${active.taskId}`);
    if (res.ok) setTask(await res.json());
  }, [active]);

  const loadOthers = useCallback(async () => {
    const res = await fetch("/api/tasks?status=in_progress");
    const data = await res.json();
    setOthers(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (focusOpen && active) {
      loadTask();
      loadOthers();
    }
  }, [focusOpen, active, loadTask, loadOthers]);

  if (!focusOpen || !active) return null;

  const changeStatus = async (status: TaskStatus) => {
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setTask(await res.json());
      loadOthers();
    }
  };

  const switchTask = async (t: Task) => {
    await start(t.id, t.title, t.category?.color);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#0a0a0c", color: "#f5f5f7" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
          <span className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: "#22C55E" }}>
            Pracovní mód
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={closeFocus}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.06)", color: "#d4d4d8" }}
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Minimalizovat</span>
          </button>
          <button
            onClick={stop}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90"
            style={{ background: "#dc2626", color: "#fff" }}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Ukončit práci
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main: timer + active task */}
          <div className="lg:col-span-2 space-y-8">
            {/* Timer */}
            <div className="text-center lg:text-left">
              <p className="text-[13px] font-medium mb-2" style={{ color: "#8a8a92" }}>Pracuješ na</p>
              <h1 className="text-[24px] lg:text-[28px] font-bold tracking-tight mb-5 leading-tight">
                {task?.title ?? active.taskTitle}
              </h1>
              <div className="text-[64px] lg:text-[84px] font-bold tabular-nums tracking-tight leading-none"
                style={{ color: "#fff" }}>
                {formatElapsed(elapsed)}
              </div>
            </div>

            {/* Status switcher */}
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8a8a92" }}>Stav</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => {
                  const isActive = task?.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => changeStatus(s)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all"
                      style={isActive
                        ? { background: STATUS_COLORS[s], color: "#fff" }
                        : { background: "rgba(255,255,255,0.06)", color: "#d4d4d8" }}
                    >
                      {isActive && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      {STATUS_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            {task?.description && (
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8a8a92" }}>Popis</p>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "#c4c4cc" }}>
                  {task.description}
                </p>
              </div>
            )}

            {/* Subtasks */}
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8a8a92" }}>Podúkoly</p>
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                <Subtasks taskId={active.taskId} dark />
              </div>
            </div>
          </div>

          {/* Side: other in-progress tasks */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8a8a92" }}>
              Probíhající úkoly
            </p>
            <div className="space-y-2">
              {others.length === 0 && (
                <p className="text-[13px]" style={{ color: "#6a6a72" }}>Žádné další úkoly</p>
              )}
              {others.map((t) => {
                const isCurrent = t.id === active.taskId;
                return (
                  <button
                    key={t.id}
                    onClick={() => !isCurrent && switchTask(t)}
                    disabled={isCurrent}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
                    style={isCurrent
                      ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid transparent" }}
                  >
                    {t.category && (
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.category.color }} />
                    )}
                    <span className="flex-1 text-[13.5px] font-medium line-clamp-1"
                      style={{ color: isCurrent ? "#22C55E" : "#e4e4e7" }}>
                      {t.title}
                    </span>
                    {isCurrent ? (
                      <span className="text-[11px] font-semibold" style={{ color: "#22C55E" }}>aktivní</span>
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current flex-shrink-0" style={{ color: "#8a8a92" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
