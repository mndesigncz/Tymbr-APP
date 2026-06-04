"use client";

import { useState } from "react";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/types";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { ScrollFadeX } from "@/components/ui/ScrollFadeX";

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

export function KanbanBoard({ tasks, onStatusChange }: KanbanBoardProps) {
  const statuses = useStatusConfig();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(key);
  };

  const handleDrop = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (draggingId && onStatusChange) {
      const task = tasks.find((t) => t.id === draggingId);
      if (task && task.status !== key) onStatusChange(draggingId, key);
    }
    setDraggingId(null);
    setOverColumn(null);
  };

  return (
    <ScrollFadeX className="flex gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" fadeColor="var(--bg-page)">
      {statuses.map((status) => {
        const colTasks = tasks.filter((t) => t.status === status.key);
        const isOver = overColumn === status.key;

        return (
          <div
            key={status.key}
            className="flex flex-col rounded-3xl p-4 transition-all w-[290px] flex-shrink-0"
            style={isOver
              ? { background: "var(--accent-soft)", outline: "2px dashed var(--accent)", outlineOffset: "-2px" }
              : { background: "var(--bg-subtle)" }
            }
            onDragOver={(e) => handleDragOver(e, status.key)}
            onDrop={(e) => handleDrop(e, status.key)}
            onDragLeave={() => setOverColumn(null)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-4 px-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                <span className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                  {status.label}
                </span>
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                  style={{ background: "var(--bg-card)", color: "var(--text-3)" }}>
                  {colTasks.length}
                </span>
              </div>
              <Link href={`/tasks/new?status=${status.key}`}>
                <button className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.05]"
                  style={{ color: "var(--text-2)" }}>
                  <Plus className="w-4 h-4" />
                </button>
              </Link>
            </div>

            {/* Column body */}
            <div className="flex-1 flex flex-col gap-4 min-h-[140px]">
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
    </ScrollFadeX>
  );
}
