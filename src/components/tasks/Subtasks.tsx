"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { SubTask } from "@/types";

interface SubtasksProps {
  taskId: string;
  dark?: boolean;
  onChange?: (subtasks: SubTask[]) => void;
}

export function Subtasks({ taskId, dark, onChange }: SubtasksProps) {
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const load = () => {
    fetch(`/api/tasks/${taskId}/subtasks`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setSubtasks(list);
        onChange?.(list);
      });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [taskId]);

  const toggle = async (st: SubTask) => {
    setSubtasks((prev) => prev.map((s) => (s.id === st.id ? { ...s, done: !s.done } : s)));
    await fetch(`/api/subtasks/${st.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !st.done }),
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
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/subtasks/${id}`, { method: "DELETE" });
    load();
  };

  const doneCount = subtasks.filter((s) => s.done).length;
  const c = {
    text1: dark ? "#f5f5f7" : "var(--text-1)",
    text3: dark ? "#8a8a92" : "var(--text-3)",
    subtle: dark ? "rgba(255,255,255,0.06)" : "var(--bg-subtle)",
    border: dark ? "rgba(255,255,255,0.1)" : "var(--border-md)",
  };

  return (
    <div>
      {subtasks.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: c.subtle }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(doneCount / subtasks.length) * 100}%`, background: "#22C55E" }} />
          </div>
          <span className="text-[12px] font-semibold" style={{ color: c.text3 }}>
            {doneCount}/{subtasks.length}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        {subtasks.map((st) => (
          <div key={st.id} className="flex items-center gap-2.5 group">
            <button
              onClick={() => toggle(st)}
              className="w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0 transition-all border"
              style={st.done
                ? { background: "#22C55E", borderColor: "#22C55E" }
                : { borderColor: c.border, background: "transparent" }}
            >
              {st.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </button>
            <span className="flex-1 text-[13.5px]"
              style={{ color: st.done ? c.text3 : c.text1, textDecoration: st.done ? "line-through" : undefined }}>
              {st.title}
            </span>
            <button
              onClick={() => remove(st.id)}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:text-red-500"
              style={{ color: c.text3 }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
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
