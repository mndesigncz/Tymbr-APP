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
        title={`Dobrý den, ${session?.user.name?.split(" ")[0]} 👋`}
        subtitle={`${new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
        actions={
          <Link href="/tasks/new">
            <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nový úkol</span>
            </button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Celkem úkolů" value={allTasks.length} icon={CheckSquare} color="#F97316" />
          <StatsCard title="K provedení" value={todo} icon={Clock} color="#3B82F6" />
          <StatsCard title="Probíhá" value={inProgress} icon={CheckCircle2} color="#EAB308" />
          <StatsCard title="Po termínu" value={overdueCount} icon={AlertCircle} color="#EF4444" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <RecentTasks tasks={recent} title="Sdílená nástěnka – poslední úkoly" />

            {overdueList.length > 0 && (
              <div className="bg-[#1a1a1a] border border-red-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <h2 className="text-base font-semibold text-white">Po termínu</h2>
                  <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                    {overdueList.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {overdueList.map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {myTasksList.length > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-5">
                <h2 className="text-base font-semibold text-white mb-4">Moje úkoly</h2>
                <div className="space-y-3">
                  {myTasksList.map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">Kategorie</h2>
                <Link href="/categories" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
                  Spravovat
                </Link>
              </div>
              <div className="space-y-2">
                {categories.length === 0 && (
                  <p className="text-sm text-gray-500">Žádné kategorie</p>
                )}
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/tasks?categoryId=${cat.id}`}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[#2a2a2a] transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{cat._count.tasks}</span>
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
