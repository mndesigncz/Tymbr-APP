import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotifications } from "@/lib/notify";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["vacation", "sick", "personal"];

const vacationInclude = {
  user: { select: { id: true, name: true, avatar: true } },
  approvedBy: { select: { id: true, name: true, avatar: true } },
};

// GET /api/vacations?from=&to=&userId=&status=
// Lists the team's vacations (all members). Optional date-range / user / status filters.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");

  const where: Record<string, any> = { teamId };
  if (userId) where.userId = userId;
  if (status) where.approvalStatus = status;
  // Overlap with [from, to]: startDate <= to AND endDate >= from
  if (from) where.endDate = { gte: new Date(from) };
  if (to) where.startDate = { lte: new Date(to) };

  const vacations = await prisma.vacation.findMany({
    where,
    include: vacationInclude,
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(vacations);
}

// POST /api/vacations — request a vacation (status: pending). Notifies team managers.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const userId = session.user.id as string;
  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });

  const body = await req.json();
  const type = VALID_TYPES.includes(body.type) ? body.type : "vacation";
  const note: string | null = body.note?.trim() || null;

  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: "Vyplň začátek i konec" }, { status: 400 });
  }
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Neplatné datum" }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "Konec nesmí být před začátkem" }, { status: 400 });
  }

  const vacation = await prisma.vacation.create({
    data: { type, startDate, endDate, note, userId, teamId, approvalStatus: "pending" },
    include: vacationInclude,
  });

  // Notify team managers (owner / admin), excluding the requester.
  const managers = await prisma.teamMember.findMany({
    where: { teamId, role: { in: ["owner", "admin"] }, userId: { not: userId } },
    select: { userId: true },
  });
  if (managers.length) {
    const label = TYPE_LABELS[type] ?? "Dovolenou";
    void createNotifications(
      managers.map((m) => ({
        userId: m.userId,
        type: "vacation_requested" as const,
        title: `${vacation.user.name} žádá o schválení: ${label}`,
        body: formatRange(startDate, endDate),
        url: "/vacation",
      }))
    );
  }

  return NextResponse.json(vacation, { status: 201 });
}

const TYPE_LABELS: Record<string, string> = {
  vacation: "Dovolená",
  sick: "Nemoc",
  personal: "Volno",
};

function formatRange(a: Date, b: Date): string {
  const f = (d: Date) => d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
  return a.getTime() === b.getTime() ? f(a) : `${f(a)} – ${f(b)}`;
}
