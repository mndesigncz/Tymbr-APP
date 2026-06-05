import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, done, description, hourlyRate, assigneeId } = body;

  const subtask = await prisma.subTask.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(done !== undefined && { done }),
      ...(description !== undefined && { description }),
      ...(hourlyRate !== undefined && { hourlyRate: hourlyRate ? Number(hourlyRate) : null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
    },
    include: { assignee: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json(subtask);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  await prisma.subTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
