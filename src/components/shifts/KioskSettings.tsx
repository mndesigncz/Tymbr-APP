"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, ListChecks, KeyRound, Check } from "lucide-react";

interface Checklist { id: string; name: string; kind: "open" | "close"; items: string[] }
interface Member { userId: string; name: string; avatar?: string | null; hasPin: boolean }

export function KioskSettings({ onChanged }: { onChanged: () => void }) {
  const [tab, setTab] = useState<"checklists" | "pins">("checklists");
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<"open" | "close">("open");

  const load = useCallback(async () => {
    const r = await fetch("/api/shifts/active");
    if (r.ok) { const d = await r.json(); setChecklists(d.checklists); setMembers(d.members); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addChecklist = async () => {
    const name = newName.trim();
    if (!name) return;
    await fetch("/api/shifts/checklists", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind: newKind, items: [] }),
    });
    setNewName(""); load(); onChanged();
  };
  const saveChecklist = async (c: Checklist, items: string[], name: string) => {
    await fetch(`/api/shifts/checklists/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, items }),
    });
    load(); onChanged();
  };
  const delChecklist = async (id: string) => {
    if (!confirm("Smazat postup?")) return;
    await fetch(`/api/shifts/checklists/${id}`, { method: "DELETE" });
    load(); onChanged();
  };
  const setPin = async (userId: string, pin: string) => {
    const r = await fetch("/api/shifts/pins", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, pin }),
    });
    if (r.ok) { load(); onChanged(); }
    else alert((await r.json()).error || "Chyba");
  };

  return (
    <div className="pt-1">
      <div className="flex gap-1 p-1 rounded-xl mb-4 w-fit" style={{ background: "var(--bg-subtle)" }}>
        {([["checklists", "Postupy"], ["pins", "PINy"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
            style={tab === k ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" } : { color: "var(--text-3)" }}>
            {l}
          </button>
        ))}
      </div>

      {tab === "checklists" ? (
        <div className="space-y-3">
          {checklists.map((c) => <ChecklistEditor key={c.id} c={c} onSave={saveChecklist} onDelete={delChecklist} />)}
          <div className="rounded-2xl border border-dashed p-3 flex items-center gap-2" style={{ borderColor: "var(--border-md)" }}>
            <ListChecks className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nový postup (název)" className="flex-1" />
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as any)}
              className="text-[12.5px] px-2 py-2 rounded-lg border outline-none" style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}>
              <option value="open">Otevírací</option>
              <option value="close">Zavírací</option>
            </select>
            <Button icon={<Plus className="w-4 h-4" />} onClick={addChecklist}>Přidat</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[12.5px] mb-1" style={{ color: "var(--text-3)" }}>PIN (4–6 číslic) pro napíchnutí na kiosku. Prázdné = bez PINu.</p>
          {members.map((m) => <PinRow key={m.userId} m={m} onSet={setPin} />)}
        </div>
      )}
    </div>
  );
}

function ChecklistEditor({ c, onSave, onDelete }: {
  c: Checklist; onSave: (c: Checklist, items: string[], name: string) => void; onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(c.name);
  const [text, setText] = useState(c.items.join("\n"));
  const dirty = name !== c.name || text !== c.items.join("\n");
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10.5px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>
          {c.kind === "open" ? "Otevírací" : "Zavírací"}
        </span>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <button onClick={() => onDelete(c.id)} className="p-2 rounded-lg hover:bg-[var(--danger-soft)]" style={{ color: "var(--text-3)" }}><Trash2 className="w-4 h-4" /></button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={Math.max(3, text.split("\n").length)}
        placeholder="Jeden bod na řádek…" className="w-full text-[13px] px-3 py-2 rounded-lg border outline-none resize-none"
        style={{ background: "var(--bg-page)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
      {dirty && (
        <button onClick={() => onSave(c, text.split("\n").map((s) => s.trim()).filter(Boolean), name.trim() || c.name)}
          className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: "var(--accent)" }}>
          <Check className="w-3.5 h-3.5" /> Uložit
        </button>
      )}
    </div>
  );
}

function PinRow({ m, onSet }: { m: Member; onSet: (userId: string, pin: string) => void }) {
  const [pin, setPin] = useState("");
  return (
    <div className="flex items-center gap-3 rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)" }}>
      <Avatar name={m.name} src={m.avatar} size="sm" />
      <span className="text-[13.5px] font-medium flex-1 truncate" style={{ color: "var(--text-1)" }}>{m.name}</span>
      {m.hasPin && <span className="flex items-center gap-1 text-[11.5px]" style={{ color: "#16a34a" }}><KeyRound className="w-3 h-3" /> nastaven</span>}
      <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric"
        placeholder={m.hasPin ? "změnit" : "PIN"} className="w-20 text-[13px] px-2 py-1.5 rounded-lg border outline-none text-center"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
      <button onClick={() => { onSet(m.userId, pin); setPin(""); }} disabled={pin !== "" && pin.length < 4}
        className="px-2.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-40" style={{ background: "var(--accent)" }}>
        {pin === "" && m.hasPin ? "Smazat" : "Uložit"}
      </button>
    </div>
  );
}
