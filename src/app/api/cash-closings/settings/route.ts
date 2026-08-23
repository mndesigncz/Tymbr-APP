import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canSeeFinance } from "@/lib/roles";

export const dynamic = "force-dynamic";

// PATCH { cashStandard } — set the team's standard register cash.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | null;
  const teamRole = (session.user as any).teamRole;
  if (!teamId) return NextResponse.json({ error: "Nejsi v žádném týmu" }, { status: 400 });
  if (!canSeeFinance(teamRole)) return NextResponse.json({ error: "Přístup jen pro finance/správce" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const cashStandard = Math.max(0, Number(b.cashStandard) || 0);

  const billing = await prisma.teamBilling.upsert({
    where: { teamId },
    create: { teamId, cashStandard },
    update: { cashStandard },
    select: { cashStandard: true },
  });

  return NextResponse.json(billing);
}
