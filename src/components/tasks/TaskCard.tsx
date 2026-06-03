"use client";

import Link from "next/link";
import { formatDate, isOverdue } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge } from "./PriorityBadge";
import { Calendar, MessageSquare, ChevronRight, Play, AlertTriangle } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { STATUS_COLORS } from "@/types";
import { useTimeTracker } from "@/context/TimeTrackerContext";

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
  urgent?: boolean;
  showUrgentMark?: boolean;
  onStatusAdvance?: (taskId: string, newStatus: TaskStatus) => void;
}

export function TaskCard({ task, compact, urgent, showUrgentMark, onStatusAdvance }: TaskCardProps) {
  const { start, active } = useTimeTracker();
  const overdue = task.status !== "done" && isOverdue(task.dueDate);
  const nextStatus = NEXT_STATUS[task.status];
  const isCurrentlyActive = active?.taskId === task.id;
  const isUrgent = task.priority === "urgent";
  const isDone = task.status === "done";

  const handleStartWork = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    start(task.id, task.title, task.category?.color);
  };

  const compactBg = isDone ? "#22C55E0E" : (urgent || isUrgent) ? "#EF44440F" : "var(--bg-subtle)";

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
          style={{ background: compactBg }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold leading-snug line-clamp-1 mb-2 flex items-center gap-1.5"
              style={{ color: "var(--text-1)" }}>
              {showUrgentMark && isUrgent && (
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 fill-red-500/15" style={{ color: "#ef4444" }} />
              )}
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
                <span className="flex items-center gap-1 text-[11px] whitespace-nowrap"
                  style={{ color: overdue ? "#ef4444" : "var(--text-3)" }}>
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            {task.status !== "done" && (
              <button
                onClick={handleStartWork}
                title={isCurrentlyActive ? "Právě probíhá" : "Zahájit práci"}
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                style={isCurrentlyActive
                  ? { background: "#22C55E20", color: "#22C55E" }
                  : { background: "#f7592f14", color: "#f7592f" }}
              >
                {isCurrentlyActive
                  ? <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
                  : <Play className="w-3 h-3 fill-current" />}
              </button>
            )}
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
        style={{
          background: isDone ? "#22C55E08" : isUrgent ? "#EF444408" : "var(--bg-card)",
          borderColor: isDone ? "#22C55E30" : isUrgent ? "rgba(239,68,68,0.22)" : "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {isUrgent && !isDone && (
          <div className="flex items-center gap-1.5 mb-2.5">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#ef4444" }}>Urgentní</span>
          </div>
        )}

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

        <div className="flex items-center justify-between gap-2 pt-4 border-t" style={{ borderColor: isUrgent ? "rgba(239,68,68,0.15)" : "var(--border)" }}>
          <div className="flex items-center gap-3">
            {task.dueDate && (
              <span className="flex items-center gap-1 text-[11.5px] font-medium whitespace-nowrap"
                style={{ color: overdue ? "#ef4444" : "var(--text-3)" }}>
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
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
            {task.status !== "done" && (
              <button
                onClick={handleStartWork}
                title={isCurrentlyActive ? "Právě probíhá" : "Zahájit práci"}
                className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                style={isCurrentlyActive
                  ? { background: "#22C55E20", color: "#22C55E" }
                  : { background: "#f7592f14", color: "#f7592f" }}
              >
                {isCurrentlyActive
                  ? <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
                  : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
            )}
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
