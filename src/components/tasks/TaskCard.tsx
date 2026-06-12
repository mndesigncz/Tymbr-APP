"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate, isOverdue } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge } from "./PriorityBadge";
import { Calendar, MessageSquare, Play, AlertTriangle, ListChecks, ChevronRight, RefreshCw, Lock } from "lucide-react";
import type { Task } from "@/types";
import { useTimeTracker } from "@/context/TimeTrackerContext";
import { useStatusConfig } from "@/hooks/useStatusConfig";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  urgent?: boolean;
  showUrgentMark?: boolean;
  onStatusChange?: (taskId: string, status: string) => void;
}

export function TaskCard({ task, compact, urgent, showUrgentMark, onStatusChange }: TaskCardProps) {
  const { start, active } = useTimeTracker();
  const statuses = useStatusConfig();
  const [statusOpen, setStatusOpen] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

  const currentStatus = optimisticStatus ?? task.status;
  const overdue = currentStatus !== "done" && isOverdue(task.dueDate);
  const isCurrentlyActive = active?.taskId === task.id;
  const isUrgent = task.priority === "urgent";
  const isDone = currentStatus === "done";

  const statusCfg = statuses.find((s) => s.key === currentStatus);

  const handleStartWork = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    start(task.id, task.title, task.category?.color);
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatusOpen((o) => !o);
  };

  const handleStatusSelect = async (e: React.MouseEvent, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    setStatusOpen(false);
    if (newStatus === currentStatus) return;
    setOptimisticStatus(newStatus);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    onStatusChange?.(task.id, newStatus);
    window.dispatchEvent(new Event("tymbr:task-updated"));
  };

  const compactBg = isDone ? "var(--success-soft)" : (urgent || isUrgent) ? "var(--danger-soft)" : "var(--bg-subtle)";
  const assignees = task.assignees ?? (task.assignee ? [task.assignee] : []);
  const subtasks = task.subtasks ?? [];
  const subTotal = subtasks.length;
  const subDone = subtasks.filter((s) => s.done).length;

  const StatusDropdown = () => (
    <div className="absolute top-full left-0 mt-1 w-40 rounded-xl overflow-hidden z-50"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", boxShadow: "var(--shadow-overlay)" }}>
      {statuses.map((s) => (
        <button
          key={s.key}
          onMouseDown={(e) => handleStatusSelect(e, s.key)}
          className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] transition-colors hover:bg-[var(--hover)]"
          style={{ color: s.key === currentStatus ? s.color : "var(--text-1)", fontWeight: s.key === currentStatus ? 700 : 500 }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
          {s.label}
          {s.key === currentStatus && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
        </button>
      ))}
    </div>
  );

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
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--danger)" }} />
              )}
              {task.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={task.priority} />
              {task.category && (
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                  style={{ color: task.category.color, background: `${task.category.color}15` }}>
                  {task.category.name}
                </span>
              )}
              {task.dueDate && (
                <span className="flex items-center gap-1 text-[11px] whitespace-nowrap"
                  style={{ color: overdue ? "var(--danger)" : "var(--text-3)" }}>
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  {formatDate(task.dueDate)}
                </span>
              )}
              {subTotal > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded-md"
                  style={{ color: subDone === subTotal ? "var(--success)" : "var(--text-2)", background: "var(--bg-card)" }}>
                  <ListChecks className="w-3 h-3 flex-shrink-0" />
                  {subDone}/{subTotal}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            {currentStatus !== "done" && (
              <button onClick={handleStartWork} title={isCurrentlyActive ? "Právě probíhá" : "Zahájit práci"}
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                style={isCurrentlyActive ? { background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" } : { background: "var(--accent-soft)", color: "var(--accent)" }}>
                {isCurrentlyActive
                  ? <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
                  : <Play className="w-3 h-3 fill-current" />}
              </button>
            )}
            {assignees.length > 0 && (
              <div className="flex -space-x-1.5">
                {assignees.slice(0, 2).map((a) => (
                  <Avatar key={a.id} name={a.name} src={a.avatar} size="sm" className="ring-2 ring-[var(--bg-card)]" />
                ))}
                {assignees.length > 2 && (
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-[var(--bg-card)]"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}>
                    +{assignees.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative">
      {statusOpen && (
        <div className="fixed inset-0 z-40" onMouseDown={() => setStatusOpen(false)} />
      )}
      <Link href={`/tasks/${task.id}`} className="block">
        <div
          className="rounded-2xl border p-5 transition-all duration-150 cursor-pointer group hover:-translate-y-0.5"
          style={{
            background: isDone
              ? "color-mix(in srgb, var(--success) 4%, var(--bg-card))"
              : isUrgent
                ? "color-mix(in srgb, var(--danger) 3%, var(--bg-card))"
                : "var(--bg-card)",
            borderColor: isDone
              ? "color-mix(in srgb, var(--success) 22%, transparent)"
              : isUrgent
                ? "color-mix(in srgb, var(--danger) 22%, transparent)"
                : "var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {isUrgent && !isDone && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} />
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--danger)" }}>Urgentní</span>
            </div>
          )}

          <p className="text-[14px] font-semibold leading-snug line-clamp-2 mb-3" style={{ color: "var(--text-1)" }}>
            {task.title}
          </p>

          {task.description && (
            <p className="text-[12.5px] line-clamp-2 mb-3.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Quick status badge — clickable */}
            <div className="relative">
              <button
                onClick={handleStatusClick}
                className="flex items-center gap-1.5 text-[11.5px] font-semibold px-2 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ color: statusCfg?.color ?? "var(--text-3)", background: `${statusCfg?.color ?? "#6B7280"}15` }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusCfg?.color ?? "#6B7280" }} />
                {statusCfg?.label ?? currentStatus}
              </button>
              {statusOpen && <StatusDropdown />}
            </div>
            <PriorityBadge priority={task.priority} />
            {task.category && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-1 rounded-lg"
                style={{ color: task.category.color, background: `${task.category.color}14` }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: task.category.color }} />
                {task.category.name}
              </span>
            )}
            {task.recurring && task.recurring !== "none" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ color: "var(--info)", background: "var(--info-soft)" }}>
                <RefreshCw className="w-3 h-3" />
                {task.recurring === "daily" ? "Denně" : task.recurring === "weekly" ? "Týdně" : "Měsíčně"}
              </span>
            )}
            {(task.blockedByCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ color: "var(--danger)", background: "var(--danger-soft)" }}>
                <Lock className="w-3 h-3" />
                Blokováno
              </span>
            )}
          </div>

          {subTotal > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="w-3.5 h-3.5 flex-shrink-0" style={{ color: subDone === subTotal ? "var(--success)" : "var(--text-3)" }} />
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(subDone / subTotal) * 100}%`, background: "var(--success)" }} />
              </div>
              <span className="text-[11.5px] font-semibold flex-shrink-0" style={{ color: "var(--text-3)" }}>{subDone}/{subTotal}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-4 border-t" style={{ borderColor: isUrgent ? "color-mix(in srgb, var(--danger) 15%, transparent)" : "var(--border)" }}>
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              {task.dueDate && (
                <span className="flex items-center gap-1 text-[11.5px] font-medium flex-shrink-0 whitespace-nowrap"
                  style={{ color: overdue ? "var(--danger)" : "var(--text-3)" }}>
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  {formatDate(task.dueDate)}
                </span>
              )}
              {(task._count?.comments ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-[11.5px] flex-shrink-0" style={{ color: "var(--text-3)" }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  {task._count?.comments}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {currentStatus !== "done" && (
                <button onClick={handleStartWork} title={isCurrentlyActive ? "Právě probíhá" : "Zahájit práci"}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                  style={isCurrentlyActive ? { background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" } : { background: "var(--accent-soft)", color: "var(--accent)" }}>
                  {isCurrentlyActive
                    ? <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
                    : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
              )}
              {assignees.length > 0 && (
                <div className="flex -space-x-1.5 flex-shrink-0">
                  {assignees.slice(0, 3).map((a) => (
                    <Avatar key={a.id} name={a.name} src={a.avatar} size="sm" className="ring-2 ring-[var(--bg-card)] flex-shrink-0" />
                  ))}
                  {assignees.length > 3 && (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-[var(--bg-card)]"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}>
                      +{assignees.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
