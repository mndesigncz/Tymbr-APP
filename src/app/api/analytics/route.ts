import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canSeeFinance } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET /api/analytics?from=&to= — tracked time and earnings grouped by
// project, client and member for the given period (managers/finance only).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });
  if (!canSeeFinance((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Analytiku vidí jen manažer nebo finanční manažer" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(0);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")! + "T23:59:59") : new Date();

  const [entries, users, expenseTasks] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { task: { teamId }, stoppedAt: { not: null, gte: from, lte: to } },
      select: {
        durationMinutes: true,
        userId: true,
        task: {
          select: {
            hourlyRate: true,
            project: { select: { id: true, name: true, color: true, client: { select: { id: true, name: true } } } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { teamMemberships: { some: { teamId } } },
      select: { id: true, name: true, avatar: true },
    }),
    prisma.task.findMany({
      where: { teamId, expenses: { gt: 0 }, completedAt: { gte: from, lte: to } },
      select: {
        expenses: true,
        project: { select: { id: true, name: true, color: true, client: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  type Bucket = { id: string; name: string; color?: string | null; minutes: number; revenue: number; expenses: number };
  const projects = new Map<string, Bucket>();
  const clients = new Map<string, Bucket>();
  const membersMap = new Map<string, { minutes: number; revenue: number }>();

  const bucket = (map: Map<string, Bucket>, id: string, name: string, color?: string | null) => {
    if (!map.has(id)) map.set(id, { id, name, color, minutes: 0, revenue: 0, expenses: 0 });
    return map.get(id)!;
  };

  let totalMinutes = 0;
  let totalRevenue = 0;
  for (const e of entries) {
    const minutes = e.durationMinutes ?? 0;
    const revenue = (minutes / 60) * (e.task.hourlyRate ?? 0);
    totalMinutes += minutes;
    totalRevenue += revenue;

    const p = e.task.project;
    const pb = bucket(projects, p?.id ?? "none", p?.name ?? "Bez projektu", p?.color);
    pb.minutes += minutes;
    pb.revenue += revenue;
    const cl = p?.client;
    const cb = bucket(clients, cl?.id ?? "none", cl?.name ?? "Bez klienta");
    cb.minutes += minutes;
    cb.revenue += revenue;

    const m = membersMap.get(e.userId) ?? { minutes: 0, revenue: 0 };
    m.minutes += minutes;
    m.revenue += revenue;
    membersMap.set(e.userId, m);
  }

  let totalExpenses = 0;
  for (const t of expenseTasks) {
    totalExpenses += t.expenses ?? 0;
    const p = t.project;
    bucket(projects, p?.id ?? "none", p?.name ?? "Bez projektu", p?.color).expenses += t.expenses ?? 0;
    const cl = p?.client;
    bucket(clients, cl?.id ?? "none", cl?.name ?? "Bez klienta").expenses += t.expenses ?? 0;
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  const sort = (arr: Bucket[]) => arr.map((b) => ({ ...b, revenue: round(b.revenue) })).sort((a, b) => b.revenue - a.revenue || b.minutes - a.minutes);

  return NextResponse.json({
    totals: { minutes: totalMinutes, revenue: round(totalRevenue), expenses: round(totalExpenses) },
    projects: sort([...projects.values()]),
    clients: sort([...clients.values()]),
    members: users
      .map((u) => ({ user: u, ...(membersMap.get(u.id) ?? { minutes: 0, revenue: 0 }) }))
      .map((m) => ({ ...m, revenue: round(m.revenue) }))
      .sort((a, b) => b.minutes - a.minutes),
  });
}
