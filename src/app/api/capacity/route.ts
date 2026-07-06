import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canSeeFinance } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET /api/capacity — per-member workload snapshot for managers/finance:
// open tasks, estimated remaining hours, hours tracked this week, leave status.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });
  if (!canSeeFinance((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Vytížení týmu vidí jen manažer nebo finanční manažer" }, { status: 403 });
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const horizon = new Date(now.getTime() + 21 * 86_400_000);

  const [members, openTasks, weekEntries, vacations] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId },
      select: { role: true, user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.task.findMany({
      where: { teamId, status: { not: "done" } },
      select: {
        estimatedMinutes: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        assignees: { select: { userId: true } },
      },
    }),
    prisma.timeEntry.findMany({
      where: { task: { teamId }, stoppedAt: { not: null, gte: weekStart } },
      select: { userId: true, durationMinutes: true },
    }),
    prisma.vacation.findMany({
      where: { teamId, approvalStatus: "approved", endDate: { gte: now }, startDate: { lte: horizon } },
      select: { userId: true, type: true, startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const byUser = new Map<string, {
    openTasks: number; estimatedMinutes: number; overdue: number; urgent: number;
    trackedMinutesWeek: number;
    onLeaveNow: boolean; nextLeave: { type: string; startDate: Date; endDate: Date } | null;
  }>();
  const ensure = (id: string) => {
    if (!byUser.has(id)) byUser.set(id, {
      openTasks: 0, estimatedMinutes: 0, overdue: 0, urgent: 0,
      trackedMinutesWeek: 0, onLeaveNow: false, nextLeave: null,
    });
    return byUser.get(id)!;
  };

  for (const t of openTasks) {
    const assigneeIds = t.assignees.length ? t.assignees.map((a) => a.userId) : t.assigneeId ? [t.assigneeId] : [];
    for (const uid of assigneeIds) {
      const u = ensure(uid);
      u.openTasks += 1;
      u.estimatedMinutes += t.estimatedMinutes ?? 0;
      if (t.dueDate && t.dueDate < now) u.overdue += 1;
      if (t.priority === "urgent") u.urgent += 1;
    }
  }
  for (const e of weekEntries) ensure(e.userId).trackedMinutesWeek += e.durationMinutes ?? 0;
  for (const v of vacations) {
    const u = ensure(v.userId);
    if (v.startDate <= now && v.endDate >= now) u.onLeaveNow = true;
    if (!u.nextLeave && v.startDate > now) u.nextLeave = { type: v.type, startDate: v.startDate, endDate: v.endDate };
  }

  return NextResponse.json(
    members.map((m) => ({
      user: m.user,
      role: m.role,
      ...(byUser.get(m.user.id) ?? {
        openTasks: 0, estimatedMinutes: 0, overdue: 0, urgent: 0,
        trackedMinutesWeek: 0, onLeaveNow: false, nextLeave: null,
      }),
    }))
  );
}
