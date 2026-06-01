"use client";

import Link from "next/link";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { Calendar, MessageSquare, Tag } from "lucide-react";
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
          "bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-4 hover:border-orange-500/40 hover:bg-[#1e1e1e] transition-all duration-200 cursor-pointer group",
          compact && "p-3"
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-white group-hover:text-orange-100 transition-colors line-clamp-2 flex-1">
            {task.title}
          </h3>
          <StatusBadge status={task.status} />
        </div>

        {task.description && !compact && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          <PriorityBadge priority={task.priority} />
          {task.category && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${task.category.color}20`, color: task.category.color }}
            >
              <Tag className="w-3 h-3" />
              {task.category.name}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  overdue ? "text-red-400" : "text-gray-500"
                )}
              >
                <Calendar className="w-3 h-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {(task._count?.comments ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MessageSquare className="w-3 h-3" />
                {task._count?.comments}
              </span>
            )}
          </div>
          {task.assignee && (
            <Avatar name={task.assignee.name} src={task.assignee.avatar} size="sm" />
          )}
        </div>
      </div>
    </Link>
  );
}
