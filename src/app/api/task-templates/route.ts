import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json([]);

  const templates = await prisma.taskTemplate.findMany({
    where: { teamId },
    include: { category: { select: { id: true, name: true, color: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const { name, description, status, priority, hourlyRate, categoryId, subtasks } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const template = await prisma.taskTemplate.create({
    data: {
      name: name.trim(),
      description: description || null,
      status: status || "todo",
      priority: priority || "medium",
      hourlyRate: hourlyRate ? Number(hourlyRate) : null,
      categoryId: categoryId || null,
      subtasks: subtasks ?? null,
      teamId,
    },
    include: { category: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(template, { status: 201 });
}
