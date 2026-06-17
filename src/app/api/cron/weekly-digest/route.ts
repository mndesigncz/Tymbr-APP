import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWeeklyDigestEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
}

export async function GET(req: Request) {
  // Vercel cron auth
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get all users who have a team and haven't opted out of weekly digest
  const users = await prisma.user.findMany({
    where: { teamMemberships: { some: {} } },
    select: {
      id: true,
      name: true,
      email: true,
      notificationPrefs: true,
      teamMemberships: {
        take: 1,
        orderBy: { joinedAt: "asc" },
        select: { team: { select: { name: true } } },
      },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    // Check opt-out
    if (user.notificationPrefs) {
      try {
        const prefs = JSON.parse(user.notificationPrefs);
        if (prefs.weeklyDigest === false) { skipped++; continue; }
      } catch {
        // malformed prefs — send anyway
      }
    }

    const teamName = user.teamMemberships[0]?.team?.name ?? "Noisium";

    // Fetch overdue tasks (due before today, not done)
    const overdueTasks = await prisma.task.findMany({
      where: {
        assignees: { some: { id: user.id } },
        status: { not: "done" },
        dueDate: { lt: now },
      },
      select: { id: true, title: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Fetch tasks due in the next 7 days (not done, not overdue)
    const dueSoonTasks = await prisma.task.findMany({
      where: {
        assignees: { some: { id: user.id } },
        status: { not: "done" },
        dueDate: { gte: now, lte: weekFromNow },
      },
      select: { id: true, title: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Fetch tasks completed in the last 7 days
    const completedTasks = await prisma.task.findMany({
      where: {
        assignees: { some: { id: user.id } },
        status: "done",
        completedAt: { gte: weekAgo },
      },
      select: { id: true, title: true },
      orderBy: { completedAt: "desc" },
      take: 10,
    });

    // Skip if nothing to show
    if (overdueTasks.length === 0 && dueSoonTasks.length === 0 && completedTasks.length === 0) {
      skipped++;
      continue;
    }

    await sendWeeklyDigestEmail({
      to: user.email,
      name: user.name.split(" ")[0],
      teamName,
      overdue: overdueTasks.map((t) => ({ id: t.id, title: t.title, dueDate: fmtDate(t.dueDate) })),
      dueSoon: dueSoonTasks.map((t) => ({ id: t.id, title: t.title, dueDate: fmtDate(t.dueDate) })),
      completedLastWeek: completedTasks.map((t) => ({ id: t.id, title: t.title })),
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
