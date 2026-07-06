import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canSeeFinance } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET /api/invoices/prepare?clientId=&from=&to=
// Suggests invoice items from tracked time (task hourly rate × hours) and task
// expenses on the client's projects in the given period. Fully editable later.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId || !canSeeFinance((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Přístup k financím má jen manažer nebo finanční manažer" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "Vyber klienta" }, { status: 400 });
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(0);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")! + "T23:59:59") : new Date();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.teamId !== teamId) {
    return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
  }

  // All tasks on this client's projects, with finished time entries in range.
  const tasks = await prisma.task.findMany({
    where: { teamId, project: { clientId } },
    select: {
      id: true,
      title: true,
      hourlyRate: true,
      expenses: true,
      completedAt: true,
      project: { select: { name: true } },
      timeEntries: {
        where: { stoppedAt: { not: null, gte: from, lte: to } },
        select: { durationMinutes: true },
      },
    },
  });

  const items: { description: string; quantity: number; unit: string; unitPrice: number }[] = [];
  let minutesWithoutRate = 0;

  for (const t of tasks) {
    const minutes = t.timeEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
    if (minutes > 0) {
      const hours = Math.round((minutes / 60) * 100) / 100;
      if (t.hourlyRate && t.hourlyRate > 0) {
        items.push({
          description: t.project ? `${t.title} (${t.project.name})` : t.title,
          quantity: hours,
          unit: "h",
          unitPrice: t.hourlyRate,
        });
      } else {
        minutesWithoutRate += minutes;
      }
    }
    // Expenses once per task, when the task was completed inside the period.
    if (t.expenses && t.expenses > 0 && t.completedAt && t.completedAt >= from && t.completedAt <= to) {
      items.push({
        description: `Náklady: ${t.title}`,
        quantity: 1,
        unit: "ks",
        unitPrice: t.expenses,
      });
    }
  }

  return NextResponse.json({
    items,
    hoursWithoutRate: Math.round((minutesWithoutRate / 60) * 100) / 100,
  });
}
