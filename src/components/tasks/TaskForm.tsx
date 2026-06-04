"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Plus, X, Check } from "lucide-react";
import type { Task, Category, User } from "@/types";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { usePriorityConfig } from "@/hooks/usePriorityConfig";

interface DraftSubtask {
  title: string;
  description: string;
  hourlyRate: string;
}

interface TaskFormProps {
  task?: Task;
  defaultStatus?: string;
  onSuccess?: (task: Task) => void;
}

export function TaskForm({ task, defaultStatus, onSuccess }: TaskFormProps) {
  const router = useRouter();
  const statuses = useStatusConfig();
  const STATUS_OPTIONS = statuses.map((s) => ({ value: s.key, label: s.label }));
  const priorities = usePriorityConfig();
  const PRIORITY_OPTIONS = priorities.map((p) => ({ value: p.key, label: p.label }));
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftSubtasks, setDraftSubtasks] = useState<DraftSubtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [expandedSubtask, setExpandedSubtask] = useState<number | null>(null);

  // Multi-assignee: array of selected user IDs
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(
    () => task?.assignees?.map((a) => a.id) ?? (task?.assigneeId ? [task.assigneeId] : [])
  );

  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || defaultStatus || "todo",
    priority: task?.priority || "medium",
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    startDate: task?.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "",
    categoryId: task?.categoryId || "",
    hourlyRate: task?.hourlyRate ? String(task.hourlyRate) : "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([cats, usrs]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
    });
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Název je povinný"); return; }
    setLoading(true);
    setError("");

    const url = task ? `/api/tasks/${task.id}` : "/api/tasks";
    const method = task ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dueDate: form.dueDate || null,
          startDate: form.startDate || null,
          categoryId: form.categoryId || null,
          hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
          assigneeIds: selectedAssigneeIds,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Chyba");
        return;
      }
      const saved: Task = await res.json();
      // Create draft subtasks for new tasks
      if (!task && draftSubtasks.length > 0) {
        await Promise.all(
          draftSubtasks.map((st, i) =>
            fetch(`/api/tasks/${saved.id}/subtasks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: st.title, order: i }),
            }).then(async (r) => {
              if (r.ok && (st.description || st.hourlyRate)) {
                const created = await r.json();
                await fetch(`/api/subtasks/${created.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    description: st.description || null,
                    hourlyRate: st.hourlyRate ? Number(st.hourlyRate) : null,
                  }),
                });
              }
            })
          )
        );
      }
      if (onSuccess) onSuccess(saved);
      else router.push(`/tasks/${saved.id}`);
    } finally {
      setLoading(false);
    }
  };

  const addDraftSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setDraftSubtasks((prev) => [...prev, { title: newSubtaskTitle.trim(), description: "", hourlyRate: "" }]);
    setNewSubtaskTitle("");
  };

  const removeDraftSubtask = (i: number) => {
    setDraftSubtasks((prev) => prev.filter((_, idx) => idx !== i));
    if (expandedSubtask === i) setExpandedSubtask(null);
  };

  const updateDraftSubtask = (i: number, field: keyof DraftSubtask, value: string) => {
    setDraftSubtasks((prev) => prev.map((st, idx) => idx === i ? { ...st, [field]: value } : st));
  };

  const catOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Název úkolu"
        placeholder="Co je potřeba udělat?"
        value={form.title}
        onChange={set("title")}
        required
      />

      <Textarea
        label="Popis"
        placeholder="Podrobnější popis úkolu..."
        value={form.description}
        onChange={set("description")}
        rows={4}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={form.status}
          onChange={set("status")}
        />
        <Select
          label="Priorita"
          options={PRIORITY_OPTIONS}
          value={form.priority}
          onChange={set("priority")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Datum začátku"
          type="date"
          value={form.startDate}
          onChange={set("startDate")}
        />
        <Input
          label="Termín splnění"
          type="date"
          value={form.dueDate}
          onChange={set("dueDate")}
        />
      </div>

      <Select
        label="Kategorie"
        options={catOptions}
        value={form.categoryId}
        onChange={set("categoryId")}
        placeholder="Vybrat kategorii"
      />

      {/* Multi-assignee picker */}
      {users.length > 0 && (
        <div className="space-y-2">
          <label className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
            Přiřazeno
            {selectedAssigneeIds.length > 0 && (
              <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-md font-semibold"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {selectedAssigneeIds.length}
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => {
              const selected = selectedAssigneeIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-[12.5px] font-medium"
                  style={{
                    background: selected ? "var(--accent-soft)" : "var(--bg-subtle)",
                    borderColor: selected ? "var(--accent)" : "var(--border-md)",
                    color: selected ? "var(--accent)" : "var(--text-2)",
                  }}
                >
                  <Avatar name={u.name} src={u.avatar} size="xs" />
                  {u.name}
                  {selected && <Check className="w-3 h-3 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Input
        label="Hodinová sazba (Kč/h)"
        type="number"
        placeholder="Např. 500"
        value={form.hourlyRate}
        onChange={set("hourlyRate")}
        min="0"
        step="10"
      />

      {/* Subtasks (only for new tasks) */}
      {!task && (
        <div className="space-y-2">
          <label className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>Podúkoly</label>
          <div className="space-y-1.5">
            {draftSubtasks.map((st, i) => (
              <div key={i} className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--border-md)", background: "var(--bg-subtle)" }}>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {st.title}
                  </span>
                  <button type="button" onClick={() => setExpandedSubtask(expandedSubtask === i ? null : i)}
                    className="text-[11px] px-2 py-0.5 rounded-lg transition-colors"
                    style={{ color: "var(--text-3)" }}>
                    {expandedSubtask === i ? "Skrýt" : "Upravit"}
                  </button>
                  <button type="button" onClick={() => removeDraftSubtask(i)}
                    className="p-1 rounded-lg transition-colors hover:text-red-500"
                    style={{ color: "var(--text-3)" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {expandedSubtask === i && (
                  <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <textarea
                      value={st.description}
                      onChange={(e) => updateDraftSubtask(i, "description", e.target.value)}
                      placeholder="Popis podúkolu..."
                      rows={2}
                      className="w-full text-[12.5px] rounded-lg px-2.5 py-2 resize-none outline-none mt-2"
                      style={{ background: "var(--bg-card)", color: "var(--text-1)", border: "1px solid var(--border-md)" }}
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-[11.5px]" style={{ color: "var(--text-3)" }}>Sazba (Kč/h):</label>
                      <input
                        type="number"
                        value={st.hourlyRate}
                        onChange={(e) => updateDraftSubtask(i, "hourlyRate", e.target.value)}
                        placeholder="Výchozí"
                        min="0"
                        step="10"
                        className="w-24 text-[12.5px] rounded-lg px-2 py-1 outline-none"
                        style={{ background: "var(--bg-card)", color: "var(--text-1)", border: "1px solid var(--border-md)" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDraftSubtask(); } }}
              placeholder="Přidat podúkol..."
              className="flex-1 text-[13px] rounded-xl px-3 py-2 outline-none"
              style={{ background: "var(--bg-subtle)", color: "var(--text-1)", border: "1px solid var(--border-md)" }}
            />
            <button
              type="button"
              onClick={addDraftSubtask}
              className="p-2.5 rounded-xl transition-all hover:opacity-80"
              style={{ background: "var(--bg-subtle)", color: "var(--text-2)", border: "1px solid var(--border-md)" }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
          Zrušit
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {task ? "Uložit změny" : "Vytvořit úkol"}
        </Button>
      </div>
    </form>
  );
}
