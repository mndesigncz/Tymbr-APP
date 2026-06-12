import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { Header } from "@/components/layout/Header";
import { DashboardBody } from "@/components/dashboard/DashboardBody";
import { StartWorkButton } from "@/components/layout/StartWorkButton";
import { Plus, CalendarPlus } from "lucide-react";
import Link from "next/link";
import type { Task } from "@/types";
import type { MemberStat } from "@/components/dashboard/ManagerAnalytics";

interface CompletionPoint { date: string; count: number }

const taskInclude = {
  category: true,
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  subtasks: { select: { id: true, done: true } },
  _count: { select: { comments: true } },
};

export default async function DashboardPage() {
  const session = await getSession();
  const teamId = (session!.user as any).teamId;
  const teamRole = (session!.user as any).teamRole;
  const manager = isManager(teamRole);

  const teamScope = { teamId: teamId ?? "__none__" };
  const catScope = { teamId: teamId ?? "__none__" };
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Batch 1: all independent queries in parallel
  const [allTasks, myTasks, categories, doneTasks, doneTotal, myDoneTotal, completedInPeriod, teamMembersRaw] =
    await Promise.all([
      prisma.task.findMany({
        where: { ...teamScope, status: { not: "done" } },
        include: taskInclude,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.task.findMany({
        where: { ...teamScope, assigneeId: session!.user.id, status: { not: "done" } },
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
      prisma.task.count({ where: { ...teamScope, status: "done" } }),
      prisma.task.count({ where: { ...teamScope, assigneeId: session!.user.id, status: "done" } }),
      teamId
        ? prisma.task.findMany({
            where: { teamId, status: "done", completedAt: { gte: thirtyDaysAgo, not: null } },
            select: { completedAt: true },
          })
        : Promise.resolve([] as { completedAt: Date | null }[]),
      manager && teamId
        ? prisma.teamMember.findMany({
            where: { teamId },
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
            orderBy: { user: { name: "asc" } },
          })
        : Promise.resolve([] as { userId: string; user: { id: string; name: string; email: string; avatar: string | null } }[]),
    ]);

  const memberIds = teamMembersRaw.map((m) => m.userId);

  // Batch 2: earnings + manager analytics groupBys — all in parallel, using memberIds (no expensive relation traversal)
  const [monthEntries, openByMember, overdueByMember, completedByMember, timeByMember] = await Promise.all([
    teamId
      ? prisma.timeEntry.findMany({
          where: {
            startedAt: { gte: monthStart },
            stoppedAt: { not: null },
            ...(manager && memberIds.length > 0 ? { userId: { in: memberIds } } : { userId: session!.user.id }),
            task: { teamId },
          },
          select: {
            durationMinutes: true,
            task: { select: { hourlyRate: true } },
            subtask: { select: { hourlyRate: true } },
          },
        })
      : Promise.resolve([] as { durationMinutes: number | null; task: { hourlyRate: number | null } | null; subtask: { hourlyRate: number | null } | null }[]),
    manager && teamId
      ? prisma.task.groupBy({ by: ["assigneeId"], where: { teamId, status: { not: "done" }, assigneeId: { not: null } }, _count: true })
      : Promise.resolve([] as { assigneeId: string | null; _count: number }[]),
    manager && teamId
      ? prisma.task.groupBy({ by: ["assigneeId"], where: { teamId, status: { not: "done" }, dueDate: { lt: now }, assigneeId: { not: null } }, _count: true })
      : Promise.resolve([] as { assigneeId: string | null; _count: number }[]),
    manager && teamId
      ? prisma.task.groupBy({ by: ["assigneeId"], where: { teamId, status: "done", completedAt: { gte: monthStart }, assigneeId: { not: null } }, _count: true })
      : Promise.resolve([] as { assigneeId: string | null; _count: number }[]),
    manager && teamId && memberIds.length > 0
      ? prisma.timeEntry.groupBy({ by: ["userId"], where: { userId: { in: memberIds }, stoppedAt: { not: null }, startedAt: { gte: monthStart }, task: { teamId } }, _sum: { durationMinutes: true } })
      : Promise.resolve([] as { userId: string; _sum: { durationMinutes: number | null } }[]),
  ]);

  const monthEarning = Math.round(
    monthEntries.reduce((sum, e) => {
      const rate = e.subtask?.hourlyRate ?? e.task?.hourlyRate ?? 0;
      return sum + ((e.durationMinutes ?? 0) / 60) * rate;
    }, 0)
  );

  const memberStats: MemberStat[] = teamMembersRaw.map((m) => {
    const open = openByMember.find((g) => g.assigneeId === m.userId)?._count ?? 0;
    const overdue = overdueByMember.find((g) => g.assigneeId === m.userId)?._count ?? 0;
    const completed = completedByMember.find((g) => g.assigneeId === m.userId)?._count ?? 0;
    const minutes = timeByMember.find((g) => g.userId === m.userId)?._sum?.durationMinutes ?? 0;
    return {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar ?? null,
      openTasks: open,
      overdueTasks: overdue,
      completedThisMonth: completed,
      hoursThisMonth: Math.round(((minutes ?? 0) / 60) * 10) / 10,
    };
  });

  const todo = allTasks.filter((t) => t.status === "todo").length;
  const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
  const myTodo = myTasks.filter((t) => t.status === "todo").length;
  const myInProgress = myTasks.filter((t) => t.status === "in_progress").length;

  const completionMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    completionMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const t of completedInPeriod) {
    if (t.completedAt) {
      const key = new Date(t.completedAt).toISOString().slice(0, 10);
      if (completionMap.has(key)) completionMap.set(key, (completionMap.get(key) ?? 0) + 1);
    }
  }
  const completionData: CompletionPoint[] = [...completionMap.entries()].map(([date, count]) => ({ date, count }));

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
    <div className="max-w-[1280px] mx-auto w-full">
      <Header
        title={`${greeting}, ${firstName}`}
        subtitle="Mějte přehled o úkolech a postupu vašeho týmu."
        actions={
          <div className="flex items-center gap-2">
            <StartWorkButton />
            <Link href="/calendar?new=event" className="flex-shrink-0">
              <button className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-[var(--hover)]"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}>
                <CalendarPlus className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Událost</span>
              </button>
            </Link>
            <Link href="/tasks/new" className="flex-shrink-0">
              <button className="flex items-center gap-2 text-white px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all hover:opacity-90"
                style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(247,89,47,0.25)" }}>
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Nový úkol</span>
              </button>
            </Link>
          </div>
        }
      />

      <DashboardBody
        manager={manager}
        statActive={manager ? allTasks.length : myTasks.length}
        statTodo={manager ? todo : myTodo}
        statProgress={manager ? inProgress : myInProgress}
        statDone={manager ? doneTotal : myDoneTotal}
        monthEarning={monthEarning}
        urgentAll={urgentAll}
        urgentMine={urgentMine}
        recent={recent}
        myTasksList={myTasksList}
        doneList={doneList}
        doneTotal={doneTotal}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color, count: c._count.tasks }))}
        memberStats={memberStats}
        completionData={completionData}
      />
    </div>
  );
}
