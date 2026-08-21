// Shared math for the daily cash-register closing ("uzávěrka").
// Used both in the form (live preview) and on the server (authoritative save).

export interface Movement { desc: string; amount: number }               // +/-, affects register
export interface Payout { desc: string; amount: number; source: "cash" | "safe" }

export interface CashInput {
  cashStart: number;      // opening register cash
  standard: number;       // target register cash to leave behind
  salesCash: number;      // tržba hotově
  salesCard: number;      // tržba kartou (evidence only)
  cashWithdrawn: number;  // výběr z kasy za den
  movements: Movement[];  // další pohyby (+/-)
  payouts: Payout[];      // výplaty (z kasy / z trezoru)
  toSafe: number;         // vklad přebytku do trezoru
  safeStart: number;      // trezor počáteční
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const sum = (arr: { amount: number }[]) => arr.reduce((s, x) => s + (Number(x.amount) || 0), 0);

export function computeCash(i: CashInput) {
  const movementsSum = sum(i.movements);
  const payoutsCash = sum(i.payouts.filter((p) => p.source === "cash"));
  const payoutsSafe = sum(i.payouts.filter((p) => p.source === "safe"));
  // Register cash before we move the surplus to the safe.
  const cashBeforeSafe = i.cashStart + i.salesCash - i.cashWithdrawn + movementsSum - payoutsCash;
  // Deposit the surplus so the register is left at the standard amount.
  const suggestedToSafe = Math.max(0, r2(cashBeforeSafe - i.standard));
  const cashEnd = r2(cashBeforeSafe - i.toSafe);
  const safeEnd = r2(i.safeStart + i.toSafe - payoutsSafe);
  return {
    movementsSum: r2(movementsSum),
    payoutsCash: r2(payoutsCash),
    payoutsSafe: r2(payoutsSafe),
    salesTotal: r2(i.salesCash + i.salesCard),
    cashBeforeSafe: r2(cashBeforeSafe),
    suggestedToSafe,
    cashEnd,
    safeEnd,
  };
}

/** Coerce arbitrary JSON into a clean movement/payout list. */
export function parseMovements(raw: unknown): Movement[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m: any) => ({ desc: String(m?.desc ?? "").slice(0, 120), amount: Number(m?.amount) || 0 }));
}
export function parsePayouts(raw: unknown): Payout[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p: any) => ({
    desc: String(p?.desc ?? "").slice(0, 120),
    amount: Number(p?.amount) || 0,
    source: p?.source === "safe" ? "safe" : "cash",
  }));
}
