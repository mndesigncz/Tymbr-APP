import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { Header } from "@/components/layout/Header";
import { DashboardBody } from "@/components/dashboard/DashboardBody";
import { StartWorkButton } from "@/components/layout/StartWorkButton";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { Task } from "@/types";

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

  // Strictly team-scoped. Without a team there is no data to show.
  const teamScope = { teamId: teamId ?? "__none__" };
  const catScope = { teamId: teamId ?? "__none__" };

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
  ]);

  const todo = allTasks.filter((t) => t.status === "todo").length;
  const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
  const doneTotal = await prisma.task.count({ where: { ...teamScope, status: "done" } });

  // Member-specific counts (used when not a manager)
  const myTodo = myTasks.filter((t) => t.status === "todo").length;
  const myInProgress = myTasks.filter((t) => t.status === "in_progress").length;
  const myDoneTotal = await prisma.task.count({ where: { ...teamScope, assigneeId: session!.user.id, status: "done" } });

  // Monthly earnings — managers see the team's total, members see their own.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEntries = teamId
    ? await prisma.timeEntry.findMany({
        where: {
          startedAt: { gte: monthStart },
          stoppedAt: { not: null },
          ...(manager
            ? { user: { teamMemberships: { some: { teamId } } } }
            : { userId: session!.user.id }),
          task: { teamId },
        },
        select: {
          durationMinutes: true,
          task: { select: { hourlyRate: true } },
          subtask: { select: { hourlyRate: true } },
        },
      })
    : [];
  const monthEarning = Math.round(
    monthEntries.reduce((sum, e) => {
      const rate = e.subtask?.hourlyRate ?? e.task?.hourlyRate ?? 0;
      return sum + ((e.durationMinutes ?? 0) / 60) * rate;
    }, 0)
  );

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
                <span>Nový úkol</span>
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
      />
    </div>
  );
}
