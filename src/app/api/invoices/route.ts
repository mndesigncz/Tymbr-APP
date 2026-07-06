import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canSeeFinance } from "@/lib/roles";
import { computeTotals, sanitizeItems } from "@/lib/invoice";

export const dynamic = "force-dynamic";

const invoiceInclude = {
  client: true,
  items: { orderBy: { order: "asc" as const } },
};

function guard(session: any): { teamId: string; userId: string } | NextResponse {
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = session.user.teamId as string | undefined;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });
  if (!canSeeFinance(session.user.teamRole)) {
    return NextResponse.json({ error: "Přístup k financím má jen manažer nebo finanční manažer" }, { status: 403 });
  }
  return { teamId, userId: session.user.id as string };
}

// GET /api/invoices?status=&clientId=
export async function GET(req: NextRequest) {
  const session = await getSession();
  const g = guard(session);
  if (g instanceof NextResponse) return g;

  const { searchParams } = new URL(req.url);
  const where: Record<string, any> = { teamId: g.teamId };
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const invoices = await prisma.invoice.findMany({
    where,
    include: invoiceInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

// POST /api/invoices — create (assigns the next number from TeamBilling)
export async function POST(req: NextRequest) {
  const session = await getSession();
  const g = guard(session);
  if (g instanceof NextResponse) return g;

  const body = await req.json();
  if (!body.clientId) return NextResponse.json({ error: "Vyber klienta" }, { status: 400 });
  const client = await prisma.client.findUnique({ where: { id: body.clientId } });
  if (!client || client.teamId !== g.teamId) {
    return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
  }

  const items = sanitizeItems(body.items);
  if (items.length === 0) return NextResponse.json({ error: "Faktura musí mít alespoň jednu položku" }, { status: 400 });

  // Billing settings drive numbering, VAT and due date defaults.
  let billing = await prisma.teamBilling.findUnique({ where: { teamId: g.teamId } });
  if (!billing) {
    billing = await prisma.teamBilling.create({
      data: { teamId: g.teamId, invoicePrefix: String(new Date().getFullYear()) },
    });
  }
  const number = `${billing.invoicePrefix}${String(billing.nextNumber).padStart(3, "0")}`;
  const vatRate = billing.vatPayer ? billing.vatRate : 0;
  const { subtotal, vatAmount, total } = computeTotals(items, vatRate);
  const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
  const dueDate = body.dueDate
    ? new Date(body.dueDate)
    : new Date(issueDate.getTime() + billing.dueDays * 86_400_000);

  const invoice = await prisma.invoice.create({
    data: {
      number,
      status: "draft",
      issueDate,
      dueDate,
      subtotal,
      vatRate,
      vatAmount,
      total,
      variableSymbol: number.replace(/\D/g, "") || null,
      note: body.note?.trim() || null,
      teamId: g.teamId,
      clientId: client.id,
      createdById: g.userId,
      items: { create: items.map((i, order) => ({ ...i, order })) },
    },
    include: invoiceInclude,
  });
  await prisma.teamBilling.update({
    where: { teamId: g.teamId },
    data: { nextNumber: billing.nextNumber + 1 },
  });

  return NextResponse.json(invoice, { status: 201 });
}
