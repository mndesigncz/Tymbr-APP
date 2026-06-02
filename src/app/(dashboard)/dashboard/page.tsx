import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentTasks } from "@/components/dashboard/RecentTasks";
import { TaskCard } from "@/components/tasks/TaskCard";
import { CheckSquare, Clock, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Task } from "@/types";

export default async function DashboardPage() {
  const session = await getSession();

  const [allTasks, myTasks, overdueTasks, categories] = await Promise.all([
    prisma.task.findMany({
      include: {
        category: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        createdBy: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.task.findMany({
      where: { assigneeId: session!.user.id },
      include: {
        category: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        createdBy: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { not: "done" },
      },
      include: {
        category: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        createdBy: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.category.findMany({ include: { _count: { select: { tasks: true } } } }),
  ]);

  const todo = allTasks.filter((t) => t.status === "todo").length;
  const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
  const done = allTasks.filter((t) => t.status === "done").length;
  const overdueCount = overdueTasks.length;

  const recent = allTasks.slice(0, 6) as unknown as Task[];
  const myTasksList = myTasks as unknown as Task[];
  const overdueList = overdueTasks as unknown as Task[];

  return (
    <div>
      <Header
        title={`Přehled`}
        subtitle={new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}
        actions={
          <Link href="/tasks/new">
            <button className="flex items-center gap-2 text-white px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors hover:opacity-90"
              style={{ background: "var(--accent)" }}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nový úkol</span>
            </button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard title="Celkem úkolů" value={allTasks.length} icon={CheckSquare} color="#f97316" />
          <StatsCard title="K provedení"  value={todo}            icon={Clock}        color="#6366f1" />
          <StatsCard title="Probíhá"      value={inProgress}      icon={CheckCircle2} color="#eab308" />
          <StatsCard title="Po termínu"   value={overdueCount}    icon={AlertCircle}  color="#ef4444" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            <RecentTasks tasks={recent} title="Poslední úkoly týmu" />

            {overdueList.length > 0 && (
              <div className="rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "rgba(239,68,68,0.2)" }}>
                <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>Po termínu</h2>
                  <span className="text-[11px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                    {overdueList.length}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {overdueList.map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {myTasksList.length > 0 && (
              <div className="rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                  <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>Moje úkoly</h2>
                </div>
                <div className="p-3 space-y-2">
                  {myTasksList.map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>Kategorie</h2>
                <Link href="/categories" className="text-[12px] font-medium hover:opacity-80 transition-opacity"
                  style={{ color: "var(--accent)" }}>
                  Spravovat
                </Link>
              </div>
              <div className="p-3 space-y-0.5">
                {categories.length === 0 && (
                  <p className="text-[12px] px-2 py-3" style={{ color: "var(--text-3)" }}>Žádné kategorie</p>
                )}
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/tasks?categoryId=${cat.id}`}
                    className="flex items-center justify-between px-2 py-2 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: "var(--text-2)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-[13px]">{cat.name}</span>
                    </div>
                    <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{cat._count.tasks}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
