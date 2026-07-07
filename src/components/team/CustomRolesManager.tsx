"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Pencil, ShieldCheck, X, Check, Wallet } from "lucide-react";
import { MEMBER_NAV_TABS } from "@/lib/roles";

interface CustomRole {
  id: string;
  name: string;
  color: string | null;
  finance: boolean;
  permissions: string[];
  memberCount: number;
}

const ROLE_COLORS = ["#f7592f", "#3B82F6", "#8B5CF6", "#22C55E", "#EAB308", "#EC4899", "#14B8A6", "#6B7280"];

const EMPTY = { name: "", color: ROLE_COLORS[0], finance: false, permissions: [] as string[] };

export function CustomRolesManager({ onChanged }: { onChanged?: () => void }) {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CustomRole | "new" | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/teams/roles");
    setRoles(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (r: CustomRole) => {
    const msg = r.memberCount > 0
      ? `Smazat roli „${r.name}"? ${r.memberCount} člen(ů) se vrátí na běžného člena.`
      : `Smazat roli „${r.name}"?`;
    if (!confirm(msg)) return;
    await fetch(`/api/teams/roles/${r.id}`, { method: "DELETE" });
    load();
    onChanged?.();
  };

  return (
    <div className="rounded-3xl border overflow-hidden"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-subtle)" }}>
            <ShieldCheck className="w-4.5 h-4.5" style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold" style={{ color: "var(--text-1)" }}>Vlastní role</p>
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Pojmenované sady oprávnění pro členy</p>
          </div>
        </div>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-xl text-white transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ background: "var(--accent)" }}>
          <Plus className="w-3.5 h-3.5" /> Nová role
        </button>
      </div>

      {loading ? (
        <div className="py-10 flex items-center justify-center">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : roles.length === 0 && editing !== "new" ? (
        <p className="text-[13px] px-6 py-8 text-center" style={{ color: "var(--text-3)" }}>
          Zatím žádné vlastní role. Vytvoř roli a přiřaď ji členům místo Admin/Člen.
        </p>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {roles.map((r) =>
            editing !== null && editing !== "new" && editing.id === r.id ? (
              <RoleEditor key={r.id} role={r} onCancel={() => setEditing(null)}
                onSaved={() => { setEditing(null); load(); onChanged?.(); }} />
            ) : (
              <div key={r.id} className="flex items-center gap-3 px-4 sm:px-6 py-3.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: r.color ?? "var(--accent)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold truncate flex items-center gap-2" style={{ color: "var(--text-1)" }}>
                    {r.name}
                    {r.finance && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ color: "#22C55E", background: "#22C55E18" }}>
                        <Wallet className="w-2.5 h-2.5" /> Finance
                      </span>
                    )}
                  </p>
                  <p className="text-[11.5px] truncate" style={{ color: "var(--text-3)" }}>
                    {r.permissions.length} sekcí · {r.memberCount} člen(ů)
                  </p>
                </div>
                <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
                  title="Upravit" style={{ color: "var(--text-3)" }}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(r)} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--danger-soft)] hover:text-red-500"
                  title="Smazat" style={{ color: "var(--text-3)" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          )}
          {editing === "new" && (
            <RoleEditor onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); onChanged?.(); }} />
          )}
        </div>
      )}
    </div>
  );
}

function RoleEditor({ role, onCancel, onSaved }: { role?: CustomRole; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(role ? {
    name: role.name, color: role.color ?? ROLE_COLORS[0], finance: role.finance, permissions: role.permissions,
  } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: string) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter((k) => k !== key) : [...f.permissions, key],
    }));

  const save = async () => {
    if (!form.name.trim()) { setError("Zadej název role"); return; }
    setSaving(true);
    setError(null);
    const res = await fetch(role ? `/api/teams/roles/${role.id}` : "/api/teams/roles", {
      method: role ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Nepodařilo se uložit");
  };

  return (
    <div className="px-4 sm:px-6 py-4 space-y-3" style={{ background: "var(--bg-subtle)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Název role (např. Grafik, Účetní…)" autoFocus
          className="flex-1 min-w-[180px] text-[13.5px] font-medium rounded-xl px-3 py-2 border outline-none focus:border-[var(--accent)]"
          style={{ background: "var(--bg-card)", color: "var(--text-1)", borderColor: "var(--border-md)" }} />
        <div className="flex items-center gap-1.5">
          {ROLE_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))}
              className="w-6 h-6 rounded-full transition-all hover:scale-110"
              style={{ background: c, boxShadow: form.color === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}` : undefined }} />
          ))}
        </div>
      </div>

      {/* Finance toggle */}
      <button type="button" onClick={() => setForm((f) => ({ ...f, finance: !f.finance }))}
        className="flex items-center justify-between w-full rounded-xl border px-3.5 py-2.5"
        style={{ background: "var(--bg-card)", borderColor: form.finance ? "#22C55E" : "var(--border-md)" }}>
        <div className="flex items-center gap-2 text-left">
          <Wallet className="w-4 h-4" style={{ color: form.finance ? "#22C55E" : "var(--text-3)" }} />
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Přístup k financím</p>
            <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>Fakturace a Vytížení</p>
          </div>
        </div>
        <span className="w-10 h-5.5 rounded-full relative transition-all" style={{ background: form.finance ? "#22C55E" : "var(--border-md)", width: 40, height: 22 }}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: form.finance ? 18 : 2, boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
        </span>
      </button>

      {/* Section access */}
      <div>
        <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--text-2)" }}>Přístup k sekcím</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {MEMBER_NAV_TABS.map(({ key, label }) => {
            const on = form.permissions.includes(key);
            return (
              <button key={key} type="button" onClick={() => toggle(key)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[12px] font-medium text-left transition-all"
                style={on
                  ? { background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)" }
                  : { background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-3)" }}>
                <span className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border"
                  style={on ? { background: "var(--accent)", borderColor: "var(--accent)" } : { borderColor: "var(--border-md)" }}>
                  {on && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-[12.5px]" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving}
          className="flex-1 text-[13px] font-semibold py-2 rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)" }}>
          {saving ? "Ukládám…" : role ? "Uložit změny" : "Vytvořit roli"}
        </button>
        <button onClick={onCancel}
          className="px-3 py-2 rounded-xl transition-colors hover:bg-[var(--hover)]" style={{ color: "var(--text-3)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
