import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canSeeFinance } from "@/lib/roles";
import { computeCash, parseMovements, parsePayouts } from "@/lib/cashClosing";

export const dynamic = "force-dynamic";

async function guard(id: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Neautorizováno" }, { status: 401 }) };
  const teamId = (session.user as any).teamId as string | null;
  const teamRole = (session.user as any).teamRole;
  if (!teamId || !canSeeFinance(teamRole)) return { error: NextResponse.json({ error: "Přístup odepřen" }, { status: 403 }) };
  const closing = await prisma.cashClosing.findFirst({ where: { id, teamId } });
  if (!closing) return { error: NextResponse.json({ error: "Nenalezeno" }, { status: 404 }) };
  return { closing, teamId };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g.error) return g.error;
  const prev = g.closing;

  const b = await req.json().catch(() => ({}));
  const movements = "movements" in b ? parseMovements(b.movements) : parseMovements(JSON.parse(prev.movements || "[]"));
  const payouts = "payouts" in b ? parsePayouts(b.payouts) : parsePayouts(JSON.parse(prev.payouts || "[]"));
  const input = {
    cashStart: b.cashStart != null ? Number(b.cashStart) : prev.cashStart,
    standard: b.standard != null ? Number(b.standard) : prev.standard,
    salesCash: b.salesCash != null ? Number(b.salesCash) : prev.salesCash,
    salesCard: b.salesCard != null ? Number(b.salesCard) : prev.salesCard,
    cashWithdrawn: b.cashWithdrawn != null ? Number(b.cashWithdrawn) : prev.cashWithdrawn,
    movements, payouts,
    toSafe: b.toSafe != null ? Number(b.toSafe) : prev.toSafe,
    safeStart: b.safeStart != null ? Number(b.safeStart) : prev.safeStart,
  };
  const c = computeCash(input);

  const updated = await prisma.cashClosing.update({
    where: { id },
    data: {
      ...(b.date ? { date: new Date(b.date) } : {}),
      cashStart: input.cashStart, standard: input.standard,
      salesCash: input.salesCash, salesCard: input.salesCard, cashWithdrawn: input.cashWithdrawn,
      movements: JSON.stringify(movements), payouts: JSON.stringify(payouts),
      toSafe: input.toSafe, cashEnd: c.cashEnd, safeStart: input.safeStart, safeEnd: c.safeEnd,
      ...(b.note !== undefined ? { note: b.note?.trim() || null } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g.error) return g.error;
  await prisma.cashClosing.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
