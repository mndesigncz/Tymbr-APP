"use client";

import Link from "next/link";
import { formatDate, isOverdue } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge } from "./PriorityBadge";
import { Calendar, MessageSquare } from "lucide-react";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
}

export function TaskCard({ task, compact }: TaskCardProps) {
  const overdue = task.status !== "done" && isOverdue(task.dueDate);

  return (
    <Link href={`/tasks/${task.id}`}>
      <div
        className="rounded-2xl border p-4 transition-all duration-150 cursor-pointer group hover:-translate-y-0.5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        {/* Title */}
        <p className="text-[14px] font-semibold leading-snug line-clamp-2 mb-2.5"
          style={{ color: "var(--text-1)" }}>
          {task.title}
        </p>

        {/* Description */}
        {task.description && !compact && (
          <p className="text-[12.5px] line-clamp-2 mb-3.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
            {task.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <PriorityBadge priority={task.priority} />
          {task.category && (
            <span
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-1 rounded-lg"
              style={{ color: task.category.color, background: `${task.category.color}14` }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: task.category.color }} />
              {task.category.name}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            {task.dueDate && (
              <span className="flex items-center gap-1 text-[11.5px] font-medium"
                style={{ color: overdue ? "#ef4444" : "var(--text-3)" }}>
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {(task._count?.comments ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[11.5px]" style={{ color: "var(--text-3)" }}>
                <MessageSquare className="w-3.5 h-3.5" />
                {task._count?.comments}
              </span>
            )}
            {!task.dueDate && (task._count?.comments ?? 0) === 0 && (
              <span className="text-[11.5px]" style={{ color: "var(--text-3)" }}>Bez termínu</span>
            )}
          </div>
          {task.assignee && (
            <Avatar name={task.assignee.name} src={task.assignee.avatar} size="sm" className="flex-shrink-0" />
          )}
        </div>
      </div>
    </Link>
  );
}
