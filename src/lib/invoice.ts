// Shared invoice helpers — kept out of route files so they can be imported
// (route modules may only export HTTP handlers).

export function computeTotals(
  items: { quantity: number; unitPrice: number }[],
  vatRate: number,
): { subtotal: number; vatAmount: number; total: number } {
  const subtotal = Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  return { subtotal, vatAmount, total: Math.round((subtotal + vatAmount) * 100) / 100 };
}

export function sanitizeItems(raw: unknown): { description: string; quantity: number; unit: string; unitPrice: number }[] {
  return (Array.isArray(raw) ? raw : [])
    .map((i: any) => ({
      description: String(i.description ?? "").trim(),
      quantity: Number(i.quantity) || 0,
      unit: String(i.unit || "ks"),
      unitPrice: Number(i.unitPrice) || 0,
    }))
    .filter((i) => i.description);
}

/** Czech bank account ("prefix-number/bank") → IBAN, or null when unparsable. */
export function czAccountToIban(account: string): string | null {
  const m = account.replace(/\s/g, "").match(/^(?:(\d{0,6})-)?(\d{2,10})\/(\d{4})$/);
  if (!m) return null;
  const [, prefix = "", number, bank] = m;
  const bban = bank + prefix.padStart(6, "0") + number.padStart(10, "0");
  // ISO 7064 mod-97: move "CZ00" to the end, letters → numbers (C=12, Z=35)
  const numeric = bban + "123500";
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  const check = String(98 - rem).padStart(2, "0");
  return `CZ${check}${bban}`;
}

/** SPAYD string for Czech QR payment. */
export function buildSpayd(opts: { iban: string; amount: number; vs?: string | null; message?: string }): string {
  const parts = [`SPD*1.0*ACC:${opts.iban}`, `AM:${opts.amount.toFixed(2)}`, "CC:CZK"];
  if (opts.vs) parts.push(`X-VS:${opts.vs.replace(/\D/g, "").slice(0, 10)}`);
  if (opts.message) parts.push(`MSG:${opts.message.replace(/[*]/g, " ").slice(0, 60)}`);
  return parts.join("*");
}
