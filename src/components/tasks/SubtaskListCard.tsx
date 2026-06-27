"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Calendar } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, isOverdue } from "@/lib/utils";
import type { SubTask } from "@/types";

export function SubtaskListCard({ subtask, parentTaskId }: { subtask: SubTask; parentTaskId: string }) {
  const [done, setDone] = useState(subtask.done);
  const overdue = !done && subtask.dueDate && isOverdue(subtask.dueDate);

  const toggleDone = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !done;
    setDone(next);
    await fetch(`/api/subtasks/${subtask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: next }),
    });
  };

  return (
    <Link href={`/tasks/${parentTaskId}`} className="block">
      <div
        className="rounded-xl px-3 py-2.5 flex items-start gap-2.5 transition-all hover:-translate-y-0.5"
        style={{
          background: done
            ? "color-mix(in srgb, var(--success) 4%, var(--bg-card))"
            : "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <button
          onClick={toggleDone}
          className="w-[16px] h-[16px] rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all border"
          style={
            done
              ? { background: "var(--success)", borderColor: "var(--success)" }
              : { borderColor: "var(--border-md)", background: "transparent" }
          }
        >
          {done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className="text-[12.5px] font-medium truncate"
            style={{
              color: done ? "var(--text-3)" : "var(--text-1)",
              textDecoration: done ? "line-through" : undefined,
            }}
          >
            {subtask.title}
          </p>
          {(subtask.dueDate || subtask.description) && (
            <div className="flex items-center gap-2 mt-0.5">
              {subtask.dueDate && (
                <span
                  className="flex items-center gap-0.5 text-[11px]"
                  style={{ color: overdue ? "var(--danger)" : "var(--text-3)" }}
                >
                  <Calendar className="w-3 h-3" />
                  {formatDate(subtask.dueDate)}
                </span>
              )}
              {subtask.description && (
                <span className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>
                  {subtask.description}
                </span>
              )}
            </div>
          )}
        </div>

        {subtask.assignee && (
          <Avatar
            name={subtask.assignee.name}
            src={subtask.assignee.avatar}
            size="sm"
            className="flex-shrink-0 mt-0.5"
          />
        )}
      </div>
    </Link>
  );
}
