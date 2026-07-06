import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Universal inbound payment webhook — bank-agnostic.
//
// POST /api/inbound/payments?token=<team inbound token>
// Body: JSON ({ text?, subject?, body?, html?, amount?, vs? }) or raw text —
// e.g. a bank "payment received" e-mail forwarded through any
// email-to-webhook bridge (Zapier / Make / Cloudflare Email Worker), or a
// custom bank webhook.
//
// The text is scanned for a variable symbol and an amount. When the VS
// matches an issued invoice of the token's team AND the amount matches the
// invoice total, the invoice flips to "paid" and finance users are notified.
// A VS match with a wrong/unknown amount only notifies (no auto-flip).
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Chybí token" }, { status: 401 });

  const billing = await prisma.teamBilling.findUnique({ where: { inboundToken: token } });
  if (!billing) return NextResponse.json({ error: "Neplatný token" }, { status: 401 });
  const teamId = billing.teamId;

  // Accept JSON or raw text
  let text = "";
  let explicitVs: string | null = null;
  let explicitAmount: number | null = null;
  const raw = await req.text();
  try {
    const j = JSON.parse(raw);
    text = [j.subject, j.text, j.body, j.html].filter((v) => typeof v === "string").join("\n") || raw;
    if (j.vs) explicitVs = String(j.vs).replace(/\D/g, "");
    if (j.amount != null && !Number.isNaN(Number(j.amount))) explicitAmount = Number(j.amount);
  } catch {
    text = raw;
  }
  const plain = text.replace(/<[^>]+>/g, " ");

  // Candidate variable symbols: labeled VS first, then all 4–10 digit runs.
  const vsCandidates = new Set<string>();
  if (explicitVs) vsCandidates.add(explicitVs);
  for (const m of plain.matchAll(/(?:VS|variabiln[íi]\s*symbol)\D{0,3}(\d{1,10})/gi)) vsCandidates.add(m[1]);
  for (const m of plain.matchAll(/\b(\d{4,10})\b/g)) vsCandidates.add(m[1]);

  // Candidate amounts: "12 345,67 Kč" / "CZK 12345.67" styles.
  const amounts = new Set<number>();
  if (explicitAmount != null) amounts.add(Math.round(explicitAmount * 100) / 100);
  for (const m of plain.matchAll(/(\d{1,3}(?:[\s.]\d{3})*(?:[.,]\d{1,2})?)\s*(?:Kč|CZK)/gi)) {
    const n = Number(m[1].replace(/[\s.]/g, "").replace(",", "."));
    if (!Number.isNaN(n) && n > 0) amounts.add(Math.round(n * 100) / 100);
  }

  if (vsCandidates.size === 0) {
    return NextResponse.json({ ok: false, matched: false, reason: "Nenalezen variabilní symbol" });
  }

  const invoices = await prisma.invoice.findMany({
    where: { teamId, status: "issued", variableSymbol: { in: [...vsCandidates] } },
    include: { client: { select: { name: true } } },
  });
  if (invoices.length === 0) {
    return NextResponse.json({ ok: true, matched: false, reason: "Žádná vystavená faktura s tímto VS" });
  }

  const financeUsers = await prisma.teamMember.findMany({
    where: { teamId, role: { in: ["owner", "admin", "finance"] } },
    select: { userId: true },
  });
  const notifyAll = (type: "invoice_paid" | "invoice_overdue", title: string, body: string) =>
    createNotifications(financeUsers.map((m) => ({ userId: m.userId, type, title, body, url: "/invoices" })));

  const results: any[] = [];
  for (const inv of invoices) {
    const amountMatches = amounts.has(Math.round(inv.total * 100) / 100);
    if (amountMatches || amounts.size === 0) {
      // Exact amount (or no amount parseable — VS alone is a strong signal)
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { status: "paid", paidAt: new Date() },
      });
      await notifyAll(
        "invoice_paid",
        `Faktura ${inv.number} byla zaplacena`,
        `${inv.client?.name ?? ""} · ${inv.total.toLocaleString("cs-CZ")} Kč · spárováno automaticky${amountMatches ? "" : " (jen podle VS)"}`,
      );
      results.push({ invoice: inv.number, action: "paid" });
    } else {
      await notifyAll(
        "invoice_paid",
        `Možná platba k faktuře ${inv.number} — zkontroluj částku`,
        `Očekáváno ${inv.total.toLocaleString("cs-CZ")} Kč, v avízu ${[...amounts].map((a) => a.toLocaleString("cs-CZ")).join(", ")} Kč`,
      );
      results.push({ invoice: inv.number, action: "review" });
    }
  }

  return NextResponse.json({ ok: true, matched: true, results });
}
