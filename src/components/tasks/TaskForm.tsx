"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  Plus, X, Check, LayoutTemplate, Save, Trash2, ChevronDown,
  Circle, Flag, CalendarRange, Tag, Users, Banknote, Repeat, Play,
  CheckSquare, Star, Target, Zap, AlertTriangle, FileText, Package,
  FolderOpen, Globe, Home, MessageSquare, Settings2, Wrench, Heart,
  Briefcase, BookOpen, Bell, PenLine,
} from "lucide-react";
import type { Task, Category, User } from "@/types";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { usePriorityConfig } from "@/hooks/usePriorityConfig";
import { useTimeTracker } from "@/context/TimeTrackerContext";
import { formatDate } from "@/lib/utils";

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
}

interface TaskFormProps {
  task?: Task;
  defaultStatus?: string;
  onSuccess?: (task: Task) => void;
}

const RECURRING_LABELS: Record<string, string> = {
  none: "Žádné",
  daily: "Denně",
  weekly: "Týdně",
  monthly: "Měsíčně",
};

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

function Row({
  icon: Icon,
  label,
  value,
  open,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02]"
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0"
          style={{ color: open ? "var(--accent)" : "var(--text-3)" }} />
        <span className="text-[14px] font-medium flex-shrink-0" style={{ color: "var(--text-1)" }}>
          {label}
        </span>
        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
          {!open && (
            <span className="text-[13.5px] truncate flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
              {value}
            </span>
          )}
          <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform"
            style={{ color: "var(--text-3)", transform: open ? "rotate(180deg)" : "none" }} />
        </div>
      </button>
      {open && <div className="px-4 pb-4 pt-0.5">{children}</div>}
    </div>
  );
}

export function TaskForm({ task, defaultStatus, onSuccess }: TaskFormProps) {
  const router = useRouter();
  const statuses = useStatusConfig();
  const STATUS_OPTIONS = statuses.map((s) => ({ value: s.key, label: s.label }));
  const priorities = usePriorityConfig();
  const PRIORITY_OPTIONS = priorities.map((p) => ({ value: p.key, label: p.label }));
  const { start, openFocus } = useTimeTracker();

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingWork, setStartingWork] = useState(false);
  const [error, setError] = useState("");
  const [draftSubtasks, setDraftSubtasks] = useState<DraftSubtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [expandedSubtask, setExpandedSubtask] = useState<number | null>(null);

  const [openRow, setOpenRow] = useState<string | null>(null);
  const toggleRow = (key: string) => setOpenRow((cur) => (cur === key ? null : key));

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);

  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const templateRef = useRef<HTMLDivElement>(null);

  const [assigneeSearch, setAssigneeSearch] = useState("");

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
    recurring: task?.recurring || "none",
    icon: task?.icon || "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/task-templates").then((r) => r.json()),
    ]).then(([cats, usrs, tmpl]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
      setTemplates(Array.isArray(tmpl) ? tmpl : []);
    });
  }, []);

  useEffect(() => {
    if (!templateOpen) return;
    const handle = (e: MouseEvent) => {
      if (templateRef.current && !templateRef.current.contains(e.target as Node)) {
        setTemplateOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [templateOpen]);

  useEffect(() => {
    if (!iconPickerOpen) return;
    const handle = (e: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) {
        setIconPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [iconPickerOpen]);

  const applyTemplate = (t: TaskTemplate) => {
    setForm((f) => ({
      ...f,
      title: t.name,
      description: t.description || "",
      status: t.status,
      priority: t.priority as any,
      dueDate: "",
      startDate: "",
      categoryId: t.categoryId || "",
      hourlyRate: t.hourlyRate ? String(t.hourlyRate) : "",
      recurring: "none",
    }));
    if (Array.isArray(t.subtasks)) {
      setDraftSubtasks(t.subtasks.map((st) => ({ title: st.title, description: st.description || "", hourlyRate: st.hourlyRate || "" })));
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
    assigneeIds: selectedAssigneeIds,
    recurring: form.recurring || "none",
    icon: form.icon || null,
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

  const curStatus = statuses.find((s) => s.key === form.status);
  const curPriority = priorities.find((p) => p.key === form.priority);
  const curCategory = categories.find((c) => c.id === form.categoryId);
  const selectedUsers = users.filter((u) => selectedAssigneeIds.includes(u.id));

  // Priority color for the header tint (fallback to neutral if not loaded yet)
  const priorityColor = curPriority?.color ?? "#6366f1";

  // Current task icon component (if one is selected)
  const TaskIcon = form.icon ? ICON_MAP[form.icon] : null;

  const filteredUsers = assigneeSearch.trim()
    ? users.filter((u) =>
        u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(assigneeSearch.toLowerCase())
      )
    : users;

  const termínValue = (() => {
    if (form.startDate && form.dueDate) return `${formatDate(form.startDate)} → ${formatDate(form.dueDate)}`;
    if (form.dueDate) return formatDate(form.dueDate);
    if (form.startDate) return `Od ${formatDate(form.startDate)}`;
    return <span style={{ color: "var(--text-3)" }}>Nenastaveno</span>;
  })();

  const dot = (color: string) => (
    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
  );
  const placeholder = (text: string) => <span style={{ color: "var(--text-3)" }}>{text}</span>;

  const cardStyle = {
    background: "var(--bg-card)",
    borderColor: "var(--border)",
    boxShadow: "var(--shadow-sm)",
  } as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
      {/* Template picker — new tasks only */}
      {!task && (
        <div className="relative" ref={templateRef}>
          <button
            type="button"
            onClick={() => setTemplateOpen((o) => !o)}
            className="flex items-center gap-2 text-[13px] font-semibold px-3.5 py-2 rounded-xl border transition-all hover:opacity-80 w-full justify-center"
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

          {templateOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl border overflow-hidden shadow-lg"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
              {templates.length === 0 ? (
                <p className="text-[13px] px-4 py-5 text-center" style={{ color: "var(--text-3)" }}>
                  Žádné šablony. Vyplňte formulář a uložte jako šablonu.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.03]">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{t.name}</p>
                        {t.description && (
                          <p className="text-[12px] truncate mt-0.5" style={{ color: "var(--text-3)" }}>{t.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => deleteTemplate(e, t.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:text-red-500"
                        style={{ color: "var(--text-3)" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Title card — colored header + title + icon picker */}
      <div className="rounded-3xl border overflow-hidden" style={cardStyle}>
        {/* Priority-tinted header with icon button */}
        <div
          className="px-4 pt-3.5 pb-3 relative"
          style={{ background: `color-mix(in srgb, ${priorityColor} 13%, var(--bg-card))` }}
          ref={iconPickerRef}
        >
          <div className="flex items-center gap-3">
            {/* Icon picker button */}
            <button
              type="button"
              onClick={() => setIconPickerOpen((o) => !o)}
              className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: `color-mix(in srgb, ${priorityColor} 22%, var(--bg-card))`,
                color: priorityColor,
                boxShadow: `0 2px 8px color-mix(in srgb, ${priorityColor} 20%, transparent)`,
              }}
            >
              {TaskIcon
                ? <TaskIcon className="w-5 h-5" />
                : <PenLine className="w-4 h-4" style={{ color: `color-mix(in srgb, ${priorityColor} 70%, var(--text-3))` }} />
              }
            </button>

            {/* Title input */}
            <input
              value={form.title}
              onChange={set("title")}
              required
              placeholder="Co je potřeba udělat?"
              className="flex-1 bg-transparent outline-none text-[18px] font-bold tracking-tight placeholder:font-semibold"
              style={{ color: "var(--text-1)" }}
            />
          </div>

          {/* Icon picker dropdown */}
          {iconPickerOpen && (
            <div
              className="absolute top-full left-0 mt-1.5 z-50 rounded-2xl border p-3 shadow-lg"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", minWidth: "252px" }}
            >
              <div className="grid grid-cols-6 gap-1.5">
                {ICON_OPTIONS.map(({ key, Icon: Opt }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setForm((f) => ({ ...f, icon: f.icon === key ? "" : key })); setIconPickerOpen(false); }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-black/[0.07]"
                    style={{
                      background: form.icon === key ? `color-mix(in srgb, ${priorityColor} 14%, transparent)` : "transparent",
                      color: form.icon === key ? priorityColor : "var(--text-2)",
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
                  className="mt-2 w-full text-[12px] py-1.5 rounded-xl text-center transition-colors hover:text-red-500"
                  style={{ color: "var(--text-3)" }}
                >
                  Odebrat ikonu
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings rows */}
      <div className="space-y-2">
        <Row icon={Circle} label="Status" open={openRow === "status"} onToggle={() => toggleRow("status")}
          value={curStatus ? <>{dot(curStatus.color)}{curStatus.label}</> : placeholder("Vybrat")}>
          <Select options={STATUS_OPTIONS} value={form.status} onChange={set("status")} />
        </Row>

        <Row icon={Flag} label="Priorita" open={openRow === "priority"} onToggle={() => toggleRow("priority")}
          value={curPriority ? <>{dot(curPriority.color)}{curPriority.label}</> : placeholder("Vybrat")}>
          <Select options={PRIORITY_OPTIONS} value={form.priority} onChange={set("priority")} />
        </Row>

        {/* Merged start date + due date */}
        <Row icon={CalendarRange} label="Termín" open={openRow === "termin"} onToggle={() => toggleRow("termin")}
          value={termínValue}>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>
                Datum začátku
              </label>
              <div className="flex items-center gap-2">
                <Input type="date" value={form.startDate} onChange={set("startDate")} className="flex-1" />
                {form.startDate && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, startDate: "" }))}
                    className="p-2.5 rounded-xl transition-colors hover:text-red-500"
                    style={{ color: "var(--text-3)" }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>
                Termín splnění
              </label>
              <div className="flex items-center gap-2">
                <Input type="date" value={form.dueDate} onChange={set("dueDate")} className="flex-1" />
                {form.dueDate && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, dueDate: "" }))}
                    className="p-2.5 rounded-xl transition-colors hover:text-red-500"
                    style={{ color: "var(--text-3)" }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </Row>

        <Row icon={Tag} label="Kategorie" open={openRow === "category"} onToggle={() => toggleRow("category")}
          value={curCategory ? <>{dot(curCategory.color)}{curCategory.name}</> : placeholder("Žádná")}>
          <Select options={catOptions} value={form.categoryId} onChange={set("categoryId")} placeholder="Vybrat kategorii" />
        </Row>

        {/* Assignees — search-based list */}
        <Row icon={Users} label="Přiřazeno" open={openRow === "assignees"} onToggle={() => toggleRow("assignees")}
          value={selectedUsers.length > 0
            ? <span className="flex items-center gap-1.5">
                <span className="flex -space-x-1.5">
                  {selectedUsers.slice(0, 3).map((u) => (
                    <span key={u.id} className="ring-2 rounded-full" style={{ ["--tw-ring-color" as any]: "var(--bg-card)" }}>
                      <Avatar name={u.name} src={u.avatar} size="xs" />
                    </span>
                  ))}
                </span>
                {selectedUsers.length > 3 && <span>+{selectedUsers.length - 3}</span>}
              </span>
            : placeholder("Nikdo")}>
          {users.length > 0 ? (
            <div className="space-y-2">
              <input
                type="text"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                placeholder="Hledat člena týmu..."
                className="w-full text-[13px] rounded-xl px-3 py-2 outline-none"
                style={{ background: "var(--bg-subtle)", color: "var(--text-1)", border: "1px solid var(--border-md)" }}
              />
              <div className="space-y-1 max-h-48 overflow-y-auto">
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
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                        style={{
                          background: selected ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--bg-subtle)",
                        }}
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
        </Row>

        <Row icon={Banknote} label="Hodinová sazba" open={openRow === "rate"} onToggle={() => toggleRow("rate")}
          value={form.hourlyRate ? `${form.hourlyRate} Kč/h` : placeholder("Nenastaveno")}>
          <Input type="number" placeholder="Např. 500" value={form.hourlyRate} onChange={set("hourlyRate")} min="0" step="10" />
        </Row>

        <Row icon={Repeat} label="Opakování" open={openRow === "recurring"} onToggle={() => toggleRow("recurring")}
          value={form.recurring && form.recurring !== "none" ? RECURRING_LABELS[form.recurring] : placeholder("Žádné")}>
          <Select
            options={[
              { value: "none", label: "Žádné" },
              { value: "daily", label: "Denně" },
              { value: "weekly", label: "Týdně" },
              { value: "monthly", label: "Měsíčně" },
            ]}
            value={form.recurring}
            onChange={set("recurring")}
          />
        </Row>
      </div>

      {/* Subtasks (only for new tasks) */}
      {!task && (
        <div className="rounded-3xl border p-4 space-y-2.5" style={cardStyle}>
          <label className="text-[13px] font-semibold px-1" style={{ color: "var(--text-2)" }}>Podúkoly</label>
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

      {/* Notes / description */}
      <div className="rounded-3xl border p-4" style={cardStyle}>
        <textarea
          value={form.description}
          onChange={set("description")}
          placeholder="Přidej poznámky, odkazy nebo podrobnější popis…"
          rows={4}
          className="w-full bg-transparent outline-none text-[14px] resize-none placeholder:text-[var(--text-3)]"
          style={{ color: "var(--text-1)" }}
        />
      </div>

      {error && <p className="text-sm text-red-400 px-1">{error}</p>}

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
                className="flex-1 text-[13px] rounded-xl px-3 py-2 outline-none"
                style={{ background: "var(--bg-subtle)", color: "var(--text-1)", border: "1px solid var(--border-md)" }}
              />
              <button
                type="button"
                onClick={saveAsTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="px-3 py-2 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff" }}>
                {savingTemplate ? "…" : "Uložit"}
              </button>
              <button type="button" onClick={() => { setSaveTemplateOpen(false); setTemplateName(""); }}
                className="p-2 rounded-xl transition-colors" style={{ color: "var(--text-3)" }}>
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
          <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
            Zrušit
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {task ? "Uložit změny" : "Vytvořit úkol"}
          </Button>
        </div>

        {/* Matches the "Zahájit práci" button style from dashboard header */}
        <button
          type="button"
          onClick={handleStartWork}
          disabled={startingWork || loading}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-black/[0.03] disabled:opacity-50"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}
        >
          <Play className="w-3.5 h-3.5 fill-current" style={{ color: "#16a34a" }} />
          {startingWork ? "Spouštím…" : "Začít pracovat"}
        </button>
      </div>
    </form>
  );
}
