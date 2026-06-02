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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Dobré ráno" : hour < 18 ? "Dobrý den" : "Dobrý večer";
  const firstName = session?.user.name?.split(" ")[0];

  return (
    <div>
      <Header
        title={`${greeting}, ${firstName}`}
        subtitle="Mějte přehled o úkolech a postupu vašeho týmu."
        actions={
          <Link href="/tasks/new">
            <button className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all hover:opacity-90 shadow-sm"
              style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(247,89,47,0.25)" }}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nový úkol</span>
            </button>
          </Link>
        }
      />

      <div className="px-6 lg:px-8 pt-6 pb-10 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Celkem úkolů" value={allTasks.length} icon={CheckSquare} highlight />
          <StatsCard title="K provedení"  value={todo}            icon={Clock}        color="#6366f1" />
          <StatsCard title="Probíhá"      value={inProgress}      icon={CheckCircle2} color="#eab308" />
          <StatsCard title="Po termínu"   value={overdueCount}    icon={AlertCircle}  color="#ef4444" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <RecentTasks tasks={recent} title="Poslední úkoly týmu" />

            {overdueList.length > 0 && (
              <div className="rounded-3xl border" style={{ background: "var(--bg-card)", borderColor: "rgba(239,68,68,0.18)", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-center gap-2 px-6 pt-6 pb-4">
                  <AlertCircle className="w-[18px] h-[18px] text-red-500" />
                  <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Po termínu</h2>
                  <span className="text-[11.5px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
                    {overdueList.length}
                  </span>
                </div>
                <div className="px-6 pb-6 space-y-3">
                  {overdueList.map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {myTasksList.length > 0 && (
              <div className="rounded-3xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="px-6 pt-6 pb-4">
                  <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Moje úkoly</h2>
                </div>
                <div className="px-6 pb-6 space-y-3">
                  {myTasksList.map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Kategorie</h2>
                <Link href="/categories" className="text-[13px] font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: "var(--accent)" }}>
                  Spravovat
                </Link>
              </div>
              <div className="px-4 pb-4 space-y-0.5">
                {categories.length === 0 && (
                  <p className="text-[13px] px-2 py-3" style={{ color: "var(--text-3)" }}>Žádné kategorie</p>
                )}
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/tasks?categoryId=${cat.id}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-black/[0.03]"
                    style={{ color: "var(--text-2)" }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-[13.5px] font-medium" style={{ color: "var(--text-1)" }}>{cat.name}</span>
                    </div>
                    <span className="text-[12px] font-medium px-2 py-0.5 rounded-md"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>{cat._count.tasks}</span>
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
