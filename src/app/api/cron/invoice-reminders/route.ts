import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily: notify finance-capable members about issued invoices past their due
// date. Re-reminds every 3 days so the feed isn't spammed.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const remindBefore = new Date(now.getTime() - 3 * 86_400_000);

  const overdue = await prisma.invoice.findMany({
    where: {
      status: "issued",
      dueDate: { lt: now },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: remindBefore } }],
    },
    include: { client: { select: { name: true } } },
  });
  if (overdue.length === 0) return NextResponse.json({ ok: true, reminded: 0 });

  const teamIds = [...new Set(overdue.map((i) => i.teamId))];
  const financeMembers = await prisma.teamMember.findMany({
    where: { teamId: { in: teamIds }, role: { in: ["owner", "admin", "finance"] } },
    select: { teamId: true, userId: true },
  });
  const byTeam = new Map<string, string[]>();
  for (const m of financeMembers) {
    byTeam.set(m.teamId, [...(byTeam.get(m.teamId) ?? []), m.userId]);
  }

  let sent = 0;
  for (const inv of overdue) {
    const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000);
    const userIds = byTeam.get(inv.teamId) ?? [];
    if (userIds.length) {
      await createNotifications(userIds.map((userId) => ({
        userId,
        type: "invoice_overdue" as const,
        title: `Faktura ${inv.number} je ${days} ${days === 1 ? "den" : days < 5 ? "dny" : "dní"} po splatnosti`,
        body: `${inv.client?.name ?? ""} · ${inv.total.toLocaleString("cs-CZ")} Kč`,
        url: "/invoices",
      })));
      sent += userIds.length;
    }
    await prisma.invoice.update({ where: { id: inv.id }, data: { lastReminderAt: now } });
  }

  return NextResponse.json({ ok: true, overdue: overdue.length, notified: sent });
}
