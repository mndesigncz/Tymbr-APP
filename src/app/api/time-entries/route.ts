import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const entryInclude = {
  task: {
    include: { category: true },
  },
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, any> = { userId: session.user.id };
  if (taskId) where.taskId = taskId;
  if (dateFrom || dateTo) {
    where.startedAt = {};
    if (dateFrom) where.startedAt.gte = new Date(dateFrom);
    if (dateTo) where.startedAt.lte = new Date(dateTo);
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: entryInclude,
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const body = await req.json();
  const { taskId } = body;
  if (!taskId) return NextResponse.json({ error: "taskId je povinný" }, { status: 400 });

  // Stop any active entry for this user first
  const active = await prisma.timeEntry.findFirst({
    where: { userId: session.user.id, stoppedAt: null },
  });
  if (active) {
    const duration = Math.max(1, Math.round((Date.now() - new Date(active.startedAt).getTime()) / 60000));
    await prisma.timeEntry.update({
      where: { id: active.id },
      data: { stoppedAt: new Date(), durationMinutes: duration },
    });
  }

  const entry = await prisma.timeEntry.create({
    data: { userId: session.user.id, taskId },
    include: entryInclude,
  });

  return NextResponse.json(entry, { status: 201 });
}
