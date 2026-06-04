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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  if (!task) return NextResponse.json({ error: "Úkol nenalezen" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { title, description, status, priority, dueDate, startDate, categoryId, assigneeId, hourlyRate } = body;

    // Capture previous assignee to detect a real change
    const prevTask = assigneeId !== undefined
      ? await prisma.task.findUnique({ where: { id }, select: { assigneeId: true } })
      : null;

    // Status change: track completedAt and log status history
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
      // Close current open status history entry and open new one
      if (existing && existing.status !== status) {
        const now = new Date();
        const openEntry = existing.statusHistory[0];
        if (openEntry) {
          const minutes = Math.max(1, Math.round((now.getTime() - new Date(openEntry.startedAt).getTime()) / 60000));
          await prisma.taskStatusHistory.update({
            where: { id: openEntry.id },
            data: { endedAt: now, minutes },
          });
        }
        await prisma.taskStatusHistory.create({
          data: { taskId: id, status, startedAt: now },
        });
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
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(hourlyRate !== undefined && { hourlyRate: hourlyRate ? Number(hourlyRate) : null }),
        ...completedAtUpdate,
      },
      include: taskInclude,
    });
    // Notify new assignee if they changed and are not the editor
    if (
      assigneeId &&
      task.assignee &&
      prevTask?.assigneeId !== assigneeId &&
      task.assignee.id !== session.user.id &&
      task.assignee.email
    ) {
      sendTaskAssignedEmail({
        to: task.assignee.email,
        assigneeName: task.assignee.name ?? "",
        taskTitle: task.title,
        taskId: task.id,
        assignerName: session.user.name ?? "Správce",
      });
    }

    return NextResponse.json(task);
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
