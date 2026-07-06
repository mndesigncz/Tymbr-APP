"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  Plus, X, Check, LayoutTemplate, Save, Trash2, Play,
  Circle, Flag, CalendarRange, Tag, Users, Repeat,
  CheckSquare, Star, Target, Zap, AlertTriangle, FileText, Package,
  FolderOpen, Globe, Home, MessageSquare, Settings2, Wrench, Heart,
  Briefcase, BookOpen, Bell, PenLine, UserCheck, Palmtree,
} from "lucide-react";
import type { Task, Category, User, Vacation, Project } from "@/types";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { usePriorityConfig } from "@/hooks/usePriorityConfig";
import { useTimeTracker } from "@/context/TimeTrackerContext";
import { computeEstimate, formatCZK, formatDuration, hoursToMinutes, minutesToHours } from "@/lib/pricing";
import { formatDate } from "@/lib/utils";
import { DropdownPortal } from "@/components/ui/DropdownPortal";

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  hourlyRate: number | null;
  categoryId: string | null;
  subtasks: { title: string; description?: string; hourlyRate?: string }[] | null;
}

interface DraftSubtask {
  title: string;
  description: string;
  hourlyRate: string;
  estimatedHours: string;
}

interface TaskFormProps {
  task?: Task;
  defaultStatus?: string;
  /** Pre-fill a NEW task form (e.g. when creating a task from a note). Ignored when editing. */
  initialValues?: { title?: string; description?: string };
  onSuccess?: (task: Task) => void;
  onCancel?: () => void;
}

// Lucide icons available for task icon picker
const ICON_OPTIONS: { key: string; Icon: React.ElementType }[] = [
  { key: "CheckSquare", Icon: CheckSquare },
  { key: "Star",        Icon: Star },
  { key: "Flag",        Icon: Flag },
  { key: "Target",      Icon: Target },
  { key: "Zap",         Icon: Zap },
  { key: "AlertTriangle", Icon: AlertTriangle },
  { key: "FileText",    Icon: FileText },
  { key: "Package",     Icon: Package },
  { key: "FolderOpen",  Icon: FolderOpen },
  { key: "Tag",         Icon: Tag },
  { key: "Globe",       Icon: Globe },
  { key: "Home",        Icon: Home },
  { key: "Users",       Icon: Users },
  { key: "Calendar",    Icon: CalendarRange },
  { key: "MessageSquare", Icon: MessageSquare },
  { key: "Settings",    Icon: Settings2 },
  { key: "Wrench",      Icon: Wrench },
  { key: "Heart",       Icon: Heart },
  { key: "Briefcase",   Icon: Briefcase },
  { key: "BookOpen",    Icon: BookOpen },
  { key: "Bell",        Icon: Bell },
  { key: "PenLine",     Icon: PenLine },
  { key: "Circle",      Icon: Circle },
  { key: "Repeat",      Icon: Repeat },
];

const ICON_MAP: Record<string, React.ElementType> = Object.fromEntries(
  ICON_OPTIONS.map(({ key, Icon }) => [key, Icon])
);

/** Section label — matches the rest of the app's form sections (ContentPostForm). */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>
      {children}
    </label>
  );
}

export function TaskForm({ task, defaultStatus, initialValues, onSuccess, onCancel }: TaskFormProps) {
  const router = useRouter();
  const statuses = useStatusConfig();
  const priorities = usePriorityConfig();
  const { start, openFocus } = useTimeTracker();

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingWork, setStartingWork] = useState(false);
  const [error, setError] = useState("");
  const [draftSubtasks, setDraftSubtasks] = useState<DraftSubtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [expandedSubtask, setExpandedSubtask] = useState<number | null>(null);

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const iconPickerRef = useRef<HTMLButtonElement>(null);

  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const templateRef = useRef<HTMLButtonElement>(null);

  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(
    () => task?.assignees?.map((a) => a.id) ?? (task?.assigneeId ? [task.assigneeId] : [])
  );

  const [form, setForm] = useState({
    title: task?.title || initialValues?.title || "",
    description: task?.description || initialValues?.description || "",
    status: task?.status || defaultStatus || "todo",
    priority: task?.priority || "medium",
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    startDate: task?.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "",
    categoryId: task?.categoryId || "",
    projectId: task?.projectId || "",
    hourlyRate: task?.hourlyRate ? String(task.hourlyRate) : "",
    estimatedHours: minutesToHours(task?.estimatedMinutes),
    expenses: task?.expenses ? String(task.expenses) : "",
    recurring: task?.recurring || "none",
    icon: task?.icon || "",
    customApproverId: task?.customApproverId || "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/task-templates").then((r) => r.json()),
      fetch("/api/vacations?status=approved").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]).then(([cats, usrs, tmpl, vacs, projs]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
      setTemplates(Array.isArray(tmpl) ? tmpl : []);
      setVacations(Array.isArray(vacs) ? vacs : []);
      setProjects(Array.isArray(projs) ? projs : []);
    });
  }, []);


  const applyTemplate = (t: TaskTemplate) => {
    setForm((f) => ({
      ...f,
      title: t.name,
      description: t.description || "",
      status: t.status,
      priority: t.priority as Task["priority"],
      dueDate: "",
      startDate: "",
      categoryId: t.categoryId || "",
      hourlyRate: t.hourlyRate ? String(t.hourlyRate) : "",
      recurring: "none",
    }));
    if (Array.isArray(t.subtasks)) {
      setDraftSubtasks(t.subtasks.map((st) => ({ title: st.title, description: st.description || "", hourlyRate: st.hourlyRate || "", estimatedHours: "" })));
    }
    setSelectedAssigneeIds([]);
    setTemplateOpen(false);
  };

  const deleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch(`/api/task-templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          description: form.description || null,
          status: form.status,
          priority: form.priority,
          hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
          categoryId: form.categoryId || null,
          subtasks: draftSubtasks.length > 0 ? draftSubtasks : null,
        }),
      });
      if (res.ok) {
        const t = await res.json();
        setTemplates((prev) => [t, ...prev]);
        setSaveTemplateOpen(false);
        setTemplateName("");
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const buildPayload = () => ({
    ...form,
    dueDate: form.dueDate || null,
    startDate: form.startDate || null,
    categoryId: form.categoryId || null,
    hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
    estimatedMinutes: hoursToMinutes(form.estimatedHours),
    expenses: form.expenses ? Number(form.expenses) : null,
    assigneeIds: selectedAssigneeIds,
    recurring: form.recurring || "none",
    icon: form.icon || null,
    customApproverId: form.customApproverId || null,
    projectId: form.projectId || null,
  });

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
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Chyba");
        return;
      }
      const saved: Task = await res.json();
      if (!task && draftSubtasks.length > 0) {
        await Promise.all(
          draftSubtasks.map((st, i) =>
            fetch(`/api/tasks/${saved.id}/subtasks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: st.title, order: i, estimatedMinutes: hoursToMinutes(st.estimatedHours) }),
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

  const handleStartWork = async () => {
    if (!form.title.trim()) { setError("Název je povinný"); return; }
    setStartingWork(true);
    setError("");

    const url = task ? `/api/tasks/${task.id}` : "/api/tasks";
    const method = task ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Chyba");
        return;
      }
      const saved: Task = await res.json();
      const categoryColor = categories.find((c) => c.id === form.categoryId)?.color;
      await start(saved.id, saved.title, categoryColor);
      openFocus();
      if (onSuccess) onSuccess(saved);
      else router.push(`/tasks/${saved.id}`);
    } finally {
      setStartingWork(false);
    }
  };

  const addDraftSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setDraftSubtasks((prev) => [...prev, { title: newSubtaskTitle.trim(), description: "", hourlyRate: "", estimatedHours: "" }]);
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
  const selectedUsers = users.filter((u) => selectedAssigneeIds.includes(u.id));
  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const showCustomApprover = !selectedCategory?.approvalEnabled;
  const TaskIcon = form.icon ? ICON_MAP[form.icon] : null;

  // Soft warning: any selected assignee on approved leave on the task's due date.
  const vacationConflicts = form.dueDate
    ? vacations
        .filter((v) => {
          if (!selectedAssigneeIds.includes(v.userId)) return false;
          const due = form.dueDate; // yyyy-mm-dd
          const start = new Date(v.startDate).toISOString().slice(0, 10);
          const end = new Date(v.endDate).toISOString().slice(0, 10);
          return due >= start && due <= end;
        })
        .map((v) => {
          const u = users.find((x) => x.id === v.userId);
          const label = v.type === "sick" ? "nemoc" : v.type === "personal" ? "volno" : "dovolenou";
          return { id: v.id, name: u?.name ?? "Člen", label, start: v.startDate, end: v.endDate };
        })
    : [];

  const filteredUsers = assigneeSearch.trim()
    ? users.filter((u) =>
        u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(assigneeSearch.toLowerCase())
      )
    : users;

  const handleCancel = onCancel ?? (() => router.back());

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl mx-auto">
      {/* Template picker — new tasks only */}
      {!task && (
        <>
          <button
            ref={templateRef}
            type="button"
            onClick={() => setTemplateOpen((o) => !o)}
            className="flex items-center justify-center gap-2 text-[13px] font-semibold px-3.5 py-2.5 rounded-xl border transition-all hover:bg-[var(--hover)] w-full"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
            <LayoutTemplate className="w-4 h-4" />
            Použít šablonu
            {templates.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-md font-semibold"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {templates.length}
              </span>
            )}
          </button>

          <DropdownPortal
            triggerRef={templateRef}
            open={templateOpen}
            onClose={() => setTemplateOpen(false)}
            className="rounded-2xl border overflow-hidden glass-strong animate-scale-in"
            style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)", minWidth: "320px" }}
          >
            {templates.length === 0 ? (
              <p className="text-[13px] px-4 py-5 text-center" style={{ color: "var(--text-3)" }}>
                Žádné šablony. Vyplň formulář a ulož ho jako šablonu.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
                {templates.map((t) => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => applyTemplate(t)}
                    onKeyDown={(e) => { if (e.key === "Enter") applyTemplate(t); }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--hover)] cursor-pointer">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{t.name}</p>
                      {t.description && (
                        <p className="text-[12px] truncate mt-0.5" style={{ color: "var(--text-3)" }}>{t.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => deleteTemplate(e, t.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-[var(--danger-soft)]"
                      style={{ color: "var(--text-3)" }}
                      aria-label="Smazat šablonu">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </DropdownPortal>
        </>
      )}

      {/* Title + icon picker */}
      <div>
        <FieldLabel>Název</FieldLabel>
        <div className="flex items-center gap-2.5">
          <button
            ref={iconPickerRef}
            type="button"
            onClick={() => setIconPickerOpen((o) => !o)}
            className="w-[46px] h-[46px] rounded-xl flex-shrink-0 flex items-center justify-center border transition-all hover:bg-[var(--hover)]"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: form.icon ? "var(--accent)" : "var(--text-3)" }}
            title="Vybrat ikonu" aria-label="Vybrat ikonu">
            {TaskIcon ? <TaskIcon className="w-5 h-5" /> : <PenLine className="w-[18px] h-[18px]" />}
          </button>
          <input
            value={form.title}
            onChange={set("title")}
            required
            placeholder="Co je potřeba udělat?"
            className="flex-1 min-w-0 border rounded-xl px-3.5 py-2.5 text-[15px] font-semibold transition-all placeholder:font-medium placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}
          />
        </div>

        {/* Icon picker dropdown */}
        <DropdownPortal
          triggerRef={iconPickerRef}
          open={iconPickerOpen}
          onClose={() => setIconPickerOpen(false)}
          className="rounded-2xl border p-3 glass-strong animate-scale-in"
          style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)", minWidth: "252px" }}
        >
          <div className="grid grid-cols-6 gap-1.5">
            {ICON_OPTIONS.map(({ key, Icon: Opt }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setForm((f) => ({ ...f, icon: f.icon === key ? "" : key })); setIconPickerOpen(false); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-[var(--hover)]"
                style={{
                  background: form.icon === key ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
                  color: form.icon === key ? "var(--accent)" : "var(--text-2)",
                }}
              >
                <Opt className="w-[18px] h-[18px]" />
              </button>
            ))}
          </div>
          {form.icon && (
            <button
              type="button"
              onClick={() => { setForm((f) => ({ ...f, icon: "" })); setIconPickerOpen(false); }}
              className="mt-2 w-full text-[12px] py-1.5 rounded-xl text-center transition-colors hover:bg-[var(--danger-soft)]"
              style={{ color: "var(--text-3)" }}
            >
              Odebrat ikonu
            </button>
          )}
        </DropdownPortal>
      </div>

      {/* Status */}
      <div>
        <FieldLabel>Stav</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => {
            const active = form.status === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: s.key }))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12.5px] font-semibold transition-all"
                style={active
                  ? { borderColor: s.color, background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color }
                  : { borderColor: "var(--border)", background: "var(--bg-subtle)", color: "var(--text-2)" }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority */}
      <div>
        <FieldLabel>Priorita</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {priorities.map((p) => {
            const active = form.priority === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, priority: p.key as Task["priority"] }))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12.5px] font-semibold transition-all"
                style={active
                  ? { borderColor: p.color, background: `color-mix(in srgb, ${p.color} 12%, transparent)`, color: p.color }
                  : { borderColor: "var(--border)", background: "var(--bg-subtle)", color: "var(--text-2)" }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dates */}
      <div>
        <FieldLabel>Termín</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11.5px] mb-1 block" style={{ color: "var(--text-3)" }}>Začátek</span>
            <div className="flex items-center gap-1">
              <Input type="date" value={form.startDate} onChange={set("startDate")} className="flex-1 min-w-0" />
              {form.startDate && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, startDate: "" }))}
                  className="p-1.5 rounded-lg transition-colors hover:bg-[var(--danger-soft)] flex-shrink-0"
                  style={{ color: "var(--text-3)" }} aria-label="Vymazat datum začátku">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="text-[11.5px] mb-1 block" style={{ color: "var(--text-3)" }}>Splnění</span>
            <div className="flex items-center gap-1">
              <Input type="date" value={form.dueDate} onChange={set("dueDate")} className="flex-1 min-w-0" />
              {form.dueDate && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, dueDate: "" }))}
                  className="p-1.5 rounded-lg transition-colors hover:bg-[var(--danger-soft)] flex-shrink-0"
                  style={{ color: "var(--text-3)" }} aria-label="Vymazat datum splnění">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vacation conflict — soft warning, does not block saving */}
      {vacationConflicts.length > 0 && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border"
          style={{ background: "color-mix(in srgb, #F59E0B 8%, transparent)", borderColor: "color-mix(in srgb, #F59E0B 35%, transparent)" }}>
          <Palmtree className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
          <div className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {vacationConflicts.map((c) => (
              <div key={c.id}>
                <strong style={{ color: "var(--text-1)" }}>{c.name}</strong> má v termínu splnění {c.label} ({formatDate(c.start)}{new Date(c.start).toDateString() !== new Date(c.end).toDateString() && <> – {formatDate(c.end)}</>}).
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project + Category + Recurring */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projects.length > 0 && (
          <Select
            label="Projekt"
            value={form.projectId}
            onChange={set("projectId")}
            options={[
              { value: "", label: "Bez projektu" },
              ...projects
                .filter((p) => p.status === "active" || p.status === "on_hold" || p.id === form.projectId)
                .map((p) => ({ value: p.id, label: p.client ? `${p.name} · ${p.client.name}` : p.name })),
            ]}
          />
        )}
        <Select label="Kategorie" options={catOptions} value={form.categoryId} onChange={set("categoryId")} placeholder="Žádná" />
        <Select
          label="Opakování"
          value={form.recurring}
          onChange={set("recurring")}
          options={[
            { value: "none", label: "Žádné" },
            { value: "daily", label: "Denně" },
            { value: "weekly", label: "Týdně" },
            { value: "monthly", label: "Měsíčně" },
          ]}
        />
      </div>

      {/* Hourly rate + estimated time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Hodinová sazba (Kč/h)" type="number" placeholder="Např. 500"
          value={form.hourlyRate} onChange={set("hourlyRate")} min="0" step="10" />
        <Input label="Předpokládaná doba (h)" type="number" placeholder="Např. 2.5"
          value={form.estimatedHours} onChange={set("estimatedHours")} min="0" step="0.5" />
      </div>

      {/* Expenses */}
      <Input label="Náklady / materiál (Kč)" type="number" placeholder="Např. 1500"
        value={form.expenses} onChange={set("expenses")} min="0" step="100" />

      {/* Assignees */}
      <div>
        <FieldLabel>
          Přiřazeno{selectedUsers.length > 0 && <span style={{ color: "var(--accent)" }}> · {selectedUsers.length}</span>}
        </FieldLabel>
        {users.length > 0 ? (
          <div className="rounded-xl border p-2 space-y-2" style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}>
            <input
              type="text"
              value={assigneeSearch}
              onChange={(e) => setAssigneeSearch(e.target.value)}
              placeholder="Hledat člena týmu..."
              className="w-full text-[13px] rounded-lg px-3 py-2 outline-none border"
              style={{ background: "var(--bg-card)", color: "var(--text-1)", borderColor: "var(--border-md)" }}
            />
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-[12.5px] text-center py-3" style={{ color: "var(--text-3)" }}>Nikdo nenalezen</p>
              ) : (
                filteredUsers.map((u) => {
                  const selected = selectedAssigneeIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-left"
                      style={{ background: selected ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "var(--bg-card)" }}
                    >
                      <Avatar name={u.name} src={u.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{u.name}</p>
                        <p className="text-[11.5px] truncate" style={{ color: "var(--text-3)" }}>{u.email}</p>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--accent)" }}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Žádní členové týmu</p>
        )}
      </div>

      {/* Custom approver — only when selected category has no approval enabled */}
      {showCustomApprover && users.length > 0 && (
        <div>
          <FieldLabel>
            Schvalovatel{form.customApproverId && <span style={{ color: "var(--accent)" }}> · vybráno</span>}
          </FieldLabel>
          <div className="rounded-xl border p-2 space-y-1 max-h-44 overflow-y-auto"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, customApproverId: "" }))}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-left"
              style={{ background: !form.customApproverId ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "var(--bg-card)" }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-md)" }}>
                <X className="w-3 h-3" style={{ color: "var(--text-3)" }} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>Žádný schvalovatel</p>
              {!form.customApproverId && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-auto"
                  style={{ background: "var(--accent)" }}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
            {users.map((u) => {
              const selected = form.customApproverId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, customApproverId: f.customApproverId === u.id ? "" : u.id }))}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-left"
                  style={{ background: selected ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "var(--bg-card)" }}
                >
                  <Avatar name={u.name} src={u.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{u.name}</p>
                    <p className="text-[11.5px] truncate" style={{ color: "var(--text-3)" }}>{u.email}</p>
                  </div>
                  {selected && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--accent)" }}>
                      <UserCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtasks — new tasks only */}
      {!task && (
        <div>
          <FieldLabel>Podúkoly</FieldLabel>
          <div className="space-y-1.5">
            {draftSubtasks.map((st, i) => (
              <div key={i} className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--border-md)", background: "var(--bg-subtle)" }}>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {st.title}
                  </span>
                  <button type="button" onClick={() => setExpandedSubtask(expandedSubtask === i ? null : i)}
                    className="text-[11px] px-2 py-0.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
                    style={{ color: "var(--text-3)" }}>
                    {expandedSubtask === i ? "Skrýt" : "Upravit"}
                  </button>
                  <button type="button" onClick={() => removeDraftSubtask(i)}
                    className="p-1 rounded-lg transition-colors hover:bg-[var(--danger-soft)]"
                    style={{ color: "var(--text-3)" }} aria-label="Odebrat podúkol">
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
                      className="w-full text-[12.5px] rounded-lg px-2.5 py-2 resize-none outline-none mt-2 border"
                      style={{ background: "var(--bg-card)", color: "var(--text-1)", borderColor: "var(--border-md)" }}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-[11.5px]" style={{ color: "var(--text-3)" }}>Sazba (Kč/h):</label>
                        <input
                          type="number"
                          value={st.hourlyRate}
                          onChange={(e) => updateDraftSubtask(i, "hourlyRate", e.target.value)}
                          placeholder="Výchozí"
                          min="0"
                          step="10"
                          className="w-24 text-[12.5px] rounded-lg px-2 py-1 outline-none border"
                          style={{ background: "var(--bg-card)", color: "var(--text-1)", borderColor: "var(--border-md)" }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11.5px]" style={{ color: "var(--text-3)" }}>Čas (h):</label>
                        <input
                          type="number"
                          value={st.estimatedHours}
                          onChange={(e) => updateDraftSubtask(i, "estimatedHours", e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.5"
                          className="w-20 text-[12.5px] rounded-lg px-2 py-1 outline-none border"
                          style={{ background: "var(--bg-card)", color: "var(--text-1)", borderColor: "var(--border-md)" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-1.5">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDraftSubtask(); } }}
              placeholder="Přidat podúkol..."
              className="flex-1 text-[13px] rounded-xl px-3 py-2 outline-none border"
              style={{ background: "var(--bg-card)", color: "var(--text-1)", borderColor: "var(--border-md)" }}
            />
            <button
              type="button"
              onClick={addDraftSubtask}
              className="p-2.5 rounded-xl transition-all hover:bg-[var(--hover)] border"
              style={{ background: "var(--bg-card)", color: "var(--text-2)", borderColor: "var(--border-md)" }}
              aria-label="Přidat podúkol"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Price estimate preview */}
      {(() => {
        const est = computeEstimate({
          taskMinutes: hoursToMinutes(form.estimatedHours),
          taskRate: form.hourlyRate ? Number(form.hourlyRate) : null,
          expenses: form.expenses ? Number(form.expenses) : null,
          subtasks: draftSubtasks.map((st) => ({
            minutes: hoursToMinutes(st.estimatedHours),
            rate: st.hourlyRate ? Number(st.hourlyRate) : null,
          })),
        });
        if (!est.hasData) return null;
        return (
          <div className="rounded-xl border p-4 space-y-2.5"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}>
            <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
              Předpokládaná cena zakázky
            </p>
            <div className="space-y-1.5">
              {est.laborTask > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span style={{ color: "var(--text-2)" }}>Práce – úkol ({formatDuration(hoursToMinutes(form.estimatedHours) ?? 0)})</span>
                  <span className="font-semibold" style={{ color: "var(--text-1)" }}>{formatCZK(est.laborTask)}</span>
                </div>
              )}
              {est.laborSubtasks > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span style={{ color: "var(--text-2)" }}>Práce – podúkoly</span>
                  <span className="font-semibold" style={{ color: "var(--text-1)" }}>{formatCZK(est.laborSubtasks)}</span>
                </div>
              )}
              {est.expenses > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span style={{ color: "var(--text-2)" }}>Náklady / materiál</span>
                  <span className="font-semibold" style={{ color: "var(--text-1)" }}>{formatCZK(est.expenses)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-[13.5px] font-bold" style={{ color: "var(--text-1)" }}>Celkem</span>
              <span className="text-[13.5px] font-bold" style={{ color: "var(--accent)" }}>{formatCZK(est.total)}</span>
            </div>
            {est.totalMinutes > 0 && (
              <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                Celková doba: {formatDuration(est.totalMinutes)}
              </p>
            )}
          </div>
        );
      })()}

      {/* Description */}
      <Textarea
        label="Popis"
        value={form.description}
        onChange={set("description")}
        placeholder="Přidej poznámky, odkazy nebo podrobnější popis…"
        rows={4}
      />

      {error && <p className="text-sm px-1" style={{ color: "var(--danger)" }}>{error}</p>}

      {/* Save as template — new tasks only */}
      {!task && (
        <div className="px-1">
          {saveTemplateOpen ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveAsTemplate(); } if (e.key === "Escape") setSaveTemplateOpen(false); }}
                placeholder="Název šablony..."
                autoFocus
                className="flex-1 text-[13px] rounded-xl px-3 py-2 outline-none border"
                style={{ background: "var(--bg-card)", color: "var(--text-1)", borderColor: "var(--border-md)" }}
              />
              <button
                type="button"
                onClick={saveAsTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="px-3 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--accent)" }}>
                {savingTemplate ? "…" : "Uložit"}
              </button>
              <button type="button" onClick={() => { setSaveTemplateOpen(false); setTemplateName(""); }}
                className="p-2 rounded-xl transition-colors hover:bg-[var(--hover)]" style={{ color: "var(--text-3)" }}
                aria-label="Zrušit">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSaveTemplateOpen(true)}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: "var(--text-3)" }}>
              <Save className="w-3.5 h-3.5" />
              Uložit jako šablonu
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2.5 pt-1">
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleCancel} className="flex-1">
            Zrušit
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {task ? "Uložit změny" : "Vytvořit úkol"}
          </Button>
        </div>

        <button
          type="button"
          onClick={handleStartWork}
          disabled={startingWork || loading}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-[var(--hover)] disabled:opacity-50"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}
        >
          <Play className="w-3.5 h-3.5 fill-current" style={{ color: "var(--success)" }} />
          {startingWork ? "Spouštím…" : "Začít pracovat"}
        </button>
      </div>
    </form>
  );
}
