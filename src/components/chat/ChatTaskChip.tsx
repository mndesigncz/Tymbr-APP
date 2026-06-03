"use client";

import Link from "next/link";
import { CheckSquare, AlertTriangle } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";
import type { Task, TaskStatus } from "@/types";

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

  const statusColor = STATUS_COLORS[task.status as TaskStatus] ?? "#9a9aa2";
  const isUrgent = task.priority === "urgent";

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block my-1.5 rounded-xl border px-3 py-2.5 transition-all hover:-translate-y-0.5 no-underline"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${statusColor}1a` }}
        >
          <CheckSquare className="w-3.5 h-3.5" style={{ color: statusColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold line-clamp-1" style={{ color: "var(--text-1)" }}>
            {isUrgent && <AlertTriangle className="inline w-3 h-3 mr-1 align-[-1px]" style={{ color: "#ef4444" }} />}
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium" style={{ color: statusColor }}>
              {STATUS_LABELS[task.status as TaskStatus] ?? task.status}
            </span>
            {task.category && (
              <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.category.color }} />
                {task.category.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
