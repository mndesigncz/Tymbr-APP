import type { Invoice, TeamBilling } from "@/types";
import { czAccountToIban, buildSpayd } from "@/lib/invoice";

// jsPDF's built-in Helvetica has no Czech glyphs — we embed DejaVu Sans from
// /public/fonts at runtime. If the font can't be fetched, we fall back to
// Helvetica and strip diacritics so the PDF never renders mojibake.
function stripDiacritics(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function registerCzechFont(doc: any): Promise<boolean> {
  try {
    const load = async (file: string) => {
      const res = await fetch(`/fonts/${file}`);
      if (!res.ok) throw new Error(String(res.status));
      const buf = new Uint8Array(await res.arrayBuffer());
      let bin = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < buf.length; i += CHUNK) {
        bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
      }
      return btoa(bin);
    };
    const [regular, bold] = await Promise.all([
      load("DejaVuSans.ttf"),
      load("DejaVuSans-Bold.ttf"),
    ]);
    doc.addFileToVFS("DejaVuSans.ttf", regular);
    doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
    doc.addFileToVFS("DejaVuSans-Bold.ttf", bold);
    doc.addFont("DejaVuSans-Bold.ttf", "DejaVu", "bold");
    return true;
  } catch {
    return false;
  }
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

function fmtMoney(n: number): string {
  return `${n.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
}

export async function downloadInvoicePdf(invoice: Invoice, billing: TeamBilling) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();

  const hasCzech = await registerCzechFont(doc);
  const FONT = hasCzech ? "DejaVu" : "helvetica";
  const ascii = (v: string | null | undefined) => (hasCzech ? (v ?? "") : stripDiacritics(v));

  // Header
  doc.setFontSize(22);
  doc.setFont(FONT, "bold");
  doc.text(`Faktura ${ascii(invoice.number)}`, 14, 20);
  if (invoice.status === "draft") {
    doc.setFontSize(10);
    doc.setTextColor(230, 80, 40);
    doc.text("KONCEPT", W - 14, 20, { align: "right" });
    doc.setTextColor(0);
  }

  // Supplier / customer blocks
  doc.setFontSize(9);
  doc.setFont(FONT, "bold");
  doc.text("DODAVATEL", 14, 34);
  doc.text(ascii("ODBĚRATEL"), W / 2 + 4, 34);
  doc.setFont(FONT, "normal");

  const supplier = [
    ascii(billing.supplierName),
    ...ascii(billing.address).split("\n"),
    billing.ico ? `IČO: ${ascii(billing.ico)}` : "",
    billing.dic ? `DIČ: ${ascii(billing.dic)}` : (billing.vatPayer ? "" : ascii("Není plátce DPH")),
  ].filter(Boolean);
  const c = invoice.client;
  const customer = [
    ascii(c?.name),
    ascii(c?.contactName),
    ...ascii(c?.address).split("\n"),
    c?.ico ? `IČO: ${ascii(c.ico)}` : "",
    c?.dic ? `DIČ: ${ascii(c.dic)}` : "",
  ].filter(Boolean);

  supplier.forEach((line, i) => doc.text(line, 14, 40 + i * 4.5));
  customer.forEach((line, i) => doc.text(line, W / 2 + 4, 40 + i * 4.5));

  // Dates & payment info
  const infoY = 40 + Math.max(supplier.length, customer.length) * 4.5 + 6;
  const info: [string, string][] = [
    [ascii("Datum vystavení:"), fmtDate(invoice.issueDate)],
    [ascii("Datum splatnosti:"), fmtDate(invoice.dueDate)],
    ...(billing.bankAccount ? [[ascii("Bankovní účet:"), ascii(billing.bankAccount)] as [string, string]] : []),
    ...(invoice.variableSymbol ? [[ascii("Variabilní symbol:"), invoice.variableSymbol] as [string, string]] : []),
  ];
  doc.setFontSize(9);
  info.forEach(([k, v], i) => {
    doc.setFont(FONT, "normal");
    doc.text(k, 14, infoY + i * 4.5);
    doc.setFont(FONT, "bold");
    doc.text(v, 55, infoY + i * 4.5);
  });

  // Items table
  const tableY = infoY + info.length * 4.5 + 6;
  autoTable(doc, {
    startY: tableY,
    head: [[ascii("Položka"), ascii("Množství"), "MJ", "Cena/MJ", "Celkem"]],
    body: (invoice.items ?? []).map((i) => [
      ascii(i.description),
      String(i.quantity),
      ascii(i.unit),
      ascii(fmtMoney(i.unitPrice)),
      ascii(fmtMoney(i.quantity * i.unitPrice)),
    ]),
    styles: { fontSize: 9, cellPadding: 3, font: FONT },
    headStyles: { fillColor: [247, 89, 47], textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  // Totals
  let y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  const totalLine = (label: string, value: string, bold = false) => {
    doc.setFont(FONT, bold ? "bold" : "normal");
    doc.text(label, W - 80, y);
    doc.text(ascii(value), W - 14, y, { align: "right" });
    y += 5.5;
  };
  if (invoice.vatRate > 0) {
    totalLine(ascii("Základ daně:"), fmtMoney(invoice.subtotal));
    totalLine(`DPH ${invoice.vatRate} %:`, fmtMoney(invoice.vatAmount));
  }
  doc.setFontSize(12);
  totalLine(ascii("Celkem k úhradě:"), fmtMoney(invoice.total), true);

  // QR payment (SPAYD) when we can derive an IBAN
  const iban = billing.bankAccount ? czAccountToIban(billing.bankAccount) : null;
  if (iban && invoice.total > 0) {
    try {
      const QRCode = (await import("qrcode")).default;
      const spayd = buildSpayd({
        iban,
        amount: invoice.total,
        vs: invoice.variableSymbol,
        message: ascii(`Faktura ${invoice.number}`),
      });
      const qrDataUrl = await QRCode.toDataURL(spayd, { margin: 1, width: 240 });
      y += 4;
      doc.addImage(qrDataUrl, "PNG", 14, y - 12, 34, 34);
      doc.setFontSize(8);
      doc.setFont(FONT, "normal");
      doc.text("QR platba", 14, y + 26);
    } catch {
      // QR is best-effort — the invoice is complete without it.
    }
  }

  // Notes
  const noteY = Math.max(y + 34, (doc as any).lastAutoTable.finalY + 50);
  doc.setFontSize(8.5);
  doc.setFont(FONT, "normal");
  const notes = [ascii(invoice.note), ascii(billing.footerNote)].filter(Boolean);
  notes.forEach((n, i) => doc.text(n!, 14, noteY + i * 4.5, { maxWidth: W - 28 }));

  doc.save(`faktura-${invoice.number}.pdf`);
}
