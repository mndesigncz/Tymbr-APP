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
            className="flex flex-col rounded-3xl p-3 transition-all"
            style={isOver
              ? { background: "var(--accent-soft)", outline: "2px dashed var(--accent)", outlineOffset: "-2px" }
              : { background: "var(--bg-subtle)" }
            }
            onDragOver={(e) => handleDragOver(e, status)}
            onDrop={(e) => handleDrop(e, status)}
            onDragLeave={() => setOverColumn(null)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ background: "var(--bg-card)", color: "var(--text-3)" }}>
                  {colTasks.length}
                </span>
              </div>
              <Link href={`/tasks/new?status=${status}`}>
                <button className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.05]"
                  style={{ color: "var(--text-2)" }}>
                  <Plus className="w-4 h-4" />
                </button>
              </Link>
            </div>

            {/* Column body */}
            <div className="flex-1 flex flex-col gap-3 min-h-[120px]">
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={() => { setDraggingId(null); setOverColumn(null); }}
                  className={draggingId === task.id ? "opacity-40" : ""}
                >
                  <TaskCard task={task} />
                </div>
              ))}
              {colTasks.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-10">
                  <span className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Prázdné</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
