"use client";

import Link from "next/link";
import { Calendar, AlertTriangle } from "lucide-react";
import type { Task } from "@/types";
import { formatDate, isOverdue } from "@/lib/utils";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { StatusBadge } from "@/components/tasks/StatusBadge";

// Renders an inlined task reference inside a chat message, mirroring the
// look of a real TaskCard so a pinned task reads as the task itself.
export function ChatTaskChip({ task }: { task?: Task | null }) {
  if (!task) {
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

  const isUrgent = task.priority === "urgent";
  const isDone = task.status === "done";
  const overdue = !isDone && isOverdue(task.dueDate);

  return (
    <Link
      href={`/tasks/${task.id}`}
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
        {task.title}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        {task.category && (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md"
            style={{ color: task.category.color, background: `${task.category.color}14` }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: task.category.color }} />
            {task.category.name}
          </span>
        )}
        {task.dueDate && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap"
            style={{ color: overdue ? "#ef4444" : "var(--text-3)" }}>
            <Calendar className="w-3 h-3 flex-shrink-0" />
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </Link>
  );
}
