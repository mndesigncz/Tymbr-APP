import type { Invoice, TeamBilling } from "@/types";
import { czAccountToIban, buildSpayd } from "@/lib/invoice";

// Brand palette — a single decent orange accent over near-black ink on paper.
const ORANGE: [number, number, number] = [247, 89, 47];
const INK: [number, number, number] = [26, 26, 28];
const GRAY: [number, number, number] = [140, 140, 148];
const LINE: [number, number, number] = [226, 226, 230];

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
    const [regular, bold] = await Promise.all([load("DejaVuSans.ttf"), load("DejaVuSans-Bold.ttf")]);
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

function imgFormat(dataUrl: string): string {
  const m = /^data:image\/(png|jpe?g)/i.exec(dataUrl);
  return m && /jpe?g/i.test(m[1]) ? "JPEG" : "PNG";
}
function loadImage(dataUrl: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function downloadInvoicePdf(invoice: Invoice, billing: TeamBilling) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;
  const right = W - M;

  const hasCzech = await registerCzechFont(doc);
  const FONT = hasCzech ? "DejaVu" : "helvetica";
  const t = (v: string | null | undefined) => (hasCzech ? (v ?? "") : stripDiacritics(v));
  const set = (weight: "normal" | "bold", size: number, color: [number, number, number] = INK) => {
    doc.setFont(FONT, weight);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const rule = (yy: number, color: [number, number, number] = LINE, x0 = M, x1 = right, w = 0.3) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(w);
    doc.line(x0, yy, x1, yy);
  };

  /* ── Header: logo + supplier brand (left), FAKTURA + number (right) ── */
  let brandX = M;
  if (billing.logoUrl) {
    const dim = await loadImage(billing.logoUrl);
    if (dim) {
      const h = 13;
      const w = Math.min(45, (h * dim.w) / dim.h);
      try {
        doc.addImage(billing.logoUrl, imgFormat(billing.logoUrl), M, 15, w, h);
        brandX = M + w + 5;
      } catch { /* unsupported image — skip, keep brandX */ }
    }
  }
  set("bold", 14);
  doc.text(t(billing.supplierName) || " ", brandX, 24);

  set("bold", 26);
  doc.text("FAKTURA", right, 24, { align: "right" });
  set("bold", 11, ORANGE);
  doc.text(`#${t(invoice.number)}`, right, 31, { align: "right" });
  if (invoice.status === "draft") {
    set("bold", 8, GRAY);
    doc.text("KONCEPT", right, 36, { align: "right" });
  }

  let y = 46;
  rule(y);
  y += 8;

  /* ── Parties ── */
  const colR = 108;
  set("bold", 7.5, GRAY);
  doc.text("DODAVATEL", M, y);
  doc.text(t("ODBĚRATEL"), colR, y);

  const supplier = [
    t(billing.supplierName),
    ...t(billing.address).split("\n"),
    billing.ico ? `IČO: ${t(billing.ico)}` : "",
    billing.dic ? `DIČ: ${t(billing.dic)}` : (billing.vatPayer ? "" : t("Neplátce DPH")),
  ].filter(Boolean);
  const c = invoice.client;
  const customer = [
    t(c?.name),
    t(c?.contactName),
    ...t(c?.address).split("\n"),
    c?.ico ? `IČO: ${t(c.ico)}` : "",
    c?.dic ? `DIČ: ${t(c.dic)}` : "",
  ].filter(Boolean);

  set("normal", 9.5);
  supplier.forEach((l, i) => doc.text(l!, M, y + 6 + i * 4.6));
  customer.forEach((l, i) => doc.text(l!, colR, y + 6 + i * 4.6));

  y += 6 + Math.max(supplier.length, customer.length) * 4.6 + 8;

  /* ── Dates row ── */
  set("normal", 8.5, GRAY);
  const dateBits = [
    `${t("Vystaveno")}: ${fmtDate(invoice.issueDate)}`,
    `${t("Splatnost")}: ${fmtDate(invoice.dueDate)}`,
    ...(invoice.variableSymbol ? [`${t("VS")}: ${invoice.variableSymbol}`] : []),
  ];
  doc.text(dateBits.join("     "), M, y);
  y += 9;

  /* ── Items ── */
  set("bold", 13);
  doc.text(t("Popis"), M, y);
  y += 3;
  rule(y);
  y += 7;

  for (const it of invoice.items ?? []) {
    const lineTotal = it.quantity * it.unitPrice;
    const hasSub = it.quantity !== 1 || (it.unit && it.unit !== "ks");
    set("normal", 10.5);
    doc.text(t(it.description), M, y, { maxWidth: 120 });
    set("bold", 10.5);
    doc.text(t(fmtMoney(lineTotal)), right, y, { align: "right" });
    if (hasSub) {
      set("normal", 8, GRAY);
      doc.text(`${it.quantity} ${t(it.unit)} × ${t(fmtMoney(it.unitPrice))}`, M, y + 4);
    }
    const bottom = y + (hasSub ? 7 : 3.5);
    rule(bottom);
    y = bottom + 6;
  }

  /* ── Totals (right block; label + value never overlap) ── */
  y += 2;
  const valX = right;
  const lblX = right - 42;
  const totalRow = (label: string, value: string, size: number, labelColor: [number, number, number], valueColor: [number, number, number], bold = false) => {
    set(bold ? "bold" : "normal", size, labelColor);
    doc.text(label, lblX, y, { align: "right" });
    set(bold ? "bold" : "normal", size, valueColor);
    doc.text(value, valX, y, { align: "right" });
    y += size * 0.62 + 2;
  };
  if (invoice.vatRate > 0) {
    totalRow(t("Základ daně"), t(fmtMoney(invoice.subtotal)), 9.5, GRAY, INK);
    totalRow(`${t("DPH")} ${invoice.vatRate} %`, t(fmtMoney(invoice.vatAmount)), 9.5, GRAY, INK);
    y += 1;
    rule(y - 3, LINE, lblX - 20, valX, 0.3);
  }
  totalRow(t("Celkem k úhradě"), t(fmtMoney(invoice.total)), 13, INK, ORANGE, true);
  y += 2;

  /* ── Payment (with QR) + Terms ── */
  let bottomY = Math.max(y + 6, 232);
  // QR payment (SPAYD) when a Czech account converts to IBAN
  const iban = billing.bankAccount ? czAccountToIban(billing.bankAccount) : null;
  let payTextX = M;
  if (iban && invoice.total > 0) {
    try {
      const QRCode = (await import("qrcode")).default;
      const spayd = buildSpayd({ iban, amount: invoice.total, vs: invoice.variableSymbol, message: t(`Faktura ${invoice.number}`) });
      const url = await QRCode.toDataURL(spayd, { margin: 0, width: 240 });
      doc.addImage(url, "PNG", M, bottomY, 26, 26);
      payTextX = M + 31;
    } catch { /* QR best-effort */ }
  }

  set("bold", 10);
  doc.text(t("Platební údaje"), payTextX, bottomY + 3);
  set("normal", 9, INK);
  const payLines = [
    billing.bankAccount ? `${t("Účet")}: ${t(billing.bankAccount)}` : "",
    iban ? `IBAN: ${iban}` : "",
    invoice.variableSymbol ? `${t("VS")}: ${invoice.variableSymbol}` : "",
  ].filter(Boolean);
  payLines.forEach((l, i) => doc.text(l!, payTextX, bottomY + 9 + i * 4.6));

  const terms = [t(invoice.note), t(billing.footerNote)].filter(Boolean) as string[];
  if (terms.length) {
    set("bold", 10);
    doc.text(t("Poznámka"), colR, bottomY + 3);
    set("normal", 9, GRAY);
    let ty = bottomY + 9;
    for (const term of terms) {
      const wrapped = doc.splitTextToSize(term, right - colR);
      doc.text(wrapped, colR, ty);
      ty += wrapped.length * 4.6 + 2;
    }
  }

  doc.save(`faktura-${invoice.number}.pdf`);
}
