import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canSeeFinance } from "@/lib/roles";
import { computeCash, parseMovements, parsePayouts } from "@/lib/cashClosing";

export const dynamic = "force-dynamic";

async function guard() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Neautorizováno" }, { status: 401 }) };
  const teamId = (session.user as any).teamId as string | null;
  const teamRole = (session.user as any).teamRole;
  if (!teamId) return { error: NextResponse.json({ error: "Nejsi v žádném týmu" }, { status: 400 }) };
  if (!canSeeFinance(teamRole)) return { error: NextResponse.json({ error: "Přístup jen pro finance/správce" }, { status: 403 }) };
  return { session, teamId, userId: session.user.id as string };
}

// GET — list closings + context for a new one (opening balances + standard).
export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const [closings, billing] = await Promise.all([
    prisma.cashClosing.findMany({
      where: { teamId: g.teamId },
      orderBy: { date: "desc" },
      take: 60,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.teamBilling.findUnique({ where: { teamId: g.teamId }, select: { cashStandard: true } }),
  ]);

  const standard = billing?.cashStandard ?? 6900;
  const last = closings[0];
  const context = {
    standard,
    cashStart: last ? last.cashEnd : standard,   // převzato z poslední směny
    safeStart: last ? last.safeEnd : 0,
  };

  return NextResponse.json({ closings, context });
}

// POST — create a closing (server computes the final balances).
export async function POST(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;

  const b = await req.json().catch(() => ({}));
  const movements = parseMovements(b.movements);
  const payouts = parsePayouts(b.payouts);
  const input = {
    cashStart: Number(b.cashStart) || 0,
    standard: Number(b.standard) || 6900,
    salesCash: Number(b.salesCash) || 0,
    salesCard: Number(b.salesCard) || 0,
    cashWithdrawn: Number(b.cashWithdrawn) || 0,
    movements, payouts,
    toSafe: Number(b.toSafe) || 0,
    safeStart: Number(b.safeStart) || 0,
  };
  const c = computeCash(input);

  const created = await prisma.cashClosing.create({
    data: {
      date: b.date ? new Date(b.date) : new Date(),
      cashStart: input.cashStart,
      standard: input.standard,
      salesCash: input.salesCash,
      salesCard: input.salesCard,
      cashWithdrawn: input.cashWithdrawn,
      movements: JSON.stringify(movements),
      payouts: JSON.stringify(payouts),
      toSafe: input.toSafe,
      cashEnd: c.cashEnd,
      safeStart: input.safeStart,
      safeEnd: c.safeEnd,
      note: b.note?.trim() || null,
      teamId: g.teamId,
      createdById: g.userId,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
