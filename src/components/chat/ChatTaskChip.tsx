"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, AlertTriangle } from "lucide-react";
import type { Task } from "@/types";
import { formatDate, isOverdue } from "@/lib/utils";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { StatusBadge } from "@/components/tasks/StatusBadge";

// Module-level cache so a task referenced in several messages is fetched once.
const taskCache = new Map<string, Task | null>();

// Renders an inlined task reference inside a chat message, mirroring the
// look of a real TaskCard so a pinned task reads as the task itself.
// If the task isn't already loaded (e.g. it's done/filtered or the team's
// task list hasn't arrived yet), it lazily fetches it by id rather than
// immediately rendering a "deleted" placeholder.
export function ChatTaskChip({ task, taskId }: { task?: Task | null; taskId?: string }) {
  const [resolved, setResolved] = useState<Task | null | undefined>(
    task ?? (taskId ? taskCache.get(taskId) : undefined)
  );

  useEffect(() => {
    // A task supplied directly always wins.
    if (task) { setResolved(task); return; }
    if (!taskId) return;
    if (taskCache.has(taskId)) { setResolved(taskCache.get(taskId)); return; }

    let cancelled = false;
    fetch(`/api/tasks/${taskId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Task | null) => {
        const value = data && data.id ? data : null;
        taskCache.set(taskId, value);
        if (!cancelled) setResolved(value);
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });
    return () => { cancelled = true; };
  }, [task, taskId]);

  // Still resolving — show a neutral skeleton instead of raw markers or a
  // premature "deleted" state.
  if (resolved === undefined) {
    return (
      <span
        className="block my-1.5 rounded-2xl border p-3.5 animate-pulse"
        style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}
      >
        <span className="block h-3.5 w-2/3 rounded" style={{ background: "var(--border-md)" }} />
        <span className="block h-2.5 w-1/3 rounded mt-2.5" style={{ background: "var(--border-md)" }} />
      </span>
    );
  }

  if (resolved === null) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium align-middle"
        style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}
      >
        <AlertTriangle className="w-3 h-3" />
        Smazaný úkol
      </span>
    );
  }

  const resolvedTask = resolved;
  const isUrgent = resolvedTask.priority === "urgent";
  const isDone = resolvedTask.status === "done";
  const overdue = !isDone && isOverdue(resolvedTask.dueDate);

  return (
    <Link
      href={`/tasks/${resolvedTask.id}`}
      className="block my-1.5 rounded-2xl border p-3.5 transition-all hover:-translate-y-0.5 no-underline"
      style={{
        background: isDone ? "#22C55E08" : isUrgent ? "#EF444408" : "var(--bg-card)",
        borderColor: isDone ? "#22C55E30" : isUrgent ? "rgba(239,68,68,0.22)" : "var(--border-md)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {isUrgent && !isDone && (
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
          <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "#ef4444" }}>Urgentní</span>
        </div>
      )}

      <p className="text-[13.5px] font-semibold leading-snug line-clamp-2 mb-2.5" style={{ color: "var(--text-1)" }}>
        {resolvedTask.title}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={resolvedTask.status} />
        <PriorityBadge priority={resolvedTask.priority} />
        {resolvedTask.category && (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md"
            style={{ color: resolvedTask.category.color, background: `${resolvedTask.category.color}14` }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: resolvedTask.category.color }} />
            {resolvedTask.category.name}
          </span>
        )}
        {resolvedTask.dueDate && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap"
            style={{ color: overdue ? "#ef4444" : "var(--text-3)" }}>
            <Calendar className="w-3 h-3 flex-shrink-0" />
            {formatDate(resolvedTask.dueDate)}
          </span>
        )}
      </div>
    </Link>
  );
}
