"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ScrollFadeX } from "@/components/ui/ScrollFadeX";
import {
  Plus, Search, Trash2, Mail, Phone, Briefcase,
  Contact, ChevronRight,
} from "lucide-react";
import type { Client, ClientStage, Project } from "@/types";

const STAGES: { key: ClientStage; label: string; color: string }[] = [
  { key: "lead",        label: "Lead",      color: "#8B5CF6" },
  { key: "negotiation", label: "Jednání",   color: "#F59E0B" },
  { key: "active",      label: "Aktivní",   color: "#22C55E" },
  { key: "inactive",    label: "Neaktivní", color: "#6B7280" },
  { key: "lost",        label: "Ztracený",  color: "#EF4444" },
];
const EMPTY_FORM = {
  name: "", contactName: "", email: "", phone: "", website: "",
  address: "", ico: "", dic: "", note: "", stage: "lead" as ClientStage,
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Client | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/clients");
    setClients(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const moveStage = async (id: string, stage: ClientStage) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    load();
  };

  const handleDrop = (e: React.DragEvent, stage: ClientStage) => {
    e.preventDefault();
    if (draggingId) {
      const client = clients.find((c) => c.id === draggingId);
      if (client && client.stage !== stage) moveStage(draggingId, stage);
    }
    setDraggingId(null);
    setOverStage(null);
  };

  const filtered = search.trim()
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.contactName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  const columns = STAGES.map((stage) => {
    const colClients = filtered.filter((c) => c.stage === stage.key);
    const isOver = overStage === stage.key;
    return (
      <div
        key={stage.key}
        className="flex flex-col rounded-3xl p-4 transition-all w-full lg:w-[280px] lg:flex-shrink-0"
        style={isOver
          ? { background: `${stage.color}10`, outline: `2px dashed ${stage.color}`, outlineOffset: "-2px" }
          : { background: "var(--bg-subtle)" }}
        onDragOver={(e) => { e.preventDefault(); setOverStage(stage.key); }}
        onDrop={(e) => handleDrop(e, stage.key)}
        onDragLeave={() => setOverStage(null)}
      >
        <div className="flex items-center gap-2 mb-4 px-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.color }} />
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>{stage.label}</span>
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: "var(--bg-card)", color: "var(--text-3)" }}>
            {colClients.length}
          </span>
        </div>
        <div className="flex flex-col gap-3 min-h-0 lg:min-h-[100px]">
          {colClients.map((c) => (
            <div
              key={c.id}
              draggable
              onDragStart={(e) => { setDraggingId(c.id); e.dataTransfer.effectAllowed = "move"; }}
              onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
              className={draggingId === c.id ? "opacity-40" : ""}
            >
              <button
                onClick={() => setDetail(c)}
                className="w-full text-left rounded-2xl border p-4 transition-all cursor-pointer hover:-translate-y-0.5"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <p className="text-[13.5px] font-semibold leading-snug mb-1" style={{ color: "var(--text-1)" }}>
                  {c.name}
                </p>
                {c.contactName && (
                  <p className="text-[12px] mb-1.5" style={{ color: "var(--text-3)" }}>{c.contactName}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {c.email && (
                    <span className="flex items-center gap-1 text-[11.5px] truncate max-w-full" style={{ color: "var(--text-3)" }}>
                      <Mail className="w-3 h-3 flex-shrink-0" /> {c.email}
                    </span>
                  )}
                  {c.phone && (
                    <span className="flex items-center gap-1 text-[11.5px]" style={{ color: "var(--text-3)" }}>
                      <Phone className="w-3 h-3" /> {c.phone}
                    </span>
                  )}
                </div>
                {(c._count?.projects ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md mt-2"
                    style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
                    <Briefcase className="w-3 h-3" />
                    {c._count!.projects} {c._count!.projects === 1 ? "projekt" : c._count!.projects < 5 ? "projekty" : "projektů"}
                  </span>
                )}
              </button>
            </div>
          ))}
          {colClients.length === 0 && (
            <div className="flex items-center justify-center py-6">
              <span className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Prázdné</span>
            </div>
          )}
        </div>
      </div>
    );
  });

  return (
    <div>
      <Header
        title="Klienti"
        subtitle="Pipeline od leadu po zakázku"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>
            <span>Nový klient</span>
          </Button>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-5">
        <div className="max-w-sm">
          <Input
            placeholder="Hledat klienta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" style={{ color: "var(--text-3)" }}>
            <Contact className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>Zatím žádní klienti</p>
            <p className="text-[13px] mt-1 mb-4">Přidej prvního klienta nebo lead</p>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>Nový klient</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 lg:hidden">{columns}</div>
            <ScrollFadeX className="hidden lg:flex items-start gap-4 pb-2" fadeColor="var(--bg-page)">
              {columns}
            </ScrollFadeX>
          </>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nový klient">
        <ClientForm onCancel={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ""} size="lg">
        {detail && (
          <ClientDetail
            client={detail}
            onClose={() => setDetail(null)}
            onChanged={() => { load(); }}
            onDeleted={() => { setDetail(null); load(); }}
          />
        )}
      </Modal>
    </div>
  );
}

/* ─── Create form ────────────────────────────────────────────────────── */

function ClientForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Nepodařilo se uložit");
  };

  return (
    <form onSubmit={submit} className="space-y-3 pt-1">
      <Input label="Název / firma *" value={form.name} onChange={set("name")} required placeholder="Např. Sonrisa s.r.o." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Kontaktní osoba" value={form.contactName} onChange={set("contactName")} />
        <Input label="E-mail" type="email" value={form.email} onChange={set("email")} />
        <Input label="Telefon" value={form.phone} onChange={set("phone")} />
        <Input label="Web" value={form.website} onChange={set("website")} placeholder="https://" />
        <Input label="IČO" value={form.ico} onChange={set("ico")} />
        <Input label="DIČ" value={form.dic} onChange={set("dic")} />
      </div>
      <Input label="Adresa" value={form.address} onChange={set("address")} />

      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Stav</label>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s) => (
            <button key={s.key} type="button" onClick={() => setForm((f) => ({ ...f, stage: s.key }))}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[12px] font-semibold transition-all"
              style={form.stage === s.key
                ? { borderColor: s.color, background: `${s.color}12`, color: s.color }
                : { borderColor: "var(--border-md)", background: "var(--bg-subtle)", color: "var(--text-2)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Poznámka</label>
        <textarea value={form.note} onChange={set("note")} rows={2}
          className="w-full text-[13.5px] rounded-xl px-3 py-2.5 border outline-none resize-none focus:border-[var(--accent)]"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
      </div>

      {error && <p className="text-[12.5px]" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">{saving ? "Ukládám…" : "Vytvořit klienta"}</Button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-[var(--hover)]"
          style={{ borderColor: "var(--border-md)", color: "var(--text-2)" }}>
          Zrušit
        </button>
      </div>
    </form>
  );
}

/* ─── Detail / edit ──────────────────────────────────────────────────── */

function ClientDetail({
  client, onClose, onChanged, onDeleted,
}: {
  client: Client;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState({
    name: client.name,
    contactName: client.contactName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    website: client.website ?? "",
    address: client.address ?? "",
    ico: client.ico ?? "",
    dic: client.dic ?? "",
    note: client.note ?? "",
  });
  const [stage, setStage] = useState<ClientStage>(client.stage);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${client.id}`)
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d?.projects) ? d.projects : []));
  }, [client.id]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, stage }),
    });
    setSaving(false);
    if (res.ok) {
      onChanged();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const changeStage = async (s: ClientStage) => {
    setStage(s);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: s }),
    });
    onChanged();
  };

  const remove = async () => {
    if (!confirm(`Smazat klienta „${client.name}"? Projekty zůstanou zachovány.`)) return;
    await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    onDeleted();
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Pipeline stage */}
      <div className="flex flex-wrap gap-1.5">
        {STAGES.map((s) => (
          <button key={s.key} type="button" onClick={() => changeStage(s.key)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[12px] font-semibold transition-all"
            style={stage === s.key
              ? { borderColor: s.color, background: `${s.color}12`, color: s.color }
              : { borderColor: "var(--border-md)", background: "var(--bg-subtle)", color: "var(--text-2)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Contact fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Název / firma" value={form.name} onChange={set("name")} />
        <Input label="Kontaktní osoba" value={form.contactName} onChange={set("contactName")} />
        <Input label="E-mail" type="email" value={form.email} onChange={set("email")} />
        <Input label="Telefon" value={form.phone} onChange={set("phone")} />
        <Input label="Web" value={form.website} onChange={set("website")} />
        <Input label="Adresa" value={form.address} onChange={set("address")} />
        <Input label="IČO" value={form.ico} onChange={set("ico")} />
        <Input label="DIČ" value={form.dic} onChange={set("dic")} />
      </div>
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Poznámka</label>
        <textarea value={form.note} onChange={set("note")} rows={2}
          className="w-full text-[13.5px] rounded-xl px-3 py-2.5 border outline-none resize-none focus:border-[var(--accent)]"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
      </div>

      {/* Projects of this client */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: "var(--text-1)" }}>
            <Briefcase className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
            Projekty
          </span>
          <Link href={`/projects?new=1&clientId=${client.id}`}
            className="flex items-center gap-1 text-[12px] font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--accent)" }}>
            <Plus className="w-3.5 h-3.5" /> Nový projekt
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Žádné projekty</p>
        ) : (
          <div className="space-y-1.5">
            {projects.map((p) => (
              <Link key={p.id} href={`/tasks?projectId=${p.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:bg-[var(--hover)]"
                style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color ?? "var(--accent)" }} />
                <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: "var(--text-1)" }}>{p.name}</span>
                <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  {(p as any)._count?.tasks ?? 0} úkolů
                </span>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
        <Button onClick={save} disabled={saving} className="flex-1">
          {saving ? "Ukládám…" : saved ? "✓ Uloženo" : "Uložit změny"}
        </Button>
        <button type="button" onClick={remove}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:bg-[var(--danger-soft)]"
          style={{ color: "var(--danger)" }}>
          <Trash2 className="w-4 h-4" /> Smazat
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-[var(--hover)]"
          style={{ borderColor: "var(--border-md)", color: "var(--text-2)" }}>
          Zavřít
        </button>
      </div>
    </div>
  );
}
