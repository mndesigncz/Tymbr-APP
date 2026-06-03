"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Trash2, Play, ChevronDown, ChevronUp } from "lucide-react";
import type { SubTask } from "@/types";

interface SubtasksProps {
  taskId: string;
  dark?: boolean;
  onChange?: (subtasks: SubTask[]) => void;
  activeSubtaskId?: string | null;
  onActivateSubtask?: (id: string | null) => void;
}

export function Subtasks({ taskId, dark, onChange, activeSubtaskId, onActivateSubtask }: SubtasksProps) {
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const c = {
    text1: dark ? "#f5f5f7" : "var(--text-1)",
    text3: dark ? "#8a8a92" : "var(--text-3)",
    subtle: dark ? "rgba(255,255,255,0.06)" : "var(--bg-subtle)",
    border: dark ? "rgba(255,255,255,0.1)" : "var(--border-md)",
    inputBg: dark ? "rgba(255,255,255,0.05)" : "var(--bg-subtle)",
  };

  const load = () => {
    fetch(`/api/tasks/${taskId}/subtasks`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setSubtasks(list);
        onChange?.(list);
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [taskId]);

  const toggle = async (st: SubTask) => {
    const updated = subtasks.map((s) => (s.id === st.id ? { ...s, done: !s.done } : s));
    setSubtasks(updated);
    onChange?.(updated);
    await fetch(`/api/subtasks/${st.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !st.done }),
    });
    load();
  };

  const updateField = async (st: SubTask, field: "title" | "description" | "hourlyRate", value: string) => {
    await fetch(`/api/subtasks/${st.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: field === "hourlyRate" ? (value ? Number(value) : null) : value }),
    });
    load();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    setNewTitle("");
    setAdding(false);
    load();
  };

  const remove = async (id: string) => {
    const updated = subtasks.filter((s) => s.id !== id);
    setSubtasks(updated);
    onChange?.(updated);
    await fetch(`/api/subtasks/${id}`, { method: "DELETE" });
    load();
  };

  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <div>
      {subtasks.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: c.subtle }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(doneCount / subtasks.length) * 100}%`, background: "#22C55E" }}
            />
          </div>
          <span className="text-[12px] font-semibold" style={{ color: c.text3 }}>
            {doneCount}/{subtasks.length}
          </span>
        </div>
      )}

      <div className="space-y-1">
        {subtasks.map((st) => {
          const isExpanded = expanded === st.id;
          const isActive = activeSubtaskId === st.id;
          return (
            <div
              key={st.id}
              className="rounded-xl overflow-hidden transition-all"
              style={
                isActive
                  ? { border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.06)" }
                  : { border: "1px solid transparent" }
              }
            >
              <div className="flex items-center gap-2.5 group px-1 py-1">
                <button
                  onClick={() => toggle(st)}
                  className="w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0 transition-all border"
                  style={
                    st.done
                      ? { background: "#22C55E", borderColor: "#22C55E" }
                      : { borderColor: c.border, background: "transparent" }
                  }
                >
                  {st.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </button>
                <span
                  className="flex-1 text-[13.5px]"
                  style={{
                    color: st.done ? c.text3 : c.text1,
                    textDecoration: st.done ? "line-through" : undefined,
                  }}
                >
                  {st.title}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  {onActivateSubtask && (
                    <button
                      onClick={() => onActivateSubtask(isActive ? null : st.id)}
                      className="p-1 rounded-md transition-all"
                      title={isActive ? "Zastavit sledování" : "Sledovat čas"}
                      style={{ color: isActive ? "#22C55E" : c.text3 }}
                    >
                      <Play className={`w-3 h-3${isActive ? " fill-current" : ""}`} />
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : st.id)}
                    className="p-1 rounded-md transition-all"
                    style={{ color: c.text3 }}
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => remove(st.id)}
                    className="p-1 rounded-md transition-all hover:text-red-500"
                    style={{ color: c.text3 }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-8 pb-3 pt-0.5 space-y-2">
                  <textarea
                    defaultValue={st.description ?? ""}
                    onBlur={(e) => updateField(st, "description", e.target.value)}
                    placeholder="Popis podúkolu..."
                    rows={2}
                    className="w-full text-[12.5px] rounded-lg px-2.5 py-2 resize-none outline-none"
                    style={{ background: c.inputBg, color: c.text1, border: `1px solid ${c.border}` }}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-[11.5px]" style={{ color: c.text3 }}>
                      Sazba (Kč/h):
                    </label>
                    <input
                      type="number"
                      defaultValue={st.hourlyRate ?? ""}
                      onBlur={(e) => updateField(st, "hourlyRate", e.target.value)}
                      placeholder="Výchozí"
                      min="0"
                      step="10"
                      className="w-24 text-[12.5px] rounded-lg px-2 py-1 outline-none"
                      style={{ background: c.inputBg, color: c.text1, border: `1px solid ${c.border}` }}
                    />
                    {st.hourlyRate && (
                      <span className="text-[11px]" style={{ color: c.text3 }}>
                        ({st.hourlyRate} Kč/h)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={add} className="flex items-center gap-2 mt-2.5">
        <Plus className="w-4 h-4 flex-shrink-0" style={{ color: c.text3 }} />
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Přidat podúkol..."
          disabled={adding}
          className="flex-1 text-[13.5px] bg-transparent outline-none"
          style={{ color: c.text1 }}
        />
      </form>
    </div>
  );
}
