import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canSeeFinance } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET — recent shifts with attendance (finance/manager), for the pairing view.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | null;
  if (!teamId || !canSeeFinance((session.user as any).teamRole)) return NextResponse.json({ error: "Jen finance/správce" }, { status: 403 });

  const shifts = await prisma.shift.findMany({
    where: { teamId },
    orderBy: { openedAt: "desc" },
    take: 40,
    include: { attendance: { select: { name: true, clockInAt: true, clockOutAt: true } } },
  });

  // Attach the paired closing (if any) so the UI can show the money too.
  const closingIds = shifts.map((s) => s.cashClosingId).filter(Boolean) as string[];
  const closings = closingIds.length
    ? await prisma.cashClosing.findMany({ where: { id: { in: closingIds } }, select: { id: true, salesCash: true, salesCard: true, cashEnd: true, safeEnd: true } })
    : [];
  const byId = new Map(closings.map((c) => [c.id, c]));

  return NextResponse.json(
    shifts.map((s) => ({
      id: s.id, status: s.status, openedAt: s.openedAt, closedAt: s.closedAt,
      attendance: s.attendance,
      closing: s.cashClosingId ? byId.get(s.cashClosingId) ?? null : null,
    }))
  );
}
