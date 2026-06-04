"use client";

import Link from "next/link";
import { CheckSquare, AlertTriangle } from "lucide-react";
import type { Task } from "@/types";
import { useStatusConfig, statusLabel, statusColor } from "@/hooks/useStatusConfig";

export function ChatTaskChip({ task }: { task?: Task | null }) {
  const statuses = useStatusConfig();
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

  const color = statusColor(statuses, task.status);
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
          style={{ background: `${color}1a` }}
        >
          <CheckSquare className="w-3.5 h-3.5" style={{ color: color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold line-clamp-1" style={{ color: "var(--text-1)" }}>
            {isUrgent && <AlertTriangle className="inline w-3 h-3 mr-1 align-[-1px]" style={{ color: "#ef4444" }} />}
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium" style={{ color: color }}>
              {statusLabel(statuses, task.status)}
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
