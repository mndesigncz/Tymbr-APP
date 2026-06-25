import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendTaskAssignedEmail, sendStatusChangeEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhook";
import { getAccessibleTask } from "@/lib/access";
import { createNotification, createNotifications } from "@/lib/notify";

const taskInclude = {
  category: {
    include: { approver: { select: { id: true, name: true, avatar: true } } },
  },
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  approvedBy: { select: { id: true, name: true, avatar: true } },
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
    const accessible = await getAccessibleTask(id, session);
    if (!accessible) return NextResponse.json({ error: "Úkol nenalezen" }, { status: 404 });
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
    const accessible = await getAccessibleTask(id, session);
    if (!accessible) return NextResponse.json({ error: "Úkol nenalezen" }, { status: 404 });

    const body = await req.json();
    const { title, description, status, priority, dueDate, startDate, categoryId, hourlyRate, visibility, recurring, icon, estimatedMinutes, expenses } = body;

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
        ...(icon !== undefined && { icon: icon || null }),
        ...(estimatedMinutes !== undefined && { estimatedMinutes: estimatedMinutes ? Math.round(Number(estimatedMinutes)) : null }),
        ...(expenses !== undefined && { expenses: expenses ? Number(expenses) : null }),
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
          void createNotification({
            userId: uid,
            type: "task_assigned",
            title: `Přiřazen/a k úkolu: ${task.title}`,
            body: `Přiřadil/a: ${session.user.name ?? "Správce"}`,
            url: `/tasks/${id}`,
          });
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
          void createNotification({
            userId: legacyAssigneeId,
            type: "task_assigned",
            title: `Přiřazen/a k úkolu: ${task.title}`,
            body: `Přiřadil/a: ${session.user.name ?? "Správce"}`,
            url: `/tasks/${id}`,
          });
        }
      }
    }

    const result = await attachAssignees(task);

    // Send status-change notifications (fire-and-forget)
    if (status !== undefined && prevStatus !== undefined && prevStatus !== status) {
      const changerName = session.user.name ?? "Správce";
      const statusLabels: Record<string, string> = { todo: "K provedení", in_progress: "Probíhá", review: "Ke kontrole", done: "Hotovo" };
      const assigneesToNotify = (result.assignees as { id: string; name: string | null; email: string }[])
        .filter((a) => a.id !== session.user.id);
      void Promise.allSettled(
        assigneesToNotify
          .filter((a) => a.email)
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
      void createNotifications(assigneesToNotify.map((a) => ({
        userId: a.id,
        type: "task_status" as const,
        title: `Status změněn: ${task.title}`,
        body: `${changerName}: ${statusLabels[prevStatus!] ?? prevStatus} → ${statusLabels[status] ?? status}`,
        url: `/tasks/${id}`,
      })));

      // Approval flow: when moving to "review" check if category requires approval
      if (status === "review") {
        const cat = (task as any).category;
        if (cat?.approvalEnabled && cat?.approverId) {
          await prisma.task.update({ where: { id }, data: { approvalStatus: "pending", approvedById: null, approvedAt: null } });
          void createNotification({
            userId: cat.approverId,
            type: "task_approval_requested",
            title: `Ke schválení: ${task.title}`,
            body: `Žádá: ${session.user.name ?? "Člen týmu"}`,
            url: `/tasks/${id}`,
          });
        }
      } else if (prevStatus === "review") {
        // Moving away from review — clear pending approval
        await prisma.task.update({ where: { id }, data: { approvalStatus: null } });
      }
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
    const task = await getAccessibleTask(id, session);
    if (!task) return NextResponse.json({ error: "Úkol nenalezen" }, { status: 404 });
    await prisma.task.delete({ where: { id } });
    if (task.teamId) void fireWebhooks(task.teamId, "task.deleted", { id, title: task.title });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
