"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCZK } from "@/lib/pricing";
import { computeCash, type Movement, type Payout } from "@/lib/cashClosing";
import { Plus, Trash2, Wallet, Vault, Banknote, CreditCard, Check, Calculator } from "lucide-react";

interface Closing {
  id: string; date: string; cashStart: number; standard: number;
  salesCash: number; salesCard: number; cashWithdrawn: number;
  toSafe: number; cashEnd: number; safeStart: number; safeEnd: number;
  note: string | null; createdBy?: { name: string };
}
interface Ctx { standard: number; cashStart: number; safeStart: number }

const num = (s: string) => Number(String(s).replace(",", ".")) || 0;

export default function CashPage() {
  const [closings, setClosings] = useState<Closing[]>([]);
  const [ctx, setCtx] = useState<Ctx>({ standard: 6900, cashStart: 6900, safeStart: 0 });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // form
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cashStart, setCashStart] = useState("");
  const [standard, setStandard] = useState("");
  const [salesCash, setSalesCash] = useState("");
  const [salesCard, setSalesCard] = useState("");
  const [cashWithdrawn, setCashWithdrawn] = useState("");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [toSafe, setToSafe] = useState("");
  const [safeStart, setSafeStart] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/cash-closings");
    if (r.ok) {
      const d = await r.json();
      setClosings(d.closings ?? []);
      setCtx(d.context);
      setCashStart(String(d.context.cashStart));
      setStandard(String(d.context.standard));
      setSafeStart(String(d.context.safeStart));
    }
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const input = useMemo(() => ({
    cashStart: num(cashStart), standard: num(standard),
    salesCash: num(salesCash), salesCard: num(salesCard), cashWithdrawn: num(cashWithdrawn),
    movements, payouts, toSafe: num(toSafe), safeStart: num(safeStart),
  }), [cashStart, standard, salesCash, salesCard, cashWithdrawn, movements, payouts, toSafe, safeStart]);

  const c = useMemo(() => computeCash(input), [input]);
  const cashOk = Math.abs(c.cashEnd - num(standard)) < 0.5;

  const saveStandard = async () => {
    await fetch("/api/cash-closings/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashStandard: num(standard) }),
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/cash-closings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ...input, note }),
      });
      if (r.ok) {
        // reset the variable parts; opening balances re-derive from the new closing
        setSalesCash(""); setSalesCard(""); setCashWithdrawn("");
        setMovements([]); setPayouts([]); setToSafe(""); setNote("");
        await load();
      }
    } finally { setSaving(false); }
  };

  const removeClosing = async (id: string) => {
    if (!confirm("Smazat tuto uzávěrku?")) return;
    await fetch(`/api/cash-closings/${id}`, { method: "DELETE" });
    load();
  };

  const money = (v: string, set: (s: string) => void, ph = "0", extra?: React.ReactNode) => (
    <div className="relative">
      <Input type="text" inputMode="decimal" value={v} onChange={(e) => set(e.target.value)} placeholder={ph} className="pr-10" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: "var(--text-3)" }}>Kč</span>
      {extra}
    </div>
  );

  const label = (t: string, sub?: string) => (
    <div className="mb-1"><p className="text-[12.5px] font-semibold" style={{ color: "var(--text-2)" }}>{t}</p>
      {sub && <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{sub}</p>}</div>
  );

  if (!loaded) return null;

  return (
    <div className="max-w-[1100px] mx-auto w-full">
      <Header title="Uzávěrka" subtitle="Denní uzávěrka kasy a trezoru" />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* ── Form ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border p-4 sm:p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>{label("Datum")}<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div>{label("Počáteční stav kasy", "převzato z minulé směny")}{money(cashStart, setCashStart)}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>{label("Tržba hotově")}{money(salesCash, setSalesCash)}</div>
              <div>{label("Tržba kartou", "jen evidence, nejde do kasy")}{money(salesCard, setSalesCard)}</div>
            </div>

            <div>{label("Výběr z kasy za den")}{money(cashWithdrawn, setCashWithdrawn)}</div>

            {/* Movements */}
            <div>
              {label("Další pohyby", "kladné = přidat do kasy, záporné = ubrat")}
              <div className="space-y-2">
                {movements.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={m.desc} onChange={(e) => setMovements((p) => p.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} placeholder="Popis" className="flex-1" />
                    <Input type="text" inputMode="decimal" value={String(m.amount ?? "")} onChange={(e) => setMovements((p) => p.map((x, j) => j === i ? { ...x, amount: num(e.target.value) } : x))} placeholder="0" className="w-28" />
                    <button onClick={() => setMovements((p) => p.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-[var(--danger-soft)]" style={{ color: "var(--text-3)" }}><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button onClick={() => setMovements((p) => [...p, { desc: "", amount: 0 }])} className="flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: "var(--accent)" }}><Plus className="w-3.5 h-3.5" /> Přidat pohyb</button>
              </div>
            </div>

            {/* Payouts */}
            <div>
              {label("Výplaty", "z kasy nebo z trezoru")}
              <div className="space-y-2">
                {payouts.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={p.desc} onChange={(e) => setPayouts((a) => a.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} placeholder="Komu / za co" className="flex-1" />
                    <Input type="text" inputMode="decimal" value={String(p.amount ?? "")} onChange={(e) => setPayouts((a) => a.map((x, j) => j === i ? { ...x, amount: num(e.target.value) } : x))} placeholder="0" className="w-24" />
                    <select value={p.source} onChange={(e) => setPayouts((a) => a.map((x, j) => j === i ? { ...x, source: e.target.value as "cash" | "safe" } : x))}
                      className="text-[12.5px] px-2 rounded-lg border outline-none" style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}>
                      <option value="cash">z kasy</option>
                      <option value="safe">z trezoru</option>
                    </select>
                    <button onClick={() => setPayouts((a) => a.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-[var(--danger-soft)]" style={{ color: "var(--text-3)" }}><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button onClick={() => setPayouts((p) => [...p, { desc: "", amount: 0, source: "cash" }])} className="flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: "var(--accent)" }}><Plus className="w-3.5 h-3.5" /> Přidat výplatu</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                {label("Vklad do trezoru", `ideálně nechat v kase ${formatCZK(num(standard))}`)}
                {money(toSafe, setToSafe)}
                <button onClick={() => setToSafe(String(c.suggestedToSafe))} className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "var(--accent)" }}>
                  <Calculator className="w-3.5 h-3.5" /> Navrhnout ({formatCZK(c.suggestedToSafe)})
                </button>
              </div>
              <div>{label("Trezor počáteční", "převzato z minulé směny")}{money(safeStart, setSafeStart)}</div>
            </div>

            <div>{label("Poznámka")}<Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="volitelné" /></div>
          </div>

          <Button onClick={save} loading={saving} className="w-full sm:w-auto">Uložit uzávěrku</Button>

          {/* History */}
          {closings.length > 0 && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <p className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide border-b" style={{ color: "var(--text-3)", borderColor: "var(--border)", background: "var(--bg-subtle)" }}>Historie</p>
              {closings.map((cl) => (
                <div key={cl.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                      {new Date(cl.date).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                      Tržba {formatCZK(cl.salesCash + cl.salesCard)} · kasa {formatCZK(cl.cashEnd)} · trezor {formatCZK(cl.safeEnd)}
                      {cl.createdBy?.name ? ` · ${cl.createdBy.name}` : ""}
                    </p>
                  </div>
                  <button onClick={() => removeClosing(cl.id)} className="p-2 rounded-lg hover:bg-[var(--danger-soft)] flex-shrink-0" style={{ color: "var(--text-3)" }}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Live summary ── */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            {label("Standardní stav kasy", "kolik nechat v kase po uzávěrce")}
            <div className="flex gap-2">
              {money(standard, setStandard)}
              <Button variant="secondary" onClick={saveStandard}>Uložit</Button>
            </div>
          </div>

          <div className="rounded-3xl border p-4 space-y-2.5" style={{ borderColor: "var(--border)", background: "var(--bg-card)", boxShadow: "var(--shadow-sm)" }}>
            <Row icon={<Banknote className="w-4 h-4" />} label="Tržba hotově" value={formatCZK(num(salesCash))} />
            <Row icon={<CreditCard className="w-4 h-4" />} label="Tržba kartou" value={formatCZK(num(salesCard))} />
            <Row label="Tržba celkem" value={formatCZK(c.salesTotal)} strong />
            <div className="h-px my-1" style={{ background: "var(--border)" }} />
            <Row label="Výběr z kasy" value={`− ${formatCZK(num(cashWithdrawn))}`} />
            <Row label="Další pohyby" value={`${c.movementsSum >= 0 ? "+ " : "− "}${formatCZK(Math.abs(c.movementsSum))}`} />
            <Row label="Výplaty z kasy" value={`− ${formatCZK(c.payoutsCash)}`} />
            <Row label="Vklad do trezoru" value={`− ${formatCZK(num(toSafe))}`} />
            <div className="h-px my-1" style={{ background: "var(--border)" }} />
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: cashOk ? "#22C55E18" : "#F59E0B18" }}>
              <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--text-1)" }}><Wallet className="w-4 h-4" /> Kasa na konci</span>
              <span className="text-[15px] font-bold flex items-center gap-1.5" style={{ color: cashOk ? "#16a34a" : "#d97706" }}>
                {cashOk && <Check className="w-4 h-4" />}{formatCZK(c.cashEnd)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "var(--bg-subtle)" }}>
              <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--text-1)" }}><Vault className="w-4 h-4" /> Trezor na konci</span>
              <span className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>{formatCZK(c.safeEnd)}</span>
            </div>
            {!cashOk && (
              <p className="text-[11.5px]" style={{ color: "#d97706" }}>
                V kase nezůstává {formatCZK(num(standard))}. Uprav vklad do trezoru (návrh {formatCZK(c.suggestedToSafe)}).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value, strong }: { icon?: React.ReactNode; label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[12.5px]" style={{ color: strong ? "var(--text-1)" : "var(--text-3)" }}>
        {icon}{label}
      </span>
      <span className={strong ? "text-[13.5px] font-bold" : "text-[12.5px] font-medium"} style={{ color: "var(--text-1)" }}>{value}</span>
    </div>
  );
}
