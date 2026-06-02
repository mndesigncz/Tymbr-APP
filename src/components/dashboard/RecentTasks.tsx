import Link from "next/link";
import { TaskCard } from "@/components/tasks/TaskCard";
import type { Task } from "@/types";

interface RecentTasksProps {
  tasks: Task[];
  title?: string;
}

export function RecentTasks({ tasks, title = "Nedávné úkoly" }: RecentTasksProps) {
  return (
    <div className="rounded-3xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-5">
        <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>{title}</h2>
        <Link href="/tasks" className="text-[13px] font-semibold hover:opacity-80 transition-opacity"
          style={{ color: "var(--accent)" }}>
          Zobrazit vše
        </Link>
      </div>
      <div className="px-6 pb-7 space-y-4">
        {tasks.length === 0 && (
          <p className="text-[13.5px] text-center py-8" style={{ color: "var(--text-3)" }}>Žádné úkoly</p>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} compact />
        ))}
      </div>
    </div>
  );
}
