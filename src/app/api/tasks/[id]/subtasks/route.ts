import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const subtasks = await prisma.subTask.findMany({
    where: { taskId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(subtasks);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const count = await prisma.subTask.count({ where: { taskId: id } });
  const subtask = await prisma.subTask.create({
    data: { title: title.trim(), taskId: id, order: count },
  });
  return NextResponse.json(subtask, { status: 201 });
}
