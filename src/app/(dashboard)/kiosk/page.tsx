"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { isManager } from "@/lib/roles";
import { Clock, LogIn, LogOut, Check, Vault, Settings, Delete, ListChecks } from "lucide-react";
import { KioskSettings } from "@/components/shifts/KioskSettings";

interface Member { userId: string; name: string; avatar?: string | null; hasPin: boolean }
interface Attendance { id: string; user: { id: string; name: string; avatar?: string | null } }
interface Checklist { id: string; name: string; kind: "open" | "close"; items: string[] }
interface ShiftState { id: string; openedAt: string; checklistState: string }

export default function KioskPage() {
  const { data: session } = useSession();
  const manager = isManager((session?.user as any)?.teamRole);

  const [shift, setShift] = useState<ShiftState | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pinFor, setPinFor] = useState<{ member: Member; action: "in" | "out" } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/shifts/active");
    if (r.ok) {
      const d = await r.json();
      setShift(d.shift); setAttendance(d.attendance); setChecklists(d.checklists); setMembers(d.members);
    }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const checkedState: Record<string, Record<string, any>> = (() => {
    try { return shift ? JSON.parse(shift.checklistState || "{}") : {}; } catch { return {}; }
  })();
  const isPresent = (userId: string) => attendance.some((a) => a.user.id === userId);

  const toggleItem = async (checklistId: string, i: number, done: boolean) => {
    await fetch("/api/shifts/checklist", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistId, itemIndex: i, done }),
    });
    load();
  };

  const openCards = checklists.filter((c) => c.kind === "open");
  const closeCards = checklists.filter((c) => c.kind === "close");

  return (
    <div className="max-w-[1100px] mx-auto w-full min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-6">
        {/* Status bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Směna</h1>
            <p className="text-[13px] flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
              <Clock className="w-3.5 h-3.5" />
              {shift
                ? `Otevřená od ${new Date(shift.openedAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })} · ${attendance.length} na směně`
                : "Žádná otevřená směna — otevře se prvním příchodem"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {manager && (
              <button onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-colors hover:bg-[var(--hover)]"
                style={{ borderColor: "var(--border-md)", color: "var(--text-2)" }}>
                <Settings className="w-4 h-4" /> Nastavení
              </button>
            )}
            <Link href="/cash"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}>
              <Vault className="w-4 h-4" /> Uzávěrka
            </Link>
          </div>
        </div>

        {/* Clock-in grid */}
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-3)" }}>Kdo je na směně</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {members.map((m) => {
              const present = isPresent(m.userId);
              return (
                <button
                  key={m.userId}
                  disabled={!m.hasPin}
                  onClick={() => setPinFor({ member: m, action: present ? "out" : "in" })}
                  className="rounded-2xl border p-3 flex flex-col items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    borderColor: present ? "#22C55E" : "var(--border-md)",
                    background: present ? "#22C55E14" : "var(--bg-card)",
                  }}
                >
                  <Avatar name={m.name} src={m.avatar} size="lg" />
                  <span className="text-[13.5px] font-semibold text-center leading-tight" style={{ color: "var(--text-1)" }}>{m.name}</span>
                  <span className="text-[11.5px] font-medium flex items-center gap-1"
                    style={{ color: present ? "#16a34a" : "var(--text-3)" }}>
                    {!m.hasPin ? "bez PINu" : present ? <><LogOut className="w-3 h-3" /> Odpíchnout</> : <><LogIn className="w-3 h-3" /> Napíchnout</>}
                  </span>
                </button>
              );
            })}
            {members.length === 0 && <p className="text-[13px] col-span-full py-6 text-center" style={{ color: "var(--text-3)" }}>Žádní členové týmu</p>}
          </div>
        </div>

        {/* Checklists */}
        {[{ title: "Otevírací postup", cards: openCards }, { title: "Zavírací postup", cards: closeCards }].map((sec) =>
          sec.cards.length > 0 && (
            <div key={sec.title}>
              <p className="text-[12px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
                <ListChecks className="w-3.5 h-3.5" /> {sec.title}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sec.cards.map((cl) => (
                  <div key={cl.id} className="rounded-2xl border p-3.5" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                    <p className="text-[13.5px] font-semibold mb-2" style={{ color: "var(--text-1)" }}>{cl.name}</p>
                    <div className="space-y-1.5">
                      {cl.items.map((item, i) => {
                        const done = !!checkedState[cl.id]?.[String(i)];
                        return (
                          <button key={i} onClick={() => toggleItem(cl.id, i, !done)}
                            className="w-full flex items-center gap-2.5 text-left py-1">
                            <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2"
                              style={done ? { background: "#22C55E", borderColor: "#22C55E" } : { borderColor: "var(--border-md)" }}>
                              {done && <Check className="w-3.5 h-3.5 text-white" />}
                            </span>
                            <span className="text-[13.5px]" style={{ color: done ? "var(--text-3)" : "var(--text-1)", textDecoration: done ? "line-through" : "none" }}>{item}</span>
                          </button>
                        );
                      })}
                      {cl.items.length === 0 && <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Prázdný postup</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {pinFor && <PinPad member={pinFor.member} action={pinFor.action} onClose={() => setPinFor(null)} onDone={() => { setPinFor(null); load(); }} />}

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Nastavení kiosku" size="lg">
        <KioskSettings onChanged={load} />
      </Modal>
    </div>
  );
}

function PinPad({ member, action, onClose, onDone }: {
  member: Member; action: "in" | "out"; onClose: () => void; onDone: () => void;
}) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const submit = useCallback(async (value: string) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/shifts/clock", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.userId, pin: value, action }),
      });
      if (r.ok) { onDone(); return; }
      setErr((await r.json()).error || "Chyba"); setPin("");
    } finally { submitting.current = false; setBusy(false); }
  }, [member.userId, action, onDone]);

  const press = (d: string) => {
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length === 4) submit(next); // auto-submit at 4 digits
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[4px]" onClick={onClose} />
      <div className="relative w-full max-w-[300px] rounded-3xl glass-strong border p-5 animate-scale-in"
        style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)" }}>
        <div className="flex flex-col items-center gap-1.5 mb-3">
          <Avatar name={member.name} src={member.avatar} size="lg" />
          <p className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>{member.name}</p>
          <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>{action === "in" ? "Zadej PIN pro napíchnutí" : "Zadej PIN pro odpíchnutí"}</p>
        </div>
        <div className="flex justify-center gap-2 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="w-3 h-3 rounded-full" style={{ background: i < pin.length ? "var(--accent)" : "var(--border-md)" }} />
          ))}
        </div>
        {err && <p className="text-center text-[12.5px] mb-2" style={{ color: "var(--danger, #ef4444)" }}>{err}</p>}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} onClick={() => press(d)} disabled={busy}
              className="h-14 rounded-2xl text-[20px] font-semibold transition-colors hover:bg-[var(--hover)] disabled:opacity-50"
              style={{ background: "var(--bg-card)", color: "var(--text-1)" }}>{d}</button>
          ))}
          <button onClick={onClose} className="h-14 rounded-2xl text-[13px] font-medium" style={{ color: "var(--text-3)" }}>Zrušit</button>
          <button onClick={() => press("0")} disabled={busy}
            className="h-14 rounded-2xl text-[20px] font-semibold transition-colors hover:bg-[var(--hover)] disabled:opacity-50"
            style={{ background: "var(--bg-card)", color: "var(--text-1)" }}>0</button>
          <button onClick={() => setPin((p) => p.slice(0, -1))}
            className="h-14 rounded-2xl flex items-center justify-center hover:bg-[var(--hover)]" style={{ color: "var(--text-2)" }}><Delete className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}
