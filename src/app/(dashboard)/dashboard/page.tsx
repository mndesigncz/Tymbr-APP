import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentTasks } from "@/components/dashboard/RecentTasks";
import { UrgentTasks } from "@/components/dashboard/UrgentTasks";
import { StartWorkButton } from "@/components/layout/StartWorkButton";
import { CheckSquare, Clock, CheckCircle2, Plus, CheckCheck } from "lucide-react";
import Link from "next/link";
import { formatRelative } from "@/lib/utils";
import type { Task } from "@/types";

const taskInclude = {
  category: true,
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  _count: { select: { comments: true } },
};

export default async function DashboardPage() {
  const session = await getSession();
  const teamId = (session!.user as any).teamId;

  // Team scope: tasks belonging to the team OR legacy tasks with no team (migration compat)
  const teamScope = teamId ? { OR: [{ teamId }, { teamId: null }] } : {};
  const catScope = teamId ? { OR: [{ teamId }, { teamId: null }] } : {};

  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const [allTasks, myTasks, categories, doneTasks] = await Promise.all([
    prisma.task.findMany({
      where: { ...teamScope, status: { not: "done" } },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.task.findMany({
      where: { assigneeId: session!.user.id, status: { not: "done" } },
      include: taskInclude,
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    prisma.category.findMany({ where: catScope, include: { _count: { select: { tasks: true } } } }),
    prisma.task.findMany({
      where: { ...teamScope, status: "done" },
      include: taskInclude,
      orderBy: { completedAt: "desc" },
      take: 6,
    }),
  ]);

  const todo = allTasks.filter((t) => t.status === "todo").length;
  const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
  const doneTotal = await prisma.task.count({ where: { ...teamScope, status: "done" } });

  // Priority ordering: urgent > high > medium > low
  const PRIO: Record<string, number> = { urgent: 3, high: 2, medium: 1, low: 0 };
  const byPriority = (a: { priority: string; dueDate: Date | null }, b: { priority: string; dueDate: Date | null }) => {
    const p = (PRIO[b.priority] ?? 0) - (PRIO[a.priority] ?? 0);
    if (p !== 0) return p;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  };

  // Urgent = urgent priority OR due within a week (and not done)
  const isUrgent = (t: { priority: string; dueDate: Date | null }) =>
    t.priority === "urgent" || (t.dueDate != null && new Date(t.dueDate) <= weekFromNow);

  const sortedAll = [...allTasks].sort(byPriority);
  const urgentAll = sortedAll.filter(isUrgent).slice(0, 8) as unknown as Task[];
  const urgentMine = [...myTasks].sort(byPriority).filter(isUrgent).slice(0, 8) as unknown as Task[];
  const recent = sortedAll.slice(0, 6) as unknown as Task[];
  const myTasksList = [...myTasks].sort(byPriority).slice(0, 12) as unknown as Task[];
  const doneList = doneTasks as unknown as Task[];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Dobré ráno" : hour < 18 ? "Dobrý den" : "Dobrý večer";
  const firstName = session?.user.name?.split(" ")[0];

  return (
    <div>
      <Header
        title={`${greeting}, ${firstName}`}
        subtitle="Mějte přehled o úkolech a postupu vašeho týmu."
        actions={
          <div className="flex items-center gap-2">
            <StartWorkButton />
            <Link href="/tasks/new">
              <button className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all hover:opacity-90 shadow-sm"
                style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(247,89,47,0.25)" }}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nový úkol</span>
              </button>
            </Link>
          </div>
        }
      />

      <div className="px-6 lg:px-8 pt-2 pb-12 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard title="Aktivní úkoly"  value={allTasks.length} icon={CheckSquare}  highlight />
          <StatsCard title="K provedení"    value={todo}            icon={Clock}        color="#6366f1" />
          <StatsCard title="Probíhá"        value={inProgress}      icon={CheckCircle2} color="#eab308" />
          <StatsCard title="Hotovo celkem"  value={doneTotal}       icon={CheckCheck}   color="#22c55e" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-7">
            <UrgentTasks allUrgent={urgentAll} myUrgent={urgentMine} />

            <RecentTasks allTasks={recent} myTasks={myTasksList} />
          </div>

          <div className="space-y-6">
            {/* Done tasks (moved above categories) */}
            {doneList.length > 0 && (
              <div className="rounded-3xl border" style={{ background: "var(--bg-card)", borderColor: "#22C55E20", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-center justify-between px-6 pt-6 pb-5">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-[18px] h-[18px]" style={{ color: "#22C55E" }} />
                    <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Hotové</h2>
                    <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: "#22C55E15", color: "#22C55E" }}>{doneTotal}</span>
                  </div>
                  <Link href="/tasks?tab=done" className="text-[13px] font-semibold hover:opacity-80 transition-opacity"
                    style={{ color: "var(--accent)" }}>
                    Vše
                  </Link>
                </div>
                <div className="px-4 pb-5 space-y-1">
                  {doneList.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-black/[0.03]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#22C55E" }} />
                        <span className="text-[13px] font-medium line-clamp-1" style={{ color: "var(--text-1)" }}>
                          {task.title}
                        </span>
                      </div>
                      {task.completedAt && (
                        <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: "var(--text-3)" }}>
                          {formatRelative(task.completedAt)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Categories (moved below done) */}
            <div className="rounded-3xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between px-6 pt-6 pb-5">
                <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Kategorie</h2>
                <Link href="/categories" className="text-[13px] font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: "var(--accent)" }}>
                  Spravovat
                </Link>
              </div>
              <div className="px-4 pb-5 space-y-1">
                {categories.length === 0 && (
                  <p className="text-[13px] px-2 py-3" style={{ color: "var(--text-3)" }}>Žádné kategorie</p>
                )}
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/tasks?categoryId=${cat.id}`}
                    className="flex items-center justify-between px-3 py-3 rounded-xl transition-colors hover:bg-black/[0.03]"
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
