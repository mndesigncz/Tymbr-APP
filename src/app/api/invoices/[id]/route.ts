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

async function guardInvoice(id: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Neautorizováno" }, { status: 401 }) };
  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId || !canSeeFinance((session.user as any).teamRole)) {
    return { error: NextResponse.json({ error: "Přístup k financím má jen manažer nebo finanční manažer" }, { status: 403 }) };
  }
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
  if (!invoice || invoice.teamId !== teamId) {
    return { error: NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 }) };
  }
  return { invoice };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guardInvoice(id);
  if ("error" in g) return g.error;
  return NextResponse.json(g.invoice);
}

// PATCH — edit a draft (items, dates, note) or move status: draft → issued → paid
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guardInvoice(id);
  if ("error" in g) return g.error;
  const invoice = g.invoice!;

  const body = await req.json();

  // Status transitions
  if (body.status && body.status !== invoice.status) {
    const allowed: Record<string, string[]> = { draft: ["issued"], issued: ["paid", "draft"], paid: ["issued"] };
    if (!allowed[invoice.status]?.includes(body.status)) {
      return NextResponse.json({ error: "Neplatný přechod stavu" }, { status: 400 });
    }
    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: body.status, paidAt: body.status === "paid" ? new Date() : null },
      include: invoiceInclude,
    });
    return NextResponse.json(updated);
  }

  // Content edits are only possible while it's a draft
  if (invoice.status !== "draft") {
    return NextResponse.json({ error: "Vystavenou fakturu nelze upravovat — vrať ji do konceptu" }, { status: 400 });
  }

  const data: Record<string, any> = {};
  if ("issueDate" in body && body.issueDate) data.issueDate = new Date(body.issueDate);
  if ("dueDate" in body && body.dueDate) data.dueDate = new Date(body.dueDate);
  if ("note" in body) data.note = body.note?.trim() || null;
  if ("variableSymbol" in body) data.variableSymbol = body.variableSymbol?.trim() || null;

  if ("items" in body) {
    const items = sanitizeItems(body.items);
    if (items.length === 0) return NextResponse.json({ error: "Faktura musí mít alespoň jednu položku" }, { status: 400 });
    const totals = computeTotals(items, invoice.vatRate);
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await prisma.invoiceItem.createMany({ data: items.map((i, order) => ({ ...i, order, invoiceId: id })) });
    Object.assign(data, totals);
  }

  const updated = await prisma.invoice.update({ where: { id }, data, include: invoiceInclude });
  return NextResponse.json(updated);
}

// DELETE — drafts only
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guardInvoice(id);
  if ("error" in g) return g.error;
  if (g.invoice!.status !== "draft") {
    return NextResponse.json({ error: "Smazat lze jen koncept" }, { status: 400 });
  }
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
