import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAccessibleTask } from "@/lib/access";

/** Verifies the subtask exists and its parent task is accessible to the caller. */
async function findAccessibleSubtask(id: string, session: Parameters<typeof getAccessibleTask>[1]) {
  const subtask = await prisma.subTask.findUnique({ where: { id }, select: { taskId: true } });
  if (!subtask) return false;
  return !!(await getAccessibleTask(subtask.taskId, session));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  if (!(await findAccessibleSubtask(id, session))) {
    return NextResponse.json({ error: "Podúkol nenalezen" }, { status: 404 });
  }
  const body = await req.json();
  const { title, done, description, hourlyRate, assigneeId, estimatedMinutes } = body;

  const subtask = await prisma.subTask.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(done !== undefined && { done }),
      ...(description !== undefined && { description }),
      ...(hourlyRate !== undefined && { hourlyRate: hourlyRate ? Number(hourlyRate) : null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      ...(estimatedMinutes !== undefined && { estimatedMinutes: estimatedMinutes ? Math.round(Number(estimatedMinutes)) : null }),
    },
    include: { assignee: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json(subtask);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  if (!(await findAccessibleSubtask(id, session))) {
    return NextResponse.json({ error: "Podúkol nenalezen" }, { status: 404 });
  }
  await prisma.subTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
