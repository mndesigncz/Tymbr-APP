"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Palmtree, Plus, Check, X, Trash2, Calendar, Clock } from "lucide-react";
import { isManager } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import type { Vacation, VacationType } from "@/types";

const TYPES: { key: VacationType; label: string; color: string; emoji: string }[] = [
  { key: "vacation", label: "Dovolená", color: "#0EA5E9", emoji: "🏖️" },
  { key: "sick",     label: "Nemoc",    color: "#EF4444", emoji: "🤒" },
  { key: "personal", label: "Volno",    color: "#8B5CF6", emoji: "☕" },
];
const typeInfo = (t: string) => TYPES.find((x) => x.key === t) ?? TYPES[0];

const STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: "Čeká na schválení", color: "#F59E0B" },
  approved: { label: "Schváleno",         color: "#22C55E" },
  rejected: { label: "Zamítnuto",         color: "#EF4444" },
};

function daysBetween(a: string | Date, b: string | Date): number {
  const d1 = new Date(a); d1.setHours(0, 0, 0, 0);
  const d2 = new Date(b); d2.setHours(0, 0, 0, 0);
  return Math.round((d2.getTime() - d1.getTime()) / 86_400_000) + 1;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function VacationPage() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id as string | undefined;
  const role = (session?.user as any)?.teamRole as string | null;
  const manager = isManager(role as any);

  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "pending" | "mine" | "all">("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/vacations");
    setVacations(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, approvalStatus: "approved" | "rejected") => {
    setBusyId(id);
    await fetch(`/api/vacations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus }),
    });
    await load();
    setBusyId(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Opravdu smazat tuto dovolenou?")) return;
    setBusyId(id);
    await fetch(`/api/vacations/${id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  };

  const pendingCount = useMemo(
    () => vacations.filter((v) => v.approvalStatus === "pending").length,
    [vacations]
  );

  const filtered = useMemo(() => {
    const today = todayStr();
    let list = vacations;
    if (tab === "pending") list = list.filter((v) => v.approvalStatus === "pending");
    else if (tab === "mine") list = list.filter((v) => v.userId === myId);
    else if (tab === "upcoming") {
      list = list.filter((v) => new Date(v.endDate).toISOString().slice(0, 10) >= today && v.approvalStatus !== "rejected");
    }
    return list;
  }, [vacations, tab, myId]);

  const tabs: { key: typeof tab; label: string; badge?: number }[] = [
    { key: "upcoming", label: "Nadcházející" },
    ...(manager ? [{ key: "pending" as const, label: "Ke schválení", badge: pendingCount }] : []),
    { key: "mine", label: "Moje" },
    { key: "all", label: "Vše" },
  ];

  return (
    <div>
      <Header
        title="Dovolená"
        subtitle="Nepřítomnost týmu na jednom místě"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>
            <span>Požádat o dovolenou</span>
          </Button>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border w-fit"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={tab === t.key ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}>
              {t.label}
              {!!t.badge && t.badge > 0 && (
                <span className="text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                  style={tab === t.key ? { background: "#fff", color: "var(--accent)" } : { background: "#F59E0B", color: "#fff" }}>
                  {t.badge}
                </span>
              )}
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
            <Palmtree className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>Žádné záznamy</p>
            <p className="text-[13px] mt-1">
              {tab === "pending" ? "Nic nečeká na schválení" : "Zatím tu nic není"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((v) => {
              const ti = typeInfo(v.type);
              const st = STATUS[v.approvalStatus] ?? STATUS.pending;
              const days = daysBetween(v.startDate, v.endDate);
              const canManage = manager && v.approvalStatus === "pending";
              const canDelete = v.userId === myId || manager;
              return (
                <div key={v.id} className="rounded-2xl border p-4"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  {/* Top: person + type */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={v.user?.name ?? "?"} src={v.user?.avatar} size="md" />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                          {v.user?.name ?? "—"}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-1.5 py-0.5 rounded-md mt-0.5"
                          style={{ color: ti.color, background: `${ti.color}18` }}>
                          {ti.emoji} {ti.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0"
                      style={{ color: st.color, background: `${st.color}18` }}>
                      {st.label}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-[12.5px] mb-1" style={{ color: "var(--text-2)" }}>
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                    <span>
                      {formatDate(v.startDate)}
                      {daysBetween(v.startDate, v.endDate) > 1 && <> – {formatDate(v.endDate)}</>}
                    </span>
                    <span className="flex items-center gap-1 ml-auto text-[11.5px]" style={{ color: "var(--text-3)" }}>
                      <Clock className="w-3 h-3" /> {days} {days === 1 ? "den" : days < 5 ? "dny" : "dní"}
                    </span>
                  </div>

                  {v.note && (
                    <p className="text-[12.5px] mt-2 leading-relaxed" style={{ color: "var(--text-3)" }}>{v.note}</p>
                  )}

                  {/* Actions */}
                  {(canManage || canDelete) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                      {canManage && (
                        <>
                          <button onClick={() => decide(v.id, "approved")} disabled={busyId === v.id}
                            className="flex-1 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold py-1.5 rounded-lg transition-all disabled:opacity-50"
                            style={{ background: "var(--success-soft, #22C55E18)", color: "#22C55E" }}>
                            <Check className="w-3.5 h-3.5" /> Schválit
                          </button>
                          <button onClick={() => decide(v.id, "rejected")} disabled={busyId === v.id}
                            className="flex-1 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold py-1.5 rounded-lg transition-all disabled:opacity-50"
                            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                            <X className="w-3.5 h-3.5" /> Zamítnout
                          </button>
                        </>
                      )}
                      {canDelete && !canManage && (
                        <button onClick={() => remove(v.id)} disabled={busyId === v.id}
                          className="flex items-center justify-center gap-1.5 text-[12px] font-medium py-1.5 px-3 rounded-lg transition-all hover:bg-[var(--danger-soft)] disabled:opacity-50 ml-auto"
                          style={{ color: "var(--text-3)" }}>
                          <Trash2 className="w-3.5 h-3.5" /> Smazat
                        </button>
                      )}
                      {canManage && canDelete && (
                        <button onClick={() => remove(v.id)} disabled={busyId === v.id}
                          className="p-1.5 rounded-lg transition-all hover:bg-[var(--danger-soft)] hover:text-red-500 disabled:opacity-50"
                          title="Smazat" style={{ color: "var(--text-3)" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Požádat o dovolenou">
        <VacationForm onCancel={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />
      </Modal>
    </div>
  );
}

function VacationForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [type, setType] = useState<VacationType>("vacation");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (endDate < startDate) { setError("Konec nesmí být před začátkem"); return; }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/vacations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, startDate, endDate, note }),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Nepodařilo se uložit");
  };

  const days = daysBetween(startDate, endDate);

  return (
    <form onSubmit={submit} className="space-y-4 pt-1">
      {/* Type */}
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Typ</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button key={t.key} type="button" onClick={() => setType(t.key)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[12.5px] font-semibold transition-all"
              style={type === t.key
                ? { borderColor: t.color, background: `${t.color}12`, color: t.color }
                : { borderColor: "var(--border-md)", background: "var(--bg-subtle)", color: "var(--text-2)" }}>
              <span className="text-[18px]">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Od</label>
          <input type="date" value={startDate}
            onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }}
            className="w-full text-[13.5px] rounded-xl px-3 py-2.5 border outline-none focus:border-[var(--accent)]"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
        </div>
        <div>
          <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Do</label>
          <input type="date" value={endDate} min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-[13.5px] rounded-xl px-3 py-2.5 border outline-none focus:border-[var(--accent)]"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
        </div>
      </div>
      <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
        Celkem <strong style={{ color: "var(--text-2)" }}>{days}</strong> {days === 1 ? "den" : days < 5 ? "dny" : "dní"}
      </p>

      {/* Note */}
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Poznámka (nepovinné)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          placeholder="Např. rodinná dovolená…"
          className="w-full text-[13.5px] rounded-xl px-3 py-2.5 border outline-none resize-none focus:border-[var(--accent)]"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
      </div>

      {error && <p className="text-[12.5px]" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Odesílám…" : "Odeslat žádost"}
        </Button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-[var(--hover)]"
          style={{ borderColor: "var(--border-md)", color: "var(--text-2)" }}>
          Zrušit
        </button>
      </div>
    </form>
  );
}
