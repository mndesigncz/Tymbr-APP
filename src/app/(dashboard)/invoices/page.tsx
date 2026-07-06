"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Plus, FileText, Download, Trash2, Settings2, Check, Send, Undo2, X,
} from "lucide-react";
import { canSeeFinance } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import { computeTotals } from "@/lib/invoice";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import type { Invoice, InvoiceItem, TeamBilling, Client } from "@/types";

const STATUS: Record<string, { label: string; color: string }> = {
  draft:  { label: "Koncept",   color: "#6B7280" },
  issued: { label: "Vystavená", color: "#3B82F6" },
  paid:   { label: "Zaplacená", color: "#22C55E" },
};

const money = (n: number) => `${n.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} Kč`;

export default function InvoicesPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.teamRole as string | null;
  const hasAccess = canSeeFinance(role as any);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [billing, setBilling] = useState<TeamBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "draft" | "issued" | "paid">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    const [iRes, cRes, bRes] = await Promise.all([
      fetch("/api/invoices"), fetch("/api/clients"), fetch("/api/billing"),
    ]);
    setInvoices(iRes.ok ? await iRes.json() : []);
    setClients(cRes.ok ? await cRes.json() : []);
    setBilling(bRes.ok ? await bRes.json() : null);
    setLoading(false);
  }, []);

  useEffect(() => { if (hasAccess) load(); }, [hasAccess, load]);

  const setStatus = async (inv: Invoice, status: string) => {
    await fetch(`/api/invoices/${inv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const remove = async (inv: Invoice) => {
    if (!confirm(`Smazat koncept ${inv.number}?`)) return;
    await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
    load();
  };

  if (!hasAccess) {
    return (
      <div>
        <Header title="Fakturace" />
        <div className="flex flex-col items-center justify-center py-32 px-6 text-center" style={{ color: "var(--text-3)" }}>
          <FileText className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>Přístup jen pro finance</p>
          <p className="text-[13px] mt-1 max-w-sm">
            Faktury vidí vlastník, admin a členové s rolí Finanční manažer. Požádej správce týmu o změnu role.
          </p>
        </div>
      </div>
    );
  }

  const filtered = tab === "all" ? invoices : invoices.filter((i) => i.status === tab);
  const totals = {
    issued: invoices.filter((i) => i.status === "issued").reduce((s, i) => s + i.total, 0),
    paid: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0),
  };

  return (
    <div>
      <Header
        title="Fakturace"
        subtitle="Faktury z odsledovaného času a nákladů"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setSettingsOpen(true)} title="Nastavení fakturace"
              className="p-2.5 rounded-xl border transition-colors hover:bg-[var(--hover)]"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
              <Settings2 className="w-4 h-4" />
            </button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingInvoice(null); setEditorOpen(true); }}>
              <span>Nová faktura</span>
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div className="rounded-2xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Nezaplaceno</p>
            <p className="text-[18px] font-bold tabular-nums" style={{ color: "#3B82F6" }}>{money(totals.issued)}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Zaplaceno</p>
            <p className="text-[18px] font-bold tabular-nums" style={{ color: "#22C55E" }}>{money(totals.paid)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border w-fit"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
          {([["all", "Vše"], ["draft", "Koncepty"], ["issued", "Vystavené"], ["paid", "Zaplacené"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className="px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={tab === k ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" style={{ color: "var(--text-3)" }}>
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>Žádné faktury</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((inv) => {
              const st = STATUS[inv.status] ?? STATUS.draft;
              const overdue = inv.status === "issued" && new Date(inv.dueDate) < new Date();
              return (
                <div key={inv.id} className="rounded-2xl border p-4 flex flex-wrap items-center gap-3"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => { if (inv.status === "draft") { setEditingInvoice(inv); setEditorOpen(true); } }}
                        className="text-[14px] font-bold hover:underline"
                        style={{ color: "var(--text-1)", cursor: inv.status === "draft" ? "pointer" : "default" }}>
                        {inv.number}
                      </button>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                        style={{ color: st.color, background: `${st.color}18` }}>
                        {st.label}
                      </span>
                      {overdue && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                          style={{ color: "var(--danger)", background: "var(--danger-soft)" }}>
                          Po splatnosti
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-3)" }}>
                      {inv.client?.name} · vystaveno {formatDate(inv.issueDate)} · splatnost {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <p className="text-[15px] font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{money(inv.total)}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => billing && downloadInvoicePdf(inv, billing)} title="Stáhnout PDF"
                      className="p-2 rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: "var(--text-2)" }}>
                      <Download className="w-4 h-4" />
                    </button>
                    {inv.status === "draft" && (
                      <>
                        <button onClick={() => setStatus(inv, "issued")} title="Vystavit"
                          className="p-2 rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: "#3B82F6" }}>
                          <Send className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(inv)} title="Smazat"
                          className="p-2 rounded-lg transition-colors hover:bg-[var(--danger-soft)] hover:text-red-500"
                          style={{ color: "var(--text-3)" }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {inv.status === "issued" && (
                      <>
                        <button onClick={() => setStatus(inv, "paid")} title="Označit jako zaplacenou"
                          className="p-2 rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: "#22C55E" }}>
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setStatus(inv, "draft")} title="Vrátit do konceptu"
                          className="p-2 rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: "var(--text-3)" }}>
                          <Undo2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {inv.status === "paid" && (
                      <button onClick={() => setStatus(inv, "issued")} title="Vrátit mezi vystavené"
                        className="p-2 rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: "var(--text-3)" }}>
                        <Undo2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={editingInvoice ? `Upravit ${editingInvoice.number}` : "Nová faktura"} size="lg">
        <InvoiceEditor
          key={editingInvoice?.id ?? "new"}
          invoice={editingInvoice}
          clients={clients}
          billing={billing}
          onCancel={() => setEditorOpen(false)}
          onSaved={() => { setEditorOpen(false); load(); }}
        />
      </Modal>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Nastavení fakturace" size="lg">
        {billing && (
          <BillingSettings billing={billing}
            onSaved={(b) => { setBilling(b); setSettingsOpen(false); }}
            onCancel={() => setSettingsOpen(false)} />
        )}
      </Modal>
    </div>
  );
}

/* ─── Invoice editor ─────────────────────────────────────────────────── */

function InvoiceEditor({
  invoice, clients, billing, onCancel, onSaved,
}: {
  invoice: Invoice | null;
  clients: Client[];
  billing: TeamBilling | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState(invoice?.clientId ?? "");
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items ?? []);
  const [note, setNote] = useState(invoice?.note ?? "");
  const [hoursWithoutRate, setHoursWithoutRate] = useState(0);
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vatRate = invoice ? invoice.vatRate : billing?.vatPayer ? billing.vatRate : 0;
  const totals = computeTotals(items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })), vatRate);

  const prepare = async () => {
    if (!clientId) { setError("Nejdřív vyber klienta"); return; }
    setLoadingPrep(true);
    setError(null);
    const res = await fetch(`/api/invoices/prepare?clientId=${clientId}&from=${from}&to=${to}`);
    setLoadingPrep(false);
    if (!res.ok) { setError((await res.json().catch(() => ({})))?.error ?? "Nepodařilo se načíst podklady"); return; }
    const data = await res.json();
    setItems(data.items ?? []);
    setHoursWithoutRate(data.hoursWithoutRate ?? 0);
    if ((data.items ?? []).length === 0) setError("Za zvolené období nejsou žádné podklady — přidej položky ručně");
  };

  const setItem = (idx: number, patch: Partial<InvoiceItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, { description: "", quantity: 1, unit: "ks", unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload = { clientId, items, note };
    const res = await fetch(invoice ? `/api/invoices/${invoice.id}` : "/api/invoices", {
      method: invoice ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Nepodařilo se uložit");
  };

  return (
    <div className="space-y-4 pt-1">
      {!invoice && (
        <>
          <Select label="Klient *" value={clientId} onChange={(e) => setClientId(e.target.value)}
            options={[{ value: "", label: "Vyber klienta…" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} />
          <div className="flex flex-wrap items-end gap-2">
            <Input label="Období od" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 min-w-[130px]" />
            <Input label="do" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 min-w-[130px]" />
            <Button variant="secondary" onClick={prepare} disabled={loadingPrep || !clientId}>
              {loadingPrep ? "Načítám…" : "Načíst podklady"}
            </Button>
          </div>
          {hoursWithoutRate > 0 && (
            <p className="text-[12px] px-3 py-2 rounded-xl"
              style={{ background: "color-mix(in srgb, #F59E0B 10%, transparent)", color: "var(--text-2)" }}>
              ⚠️ {hoursWithoutRate} h odsledovaného času je na úkolech bez hodinové sazby — do podkladů se nedostaly.
            </p>
          )}
        </>
      )}

      {/* Items */}
      <div className="space-y-2">
        <div className="hidden sm:grid grid-cols-[1fr_70px_60px_100px_90px_28px] gap-2 px-1 text-[10.5px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-3)" }}>
          <span>Položka</span><span>Množ.</span><span>MJ</span><span>Cena/MJ</span><span className="text-right">Celkem</span><span />
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-2 sm:grid-cols-[1fr_70px_60px_100px_90px_28px] gap-2 items-center">
            <input value={it.description} onChange={(e) => setItem(idx, { description: e.target.value })}
              placeholder="Popis položky" className="col-span-2 sm:col-span-1 text-[13px] rounded-lg px-2.5 py-2 border outline-none"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
            <input type="number" value={it.quantity} min="0" step="0.25"
              onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })}
              className="text-[13px] rounded-lg px-2 py-2 border outline-none tabular-nums"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
            <input value={it.unit} onChange={(e) => setItem(idx, { unit: e.target.value })}
              className="text-[13px] rounded-lg px-2 py-2 border outline-none"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
            <input type="number" value={it.unitPrice} min="0" step="10"
              onChange={(e) => setItem(idx, { unitPrice: Number(e.target.value) })}
              className="text-[13px] rounded-lg px-2 py-2 border outline-none tabular-nums"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
            <span className="text-[13px] font-semibold tabular-nums text-right" style={{ color: "var(--text-1)" }}>
              {money(it.quantity * it.unitPrice)}
            </span>
            <button onClick={() => removeItem(idx)} className="p-1 rounded hover:text-red-500" style={{ color: "var(--text-3)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button onClick={addItem}
          className="flex items-center gap-1 text-[12.5px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: "var(--accent)" }}>
          <Plus className="w-3.5 h-3.5" /> Přidat položku
        </button>
      </div>

      {/* Totals */}
      <div className="rounded-xl px-4 py-3 space-y-1" style={{ background: "var(--bg-subtle)" }}>
        {vatRate > 0 && (
          <>
            <div className="flex justify-between text-[12.5px]" style={{ color: "var(--text-2)" }}>
              <span>Základ daně</span><span className="tabular-nums">{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[12.5px]" style={{ color: "var(--text-2)" }}>
              <span>DPH {vatRate} %</span><span className="tabular-nums">{money(totals.vatAmount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-[15px] font-bold" style={{ color: "var(--text-1)" }}>
          <span>Celkem</span><span className="tabular-nums">{money(totals.total)}</span>
        </div>
      </div>

      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Poznámka na faktuře</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          className="w-full text-[13.5px] rounded-xl px-3 py-2.5 border outline-none resize-none focus:border-[var(--accent)]"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
      </div>

      {error && <p className="text-[12.5px]" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={saving || items.length === 0 || (!invoice && !clientId)} className="flex-1">
          {saving ? "Ukládám…" : invoice ? "Uložit změny" : "Uložit koncept"}
        </Button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-[var(--hover)]"
          style={{ borderColor: "var(--border-md)", color: "var(--text-2)" }}>
          Zrušit
        </button>
      </div>
    </div>
  );
}

/* ─── Billing settings ───────────────────────────────────────────────── */

function BillingSettings({
  billing, onSaved, onCancel,
}: {
  billing: TeamBilling;
  onSaved: (b: TeamBilling) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    supplierName: billing.supplierName,
    address: billing.address ?? "",
    ico: billing.ico ?? "",
    dic: billing.dic ?? "",
    bankAccount: billing.bankAccount ?? "",
    vatPayer: billing.vatPayer,
    vatRate: String(billing.vatRate),
    invoicePrefix: billing.invoicePrefix,
    nextNumber: String(billing.nextNumber),
    dueDays: String(billing.dueDays),
    footerNote: billing.footerNote ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/billing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        vatRate: Number(form.vatRate),
        nextNumber: Number(form.nextNumber),
        dueDays: Number(form.dueDays),
      }),
    });
    setSaving(false);
    if (res.ok) onSaved(await res.json());
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-3 pt-1">
      <Input label="Dodavatel (název / jméno)" value={form.supplierName} onChange={set("supplierName")} />
      <Input label="Adresa" value={form.address} onChange={set("address")} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="IČO" value={form.ico} onChange={set("ico")} />
        <Input label="DIČ" value={form.dic} onChange={set("dic")} />
      </div>
      <Input label="Bankovní účet" value={form.bankAccount} onChange={set("bankAccount")} placeholder="123456789/0100" />

      <div className="flex items-center justify-between rounded-xl border px-4 py-3"
        style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}>
        <div>
          <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>Plátce DPH</p>
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Faktury budou počítat DPH</p>
        </div>
        <button type="button" onClick={() => setForm((f) => ({ ...f, vatPayer: !f.vatPayer }))}
          className="w-11 h-6 rounded-full transition-all relative"
          style={{ background: form.vatPayer ? "var(--accent)" : "var(--border-md)" }}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
            style={{ left: form.vatPayer ? "22px" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
      </div>
      {form.vatPayer && (
        <Input label="Sazba DPH (%)" type="number" min="0" value={form.vatRate} onChange={set("vatRate")} />
      )}

      <div className="grid grid-cols-3 gap-3">
        <Input label="Prefix čísla" value={form.invoicePrefix} onChange={set("invoicePrefix")} placeholder="2026" />
        <Input label="Další číslo" type="number" min="1" value={form.nextNumber} onChange={set("nextNumber")} />
        <Input label="Splatnost (dní)" type="number" min="1" value={form.dueDays} onChange={set("dueDays")} />
      </div>
      <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
        Příští faktura: <strong>{form.invoicePrefix}{String(Number(form.nextNumber) || 1).padStart(3, "0")}</strong>
      </p>

      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Patička faktury</label>
        <textarea value={form.footerNote} onChange={set("footerNote")} rows={2}
          placeholder="Např. Fyzická osoba zapsaná v živnostenském rejstříku."
          className="w-full text-[13.5px] rounded-xl px-3 py-2.5 border outline-none resize-none focus:border-[var(--accent)]"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button onClick={save} disabled={saving} className="flex-1">{saving ? "Ukládám…" : "Uložit nastavení"}</Button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-[var(--hover)]"
          style={{ borderColor: "var(--border-md)", color: "var(--text-2)" }}>
          Zavřít
        </button>
      </div>
    </div>
  );
}
