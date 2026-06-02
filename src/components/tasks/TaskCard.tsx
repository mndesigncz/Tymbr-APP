"use client";

import Link from "next/link";
import { cn, formatDate, isOverdue } from "@/lib/utils";
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
        className={cn(
          "border rounded-xl transition-all duration-150 cursor-pointer group",
          compact ? "p-3" : "p-4"
        )}
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-md)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        {/* Title */}
        <p className={cn(
          "font-medium leading-snug line-clamp-2 mb-2 transition-colors",
          compact ? "text-[13px]" : "text-[13.5px]"
        )}
          style={{ color: "var(--text-1)" }}>
          {task.title}
        </p>

        {/* Description */}
        {task.description && !compact && (
          <p className="text-[12px] line-clamp-2 mb-3" style={{ color: "var(--text-3)" }}>
            {task.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <PriorityBadge priority={task.priority} />

            {task.category && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
                style={{ color: task.category.color, background: `${task.category.color}15` }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: task.category.color }} />
                {task.category.name}
              </span>
            )}

            {task.dueDate && (
              <span
                className="flex items-center gap-1 text-[11px]"
                style={{ color: overdue ? "#f87171" : "var(--text-3)" }}
              >
                <Calendar className="w-3 h-3" />
                {formatDate(task.dueDate)}
              </span>
            )}

            {(task._count?.comments ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                <MessageSquare className="w-3 h-3" />
                {task._count?.comments}
              </span>
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
