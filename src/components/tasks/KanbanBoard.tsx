"use client";

import { useState } from "react";
import { TaskCard } from "./TaskCard";
import type { Task, TaskStatus } from "@/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/types";
import { Plus } from "lucide-react";
import Link from "next/link";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "review", "done"];

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}

export function KanbanBoard({ tasks, onStatusChange }: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  const grouped = COLUMNS.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(status);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggingId && onStatusChange) {
      const task = tasks.find((t) => t.id === draggingId);
      if (task && task.status !== status) {
        onStatusChange(draggingId, status);
      }
    }
    setDraggingId(null);
    setOverColumn(null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((status) => {
        const color = STATUS_COLORS[status];
        const colTasks = grouped[status] || [];
        const isOver = overColumn === status;

        return (
          <div
            key={status}
            className="flex flex-col"
            onDragOver={(e) => handleDragOver(e, status)}
            onDrop={(e) => handleDrop(e, status)}
            onDragLeave={() => setOverColumn(null)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[12.5px] font-medium" style={{ color: "var(--text-2)" }}>
                  {STATUS_LABELS[status]}
                </span>
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                  style={{ background: "var(--bg-card)", color: "var(--text-3)" }}
                >
                  {colTasks.length}
                </span>
              </div>
              <Link href={`/tasks/new?status=${status}`}>
                <button
                  className="p-1 rounded-md transition-colors"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>

            {/* Column body */}
            <div
              className="flex-1 flex flex-col gap-2.5 min-h-[160px] p-2 rounded-xl border transition-all"
              style={isOver
                ? { background: "rgba(249,115,22,0.04)", borderColor: "rgba(249,115,22,0.3)", borderStyle: "dashed" }
                : { background: "var(--bg-surface)", borderColor: "var(--border)" }
              }
            >
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={() => { setDraggingId(null); setOverColumn(null); }}
                  className={draggingId === task.id ? "opacity-30" : ""}
                >
                  <TaskCard task={task} />
                </div>
              ))}
              {colTasks.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-8">
                  <span className="text-[12px]" style={{ color: "var(--text-3)" }}>Prázdné</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
