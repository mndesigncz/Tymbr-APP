import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendTaskAssignedEmail, sendStatusChangeEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhook";

const taskInclude = {
  category: true,
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  comments: {
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  subtasks: { orderBy: { order: "asc" as const }, include: { assignee: { select: { id: true, name: true, avatar: true } } } },
  statusHistory: { orderBy: { startedAt: "asc" as const } },
  timeEntries: {
    where: { stoppedAt: { not: null } },
    select: { id: true, durationMinutes: true, userId: true, subtaskId: true, startedAt: true, stoppedAt: true },
  },
  _count: { select: { comments: true } },
};

async function attachAssignees(task: any): Promise<any> {
  try {
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
  } catch {
    return { ...task, assignees: task.assignee ? [task.assignee] : [] };
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id }, include: taskInclude });
    if (!task) return NextResponse.json({ error: "Úkol nenalezen" }, { status: 404 });
    return NextResponse.json(await attachAssignees(task));
  } catch (e: any) {
    console.error("[GET /api/tasks/[id]]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { title, description, status, priority, dueDate, startDate, categoryId, hourlyRate, visibility, recurring } = body;

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

    // Status tracking + fetch existing for recurring logic
    let completedAtUpdate: { completedAt: Date | null } | undefined;
    let prevStatus: string | undefined;
    let existingTask: any;
    if (status !== undefined) {
      existingTask = await prisma.task.findUnique({
        where: { id },
        select: {
          completedAt: true, status: true, statusHistory: { where: { endedAt: null }, take: 1 },
          title: true, description: true, priority: true, dueDate: true, categoryId: true,
          hourlyRate: true, teamId: true, createdById: true, assigneeId: true, visibility: true, recurring: true,
        },
      });
      prevStatus = existingTask?.status;
      if (status === "done") {
        if (!existingTask?.completedAt) completedAtUpdate = { completedAt: new Date() };
      } else {
        completedAtUpdate = { completedAt: null };
      }
      if (existingTask && existingTask.status !== status) {
        const now = new Date();
        const openEntry = existingTask.statusHistory[0];
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
        ...(visibility !== undefined && { visibility }),
        ...(recurring !== undefined && { recurring }),
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

    const result = await attachAssignees(task);

    // Send status-change notifications (fire-and-forget)
    if (status !== undefined && prevStatus !== undefined && prevStatus !== status) {
      const changerName = session.user.name ?? "Správce";
      void Promise.allSettled(
        (result.assignees as { id: string; name: string | null; email: string }[])
          .filter((a) => a.id !== session.user.id && a.email)
          .map((a) =>
            sendStatusChangeEmail({
              to: a.email,
              recipientName: a.name ?? "",
              taskTitle: task.title,
              taskId: id,
              oldStatus: prevStatus!,
              newStatus: status,
              changerName,
            })
          )
      );
    }

    // Fire webhooks
    if (task.teamId) {
      const whEvent = status === "done" && prevStatus !== "done"
        ? "task.completed"
        : "task.updated";
      void fireWebhooks(task.teamId, whEvent, { id: task.id, title: task.title, status: task.status, priority: task.priority });
    }

    // Recurring task: spawn next occurrence when marking as done
    if (status === "done" && prevStatus !== "done" && existingTask) {
      const recurringValue = recurring ?? existingTask.recurring;
      if (recurringValue && recurringValue !== "none") {
        const intervals: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };
        const days = intervals[recurringValue];
        if (days) {
          const base = existingTask.dueDate ? new Date(existingTask.dueDate) : new Date();
          base.setDate(base.getDate() + days);
          const nextAssignees = await prisma.$queryRaw<{ userId: string }[]>`
            SELECT "userId" FROM "TaskAssignee" WHERE "taskId" = ${id}
          `;
          const newTask = await prisma.task.create({
            data: {
              title: existingTask.title,
              description: existingTask.description,
              status: "todo",
              priority: existingTask.priority,
              dueDate: base,
              categoryId: existingTask.categoryId,
              hourlyRate: existingTask.hourlyRate,
              teamId: existingTask.teamId,
              createdById: existingTask.createdById,
              assigneeId: existingTask.assigneeId,
              visibility: existingTask.visibility,
              recurring: recurringValue,
            },
          });
          for (const { userId } of nextAssignees) {
            await prisma.$executeRaw`
              INSERT INTO "TaskAssignee" (id, "taskId", "userId")
              VALUES (gen_random_uuid()::text, ${newTask.id}, ${userId})
              ON CONFLICT DO NOTHING
            `;
          }
        }
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  try {
    const task = await prisma.task.findUnique({ where: { id }, select: { title: true, teamId: true } });
    await prisma.task.delete({ where: { id } });
    if (task?.teamId) void fireWebhooks(task.teamId, "task.deleted", { id, title: task.title });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
