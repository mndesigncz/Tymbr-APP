import Link from "next/link";
import { TaskCard } from "@/components/tasks/TaskCard";
import type { Task } from "@/types";

interface RecentTasksProps {
  tasks: Task[];
  title?: string;
}

export function RecentTasks({ tasks, title = "Nedávné úkoly" }: RecentTasksProps) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <Link href="/tasks" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
          Zobrazit vše
        </Link>
      </div>
      <div className="space-y-3">
        {tasks.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">Žádné úkoly</p>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} compact />
        ))}
      </div>
    </div>
  );
}
