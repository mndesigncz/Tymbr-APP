import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

const entryInclude = {
  task: { include: { category: true } },
  subtask: { select: { id: true, title: true, hourlyRate: true } },
  user: { select: { id: true, name: true, avatar: true } },
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const allUsers = searchParams.get("allUsers") === "true";
  const teamId = (session.user as any).teamId;
  const teamRole = (session.user as any).teamRole;

  // Only managers (owner/admin) may view other members' entries. Regular
  // members are always restricted to their own data, regardless of the flag.
  const canSeeTeam = allUsers && teamId && isManager(teamRole);

  const where: Record<string, any> = canSeeTeam
    ? { user: { teamMemberships: { some: { teamId } } } }
    : { userId: session.user.id };
  // Always scope to the current team's tasks
  if (teamId) where.task = { teamId };
  if (taskId) where.taskId = taskId;
  if (dateFrom || dateTo) {
    where.startedAt = {};
    if (dateFrom) where.startedAt.gte = new Date(dateFrom);
    if (dateTo) where.startedAt.lte = new Date(dateTo);
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: entryInclude,
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const body = await req.json();
  const { taskId, subtaskId } = body;
  if (!taskId) return NextResponse.json({ error: "taskId je povinný" }, { status: 400 });

  // Stop any active entry for this user first
  const active = await prisma.timeEntry.findFirst({
    where: { userId: session.user.id, stoppedAt: null },
  });
  if (active) {
    const duration = Math.max(1, Math.round((Date.now() - new Date(active.startedAt).getTime()) / 60000));
    await prisma.timeEntry.update({
      where: { id: active.id },
      data: { stoppedAt: new Date(), durationMinutes: duration },
    });
  }

  // Auto-advance: if the task is still in "todo", move it to "in_progress"
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { status: true } });
  if (task?.status === "todo") {
    await prisma.task.update({ where: { id: taskId }, data: { status: "in_progress" } });
  }

  const entry = await prisma.timeEntry.create({
    data: { userId: session.user.id, taskId, subtaskId: subtaskId || null },
    include: entryInclude,
  });

  return NextResponse.json(entry, { status: 201 });
}
