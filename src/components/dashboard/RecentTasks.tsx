import Link from "next/link";
import { TaskCard } from "@/components/tasks/TaskCard";
import type { Task } from "@/types";

interface RecentTasksProps {
  tasks: Task[];
  title?: string;
}

export function RecentTasks({ tasks, title = "Nedávné úkoly" }: RecentTasksProps) {
  return (
    <div className="rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{title}</h2>
        <Link href="/tasks" className="text-[12px] font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--accent)" }}>
          Vše
        </Link>
      </div>
      <div className="p-3 space-y-2">
        {tasks.length === 0 && (
          <p className="text-[13px] text-center py-6" style={{ color: "var(--text-3)" }}>Žádné úkoly</p>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} compact />
        ))}
      </div>
    </div>
  );
}
