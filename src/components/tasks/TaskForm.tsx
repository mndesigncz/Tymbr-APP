"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Task, Category, User } from "@/types";

const STATUS_OPTIONS = [
  { value: "todo", label: "K provedení" },
  { value: "in_progress", label: "Probíhá" },
  { value: "review", label: "Ke schválení" },
  { value: "done", label: "Hotovo" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Nízká" },
  { value: "medium", label: "Střední" },
  { value: "high", label: "Vysoká" },
  { value: "urgent", label: "Urgentní" },
];

interface TaskFormProps {
  task?: Task;
  defaultStatus?: string;
  onSuccess?: (task: Task) => void;
}

export function TaskForm({ task, defaultStatus, onSuccess }: TaskFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || defaultStatus || "todo",
    priority: task?.priority || "medium",
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    startDate: task?.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "",
    categoryId: task?.categoryId || "",
    assigneeId: task?.assigneeId || "",
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
          assigneeId: form.assigneeId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Chyba");
        return;
      }
      const saved: Task = await res.json();
      if (onSuccess) onSuccess(saved);
      else router.push(`/tasks/${saved.id}`);
    } finally {
      setLoading(false);
    }
  };

  const catOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));

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

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Kategorie"
          options={catOptions}
          value={form.categoryId}
          onChange={set("categoryId")}
          placeholder="Vybrat kategorii"
        />
        <Select
          label="Přiřazeno"
          options={userOptions}
          value={form.assigneeId}
          onChange={set("assigneeId")}
          placeholder="Nikomu"
        />
      </div>

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
