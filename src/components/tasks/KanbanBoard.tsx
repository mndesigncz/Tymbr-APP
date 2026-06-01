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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
      {COLUMNS.map((status) => {
        const color = STATUS_COLORS[status];
        const colTasks = grouped[status] || [];
        const isOver = overColumn === status;

        return (
          <div
            key={status}
            className="flex flex-col min-h-0"
            onDragOver={(e) => handleDragOver(e, status)}
            onDrop={(e) => handleDrop(e, status)}
            onDragLeave={() => setOverColumn(null)}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-semibold text-gray-300">{STATUS_LABELS[status]}</span>
                <span className="text-xs text-gray-500 bg-[#2a2a2a] px-1.5 py-0.5 rounded-md font-medium">
                  {colTasks.length}
                </span>
              </div>
              <Link href={`/tasks/new?status=${status}`}>
                <button className="p-1 rounded-lg hover:bg-[#2a2a2a] text-gray-500 hover:text-white transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </Link>
            </div>

            <div
              className={`flex-1 flex flex-col gap-3 min-h-[200px] p-2 rounded-2xl transition-all duration-200 ${
                isOver ? "bg-orange-500/5 border border-dashed border-orange-500/40" : "bg-[#141414] border border-[#1e1e1e]"
              }`}
            >
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
                <div className="flex-1 flex items-center justify-center text-xs text-gray-600 py-8">
                  Žádné úkoly
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
