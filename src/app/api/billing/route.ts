import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canSeeFinance } from "@/lib/roles";

export const dynamic = "force-dynamic";

function guard(session: any): { teamId: string } | NextResponse {
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = session.user.teamId as string | undefined;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });
  if (!canSeeFinance(session.user.teamRole)) {
    return NextResponse.json({ error: "Přístup k financím má jen manažer nebo finanční manažer" }, { status: 403 });
  }
  return { teamId };
}

// GET /api/billing — team billing settings (creates defaults on first read)
export async function GET() {
  const session = await getSession();
  const g = guard(session);
  if (g instanceof NextResponse) return g;

  let billing = await prisma.teamBilling.findUnique({ where: { teamId: g.teamId } });
  if (!billing) {
    const team = await prisma.team.findUnique({ where: { id: g.teamId }, select: { name: true } });
    billing = await prisma.teamBilling.create({
      data: {
        teamId: g.teamId,
        supplierName: team?.name ?? "",
        invoicePrefix: String(new Date().getFullYear()),
      },
    });
  }
  return NextResponse.json(billing);
}

// PUT /api/billing — update settings
export async function PUT(req: NextRequest) {
  const session = await getSession();
  const g = guard(session);
  if (g instanceof NextResponse) return g;

  const body = await req.json();
  const data: Record<string, any> = {};
  for (const key of ["supplierName", "address", "ico", "dic", "bankAccount", "invoicePrefix", "footerNote"] as const) {
    if (key in body) data[key] = typeof body[key] === "string" ? body[key].trim() || (key === "supplierName" || key === "invoicePrefix" ? "" : null) : null;
  }
  if ("vatPayer" in body) data.vatPayer = !!body.vatPayer;
  if ("vatRate" in body) data.vatRate = Math.max(0, Number(body.vatRate) || 0);
  if ("dueDays" in body) data.dueDays = Math.max(1, Math.round(Number(body.dueDays) || 14));
  if ("nextNumber" in body) data.nextNumber = Math.max(1, Math.round(Number(body.nextNumber) || 1));

  const billing = await prisma.teamBilling.upsert({
    where: { teamId: g.teamId },
    update: data,
    create: { teamId: g.teamId, ...data },
  });
  return NextResponse.json(billing);
}
