import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const taskInclude = {
  category: true,
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  _count: { select: { comments: true } },
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const statuses = searchParams.get("statuses"); // comma-separated e.g. "todo,in_progress,review"
  const categoryId = searchParams.get("categoryId");
  const assigneeId = searchParams.get("assigneeId");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");
  const completedFrom = searchParams.get("completedFrom");
  const completedTo = searchParams.get("completedTo");
  const teamId = (session.user as any).teamId;

  const where: Record<string, any> = {};
  // Show tasks belonging to team OR legacy tasks with no teamId (migration compat)
  if (teamId) where.OR = [{ teamId }, { teamId: null }];
  if (statuses) {
    where.status = { in: statuses.split(",").map((s) => s.trim()) };
  } else if (status) {
    where.status = status;
  }
  if (categoryId) where.categoryId = categoryId;
  if (assigneeId) where.assigneeId = assigneeId;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (completedFrom || completedTo) {
    where.completedAt = {};
    if (completedFrom) where.completedAt.gte = new Date(completedFrom);
    if (completedTo) where.completedAt.lte = new Date(completedTo);
  }

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, description, status, priority, dueDate, startDate, categoryId, assigneeId, hourlyRate } = body;

    if (!title) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

    const teamId = (session.user as any).teamId;
    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || "todo",
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        categoryId: categoryId || null,
        assigneeId: assigneeId || null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        completedAt: status === "done" ? new Date() : null,
        createdById: session.user.id,
        teamId: teamId || null,
      },
      include: taskInclude,
    });
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
