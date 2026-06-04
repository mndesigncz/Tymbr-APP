import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendTaskAssignedEmail } from "@/lib/email";

const taskInclude = {
  category: true,
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  comments: {
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  subtasks: { orderBy: { order: "asc" as const } },
  statusHistory: { orderBy: { startedAt: "asc" as const } },
  timeEntries: {
    where: { stoppedAt: { not: null } },
    select: { id: true, durationMinutes: true, userId: true, subtaskId: true, startedAt: true, stoppedAt: true },
  },
  _count: { select: { comments: true } },
};

async function attachAssignees(task: any): Promise<any> {
  const rows = await prisma.$queryRaw<{ userId: string; name: string; email: string; avatar: string | null }[]>`
    SELECT u.id as "userId", u.name, u.email, u.avatar
    FROM "TaskAssignee" ta
    JOIN "User" u ON u.id = ta."userId"
    WHERE ta."taskId" = ${task.id}
    ORDER BY ta."createdAt"
  `;
  return {
    ...task,
    assignees: rows.length > 0
      ? rows.map((r) => ({ id: r.userId, name: r.name, email: r.email, avatar: r.avatar }))
      : task.assignee ? [task.assignee] : [],
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  if (!task) return NextResponse.json({ error: "Úkol nenalezen" }, { status: 404 });
  return NextResponse.json(await attachAssignees(task));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { title, description, status, priority, dueDate, startDate, categoryId, hourlyRate } = body;

    // Resolve assigneeIds array
    const hasAssigneeIds = "assigneeIds" in body;
    const assigneeIds: string[] | null = hasAssigneeIds
      ? (Array.isArray(body.assigneeIds) ? body.assigneeIds.filter(Boolean) : [])
      : null; // null = not updating assignees
    const legacyAssigneeId = "assigneeId" in body ? body.assigneeId : undefined;

    // Determine primary assigneeId for the Task row
    let primaryAssigneeId: string | null | undefined;
    if (assigneeIds !== null) {
      primaryAssigneeId = assigneeIds[0] ?? null;
    } else if (legacyAssigneeId !== undefined) {
      primaryAssigneeId = legacyAssigneeId || null;
    }

    // Capture previous assignees to detect changes
    const prevAssignees = assigneeIds !== null
      ? await prisma.$queryRaw<{ userId: string }[]>`SELECT "userId" FROM "TaskAssignee" WHERE "taskId" = ${id}`
      : [];
    const prevAssigneeIds = new Set(prevAssignees.map((r) => r.userId));

    // Status tracking
    let completedAtUpdate: { completedAt: Date | null } | undefined;
    if (status !== undefined) {
      const existing = await prisma.task.findUnique({
        where: { id },
        select: { completedAt: true, status: true, statusHistory: { where: { endedAt: null }, take: 1 } },
      });
      if (status === "done") {
        if (!existing?.completedAt) completedAtUpdate = { completedAt: new Date() };
      } else {
        completedAtUpdate = { completedAt: null };
      }
      if (existing && existing.status !== status) {
        const now = new Date();
        const openEntry = existing.statusHistory[0];
        if (openEntry) {
          const minutes = Math.max(1, Math.round((now.getTime() - new Date(openEntry.startedAt).getTime()) / 60000));
          await prisma.taskStatusHistory.update({ where: { id: openEntry.id }, data: { endedAt: now, minutes } });
        }
        await prisma.taskStatusHistory.create({ data: { taskId: id, status, startedAt: now } });
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(primaryAssigneeId !== undefined && { assigneeId: primaryAssigneeId }),
        ...(hourlyRate !== undefined && { hourlyRate: hourlyRate ? Number(hourlyRate) : null }),
        ...completedAtUpdate,
      },
      include: taskInclude,
    });

    // Sync TaskAssignee junction table
    if (assigneeIds !== null) {
      await prisma.$executeRaw`DELETE FROM "TaskAssignee" WHERE "taskId" = ${id}`;
      for (const uid of assigneeIds) {
        await prisma.$executeRaw`
          INSERT INTO "TaskAssignee" (id, "taskId", "userId")
          VALUES (gen_random_uuid()::text, ${id}, ${uid})
          ON CONFLICT DO NOTHING
        `;
      }
      // Notify newly added assignees
      for (const uid of assigneeIds) {
        if (!prevAssigneeIds.has(uid) && uid !== session.user.id) {
          const userRow = await prisma.user.findUnique({ where: { id: uid }, select: { name: true, email: true } });
          if (userRow?.email) {
            sendTaskAssignedEmail({
              to: userRow.email,
              assigneeName: userRow.name ?? "",
              taskTitle: task.title,
              taskId: id,
              assignerName: session.user.name ?? "Správce",
            });
          }
        }
      }
    } else if (legacyAssigneeId !== undefined) {
      // Legacy single-assignee update — sync junction table too
      await prisma.$executeRaw`DELETE FROM "TaskAssignee" WHERE "taskId" = ${id}`;
      if (legacyAssigneeId) {
        await prisma.$executeRaw`
          INSERT INTO "TaskAssignee" (id, "taskId", "userId")
          VALUES (gen_random_uuid()::text, ${id}, ${legacyAssigneeId})
          ON CONFLICT DO NOTHING
        `;
        if (!prevAssigneeIds.has(legacyAssigneeId) && legacyAssigneeId !== session.user.id) {
          const userRow = await prisma.user.findUnique({ where: { id: legacyAssigneeId }, select: { name: true, email: true } });
          if (userRow?.email) {
            sendTaskAssignedEmail({
              to: userRow.email,
              assigneeName: userRow.name ?? "",
              taskTitle: task.title,
              taskId: id,
              assignerName: session.user.name ?? "Správce",
            });
          }
        }
      }
    }

    return NextResponse.json(await attachAssignees(task));
  } catch {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
