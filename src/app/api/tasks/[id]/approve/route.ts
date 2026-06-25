import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotifications } from "@/lib/notify";
import { getAccessibleTask } from "@/lib/access";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const accessible = await getAccessibleTask(id, session);
  if (!accessible) return NextResponse.json({ error: "Úkol nenalezen" }, { status: 404 });

  const { action } = await req.json(); // "approved" | "rejected"
  if (action !== "approved" && action !== "rejected") {
    return NextResponse.json({ error: "Neplatná akce" }, { status: 400 });
  }

  // Verify the caller is the effective approver (category approver or task custom approver)
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      category: { select: { approvalEnabled: true, approverId: true } },
    },
  });

  if (!task) return NextResponse.json({ error: "Úkol nenalezen" }, { status: 404 });
  const effectiveApproverId = task.category?.approvalEnabled
    ? task.category.approverId
    : (task as any).customApproverId;
  if (!effectiveApproverId || effectiveApproverId !== session.user.id) {
    return NextResponse.json({ error: "Nemáš oprávnění schvalovat tento úkol" }, { status: 403 });
  }

  const newStatus = action === "approved" ? "done" : "in_progress";
  const now = new Date();

  await prisma.task.update({
    where: { id },
    data: {
      approvalStatus: action,
      approvedById: session.user.id,
      approvedAt: now,
      status: newStatus,
      ...(newStatus === "done" && !task.completedAt ? { completedAt: now } : {}),
      ...(newStatus === "in_progress" ? { completedAt: null } : {}),
    },
  });

  // Notify assignees
  const assignees = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT "userId" FROM "TaskAssignee" WHERE "taskId" = ${id}
  `;
  const toNotify = assignees.map((a) => a.userId).filter((uid) => uid !== session.user.id);

  if (toNotify.length > 0) {
    const approverName = session.user.name ?? "Schvalovatel";
    void createNotifications(toNotify.map((userId) => ({
      userId,
      type: (action === "approved" ? "task_approved" : "task_rejected") as any,
      title: action === "approved" ? `Úkol schválen: ${task.title}` : `Úkol zamítnut: ${task.title}`,
      body: `${approverName} ${action === "approved" ? "schválil/a" : "zamítl/a"} úkol`,
      url: `/tasks/${id}`,
    })));
  }

  const updated = await prisma.task.findUnique({
    where: { id },
    include: {
      category: { include: { approver: { select: { id: true, name: true, avatar: true } } } },
      approvedBy: { select: { id: true, name: true, avatar: true } },
      createdBy: { select: { id: true, name: true, email: true, avatar: true } },
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
      comments: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: "asc" } },
      subtasks: { orderBy: { order: "asc" }, include: { assignee: { select: { id: true, name: true, avatar: true } } } },
      statusHistory: { orderBy: { startedAt: "asc" } },
      timeEntries: { where: { stoppedAt: { not: null } }, select: { id: true, durationMinutes: true, userId: true, subtaskId: true, startedAt: true, stoppedAt: true } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(updated);
}
