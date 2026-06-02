"use client";

import Link from "next/link";
import { formatDate, isOverdue } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge } from "./PriorityBadge";
import { Calendar, MessageSquare, ChevronRight } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { STATUS_COLORS } from "@/types";

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  todo: "in_progress",
  in_progress: "review",
  review: "done",
};

const NEXT_LABEL: Partial<Record<TaskStatus, string>> = {
  todo: "Zahájit",
  in_progress: "Ke schválení",
  review: "Hotovo",
};

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  onStatusAdvance?: (taskId: string, newStatus: TaskStatus) => void;
}

export function TaskCard({ task, compact, onStatusAdvance }: TaskCardProps) {
  const overdue = task.status !== "done" && isOverdue(task.dueDate);
  const nextStatus = NEXT_STATUS[task.status];

  const AdvanceButton = nextStatus ? (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onStatusAdvance?.(task.id, nextStatus);
      }}
      className="flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-lg transition-all hover:opacity-80 flex-shrink-0 whitespace-nowrap"
      style={{
        background: `${STATUS_COLORS[nextStatus]}15`,
        color: STATUS_COLORS[nextStatus],
      }}
    >
      {NEXT_LABEL[task.status]}
      <ChevronRight className="w-3 h-3" />
    </button>
  ) : null;

  if (compact) {
    return (
      <Link href={`/tasks/${task.id}`} className="block">
        <div
          className="flex items-start justify-between gap-3 px-4 py-4 rounded-2xl transition-colors cursor-pointer hover:opacity-90"
          style={{ background: "var(--bg-subtle)" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold leading-snug line-clamp-1 mb-2"
              style={{ color: "var(--text-1)" }}>
              {task.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={task.priority} />
              {task.category && (
                <span
                  className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                  style={{ color: task.category.color, background: `${task.category.color}15` }}
                >
                  {task.category.name}
                </span>
              )}
              {task.dueDate && (
                <span className="flex items-center gap-1 text-[11px]"
                  style={{ color: overdue ? "#ef4444" : "var(--text-3)" }}>
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            {onStatusAdvance && AdvanceButton}
            {task.assignee && (
              <Avatar name={task.assignee.name} src={task.assignee.avatar} size="sm" />
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/tasks/${task.id}`} className="block">
      <div
        className="rounded-2xl border p-5 transition-all duration-150 cursor-pointer group hover:-translate-y-0.5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <p className="text-[14px] font-semibold leading-snug line-clamp-2 mb-3"
          style={{ color: "var(--text-1)" }}>
          {task.title}
        </p>

        {task.description && (
          <p className="text-[12.5px] line-clamp-2 mb-3.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
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

        <div className="flex items-center justify-between gap-2 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
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
          <div className="flex items-center gap-2">
            {onStatusAdvance && AdvanceButton}
            {task.assignee && (
              <Avatar name={task.assignee.name} src={task.assignee.avatar} size="sm" className="flex-shrink-0" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
