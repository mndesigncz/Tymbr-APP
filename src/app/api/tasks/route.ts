import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendTaskAssignedEmail } from "@/lib/email";

const taskInclude = {
  category: true,
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  subtasks: { select: { id: true, done: true } },
  _count: { select: { comments: true } },
};

async function attachAssignees(tasks: any[]): Promise<any[]> {
  if (tasks.length === 0) return tasks;
  const ids = tasks.map((t) => t.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await prisma.$queryRawUnsafe<{ taskId: string; userId: string; name: string; email: string; avatar: string | null }[]>(
    `SELECT ta."taskId", u.id as "userId", u.name, u.email, u.avatar FROM "TaskAssignee" ta JOIN "User" u ON u.id = ta."userId" WHERE ta."taskId" IN (${placeholders}) ORDER BY ta."createdAt"`,
    ...ids
  );
  const byTask = new Map<string, any[]>();
  for (const r of rows) {
    if (!byTask.has(r.taskId)) byTask.set(r.taskId, []);
    byTask.get(r.taskId)!.push({ id: r.userId, name: r.name, email: r.email, avatar: r.avatar });
  }
  return tasks.map((t) => ({
    ...t,
    assignees: byTask.get(t.id) ?? (t.assignee ? [t.assignee] : []),
  }));
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const statuses = searchParams.get("statuses");
  const categoryId = searchParams.get("categoryId");
  const assigneeId = searchParams.get("assigneeId");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");
  const completedFrom = searchParams.get("completedFrom");
  const completedTo = searchParams.get("completedTo");
  const teamId = (session.user as any).teamId;

  if (!teamId) return NextResponse.json([]);

  const where: Record<string, any> = { teamId };
  const and: Record<string, any>[] = [];
  if (statuses) {
    where.status = { in: statuses.split(",").map((s) => s.trim()) };
  } else if (status) {
    where.status = status;
  }
  if (categoryId) where.categoryId = categoryId;
  const assigneeIds = searchParams.get("assigneeIds");
  if (assigneeIds) {
    where.assigneeId = { in: assigneeIds.split(",").map((s) => s.trim()) };
  } else if (assigneeId) {
    where.assigneeId = assigneeId;
  }
  if (priority) where.priority = priority;
  if (search) {
    and.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (completedFrom || completedTo) {
    where.completedAt = {};
    if (completedFrom) where.completedAt.gte = new Date(completedFrom);
    if (completedTo) where.completedAt.lte = new Date(completedTo);
  }
  // Visibility filter: private tasks are only visible to their creator
  const userId = (session.user as any).id;
  and.push({
    OR: [
      { visibility: "team" },
      { visibility: null },
      { visibility: "private", createdById: userId },
    ],
  });
  if (and.length > 0) where.AND = and;

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json(await attachAssignees(tasks));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, description, status, priority, dueDate, startDate, categoryId, hourlyRate, recurring } = body;
    // assigneeIds: new multi-assignee array; assigneeId: legacy single
    const assigneeIds: string[] = Array.isArray(body.assigneeIds) ? body.assigneeIds.filter(Boolean) : [];
    if (!assigneeIds.length && body.assigneeId) assigneeIds.push(body.assigneeId);
    const primaryAssigneeId = assigneeIds[0] ?? null;

    if (!title) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

    const teamId = (session.user as any).teamId;
    if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });

    const finalStatus = status || "todo";
    const completedAt = finalStatus === "done" ? new Date() : null;

    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO "Task" (
        id, title, description, status, priority, "dueDate", "startDate",
        "categoryId", "assigneeId", "hourlyRate", "completedAt",
        "createdById", "teamId", recurring, "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text,
        ${title},
        ${description ?? null},
        ${finalStatus},
        ${priority || "medium"},
        ${dueDate ? new Date(dueDate) : null},
        ${startDate ? new Date(startDate) : null},
        ${categoryId || null},
        ${primaryAssigneeId},
        ${hourlyRate ? Number(hourlyRate) : null},
        ${completedAt},
        ${session.user.id},
        ${teamId},
        ${recurring || "none"},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    const taskId = rows[0].id;

    // Insert multi-assignees
    for (const uid of assigneeIds) {
      await prisma.$executeRaw`
        INSERT INTO "TaskAssignee" (id, "taskId", "userId")
        VALUES (gen_random_uuid()::text, ${taskId}, ${uid})
        ON CONFLICT DO NOTHING
      `;
    }

    const task = await prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
    const taskWithAssignees = task ? (await attachAssignees([task]))[0] : task;

    // Notify newly assigned users (excluding the creator)
    const allAssignees = taskWithAssignees?.assignees ?? [];
    for (const a of allAssignees) {
      if (a.id !== session.user.id && a.email) {
        sendTaskAssignedEmail({
          to: a.email,
          assigneeName: a.name ?? "",
          taskTitle: title,
          taskId,
          assignerName: session.user.name ?? "Správce",
        });
      }
    }

    return NextResponse.json(taskWithAssignees, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
