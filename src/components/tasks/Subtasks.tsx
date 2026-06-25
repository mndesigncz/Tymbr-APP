"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Plus, Trash2, Play, ChevronDown, ChevronUp, User, Calendar, X, ListChecks } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { minutesToHours, hoursToMinutes } from "@/lib/pricing";
import { formatDate, isOverdue } from "@/lib/utils";
import type { SubTask } from "@/types";

interface Member {
  id: string;
  name: string;
  avatar?: string | null;
}

interface SubtasksProps {
  taskId: string;
  dark?: boolean;
  onChange?: (subtasks: SubTask[]) => void;
  activeSubtaskId?: string | null;
  onActivateSubtask?: (id: string | null) => void;
  members?: Member[];
}

export function Subtasks({ taskId, dark, onChange, activeSubtaskId, onActivateSubtask, members = [] }: SubtasksProps) {
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assigneeOpen, setAssigneeOpen] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleVal, setEditTitleVal] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const c = {
    text1: dark ? "#f5f5f7" : "var(--text-1)",
    text3: dark ? "#8a8a92" : "var(--text-3)",
    subtle: dark ? "rgba(255,255,255,0.06)" : "var(--bg-subtle)",
    border: dark ? "rgba(255,255,255,0.1)" : "var(--border-md)",
    inputBg: dark ? "rgba(255,255,255,0.05)" : "var(--bg-card)",
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

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    if (adding) newInputRef.current?.focus();
  }, [adding]);

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

  const startEditTitle = (st: SubTask) => {
    setEditingTitle(st.id);
    setEditTitleVal(st.title);
  };

  const commitTitle = async (st: SubTask) => {
    const val = editTitleVal.trim();
    setEditingTitle(null);
    if (!val || val === st.title) return;
    await fetch(`/api/subtasks/${st.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: val }),
    });
    load();
  };

  const updateField = async (
    st: SubTask,
    field: "description" | "hourlyRate" | "estimatedMinutes" | "dueDate",
    value: string
  ) => {
    let parsed: string | number | null = value;
    if (field === "hourlyRate") parsed = value ? Number(value) : null;
    else if (field === "estimatedMinutes") parsed = hoursToMinutes(value);
    else if (field === "dueDate") parsed = value || null;
    await fetch(`/api/subtasks/${st.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: parsed }),
    });
    load();
  };

  const updateAssignee = async (st: SubTask, assigneeId: string | null) => {
    setAssigneeOpen(null);
    await fetch(`/api/subtasks/${st.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId }),
    });
    load();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) { setAdding(false); return; }
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4" style={{ color: doneCount === subtasks.length && subtasks.length > 0 ? "var(--success)" : "var(--text-3)" }} />
          <span className="text-[13.5px] font-semibold" style={{ color: c.text1 }}>Podúkoly</span>
          {subtasks.length > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
              style={{ background: "var(--bg-subtle)", color: c.text3 }}>
              {doneCount}/{subtasks.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          className="flex items-center gap-1 text-[12px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: "var(--accent)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Přidat
        </button>
      </div>

      {/* Progress bar — only when there are subtasks */}
      {subtasks.length > 0 && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: c.subtle }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(doneCount / subtasks.length) * 100}%`, background: "var(--success)" }}
          />
        </div>
      )}

      {/* Subtask list */}
      {subtasks.length > 0 && (
        <div className="space-y-1.5">
          {subtasks.map((st) => {
            const isExpanded = expanded === st.id;
            const isActive = activeSubtaskId === st.id;
            const isEditingThisTitle = editingTitle === st.id;
            const assignee = st.assignee ?? members.find((m) => m.id === st.assigneeId);
            const overdue = !st.done && st.dueDate && isOverdue(st.dueDate);
            const dueDateStr = st.dueDate ? new Date(st.dueDate).toISOString().slice(0, 10) : "";

            return (
              <div
                key={st.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: isActive
                    ? "color-mix(in srgb, #22C55E 6%, transparent)"
                    : st.done
                      ? "color-mix(in srgb, var(--success) 4%, var(--bg-subtle))"
                      : c.subtle,
                  border: isActive
                    ? "1px solid rgba(34,197,94,0.35)"
                    : isExpanded
                      ? `1px solid ${c.border}`
                      : `1px solid ${c.border}`,
                }}
              >
                {/* Main row */}
                <div className="flex items-center gap-2.5 group px-3 py-2.5">
                  {/* Done toggle */}
                  <button
                    onClick={() => toggle(st)}
                    className="w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0 transition-all border"
                    style={
                      st.done
                        ? { background: "var(--success)", borderColor: "var(--success)" }
                        : { borderColor: c.border, background: "transparent" }
                    }
                  >
                    {st.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </button>

                  {/* Title — click to edit */}
                  {isEditingThisTitle ? (
                    <input
                      ref={titleInputRef}
                      value={editTitleVal}
                      onChange={(e) => setEditTitleVal(e.target.value)}
                      onBlur={() => commitTitle(st)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); commitTitle(st); }
                        if (e.key === "Escape") setEditingTitle(null);
                      }}
                      className="flex-1 text-[13px] bg-transparent outline-none border-b"
                      style={{ color: c.text1, borderColor: c.border }}
                    />
                  ) : (
                    <span
                      onClick={() => !st.done && startEditTitle(st)}
                      className="flex-1 text-[13px] min-w-0 truncate"
                      style={{
                        color: st.done ? c.text3 : c.text1,
                        textDecoration: st.done ? "line-through" : undefined,
                        cursor: st.done ? "default" : "text",
                      }}
                    >
                      {st.title}
                    </span>
                  )}

                  {/* Due date chip */}
                  {st.dueDate && !isExpanded && (
                    <span className="text-[11px] font-medium flex-shrink-0 flex items-center gap-0.5"
                      style={{ color: overdue ? "var(--danger)" : c.text3 }}>
                      <Calendar className="w-3 h-3" />
                      {formatDate(st.dueDate)}
                    </span>
                  )}

                  {/* Assignee avatar */}
                  {assignee && (
                    <Avatar name={assignee.name} src={assignee.avatar} size="sm" className="flex-shrink-0" />
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    {onActivateSubtask && (
                      <button
                        onClick={() => onActivateSubtask(isActive ? null : st.id)}
                        className="p-1 rounded-md transition-all"
                        title={isActive ? "Zastavit" : "Sledovat čas"}
                        style={{ color: isActive ? "var(--success)" : c.text3 }}
                      >
                        <Play className={`w-3 h-3${isActive ? " fill-current" : ""}`} />
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : st.id)}
                      className="p-1 rounded-md transition-all"
                      style={{ color: c.text3 }}
                      title="Detaily"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => remove(st.id)}
                      className="p-1 rounded-md transition-all hover:text-red-500"
                      style={{ color: c.text3 }}
                      title="Smazat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 space-y-2.5 border-t" style={{ borderColor: c.border }}>
                    <div className="pt-2.5">
                      <textarea
                        defaultValue={st.description ?? ""}
                        onBlur={(e) => updateField(st, "description", e.target.value)}
                        placeholder="Popis podúkolu..."
                        rows={2}
                        className="w-full text-[13px] rounded-lg px-3 py-2 resize-none outline-none transition-all focus:ring-1 focus:ring-[var(--accent)]"
                        style={{ background: c.inputBg, color: c.text1, border: `1px solid ${c.border}` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Due date */}
                      <div>
                        <label className="text-[10.5px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: c.text3 }}>
                          Termín
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="date"
                            defaultValue={dueDateStr}
                            onBlur={(e) => updateField(st, "dueDate", e.target.value)}
                            className="w-full text-[12.5px] rounded-lg px-2.5 py-1.5 outline-none pr-7"
                            style={{ background: c.inputBg, color: c.text1, border: `1px solid ${c.border}` }}
                          />
                          {st.dueDate && (
                            <button
                              type="button"
                              onClick={() => updateField(st, "dueDate", "")}
                              className="absolute right-1.5 p-0.5 rounded transition-colors hover:text-red-500"
                              style={{ color: c.text3 }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Estimated time */}
                      <div>
                        <label className="text-[10.5px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: c.text3 }}>
                          Odh. čas (h)
                        </label>
                        <input
                          type="number"
                          defaultValue={minutesToHours(st.estimatedMinutes)}
                          onBlur={(e) => updateField(st, "estimatedMinutes", e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.5"
                          className="w-full text-[12.5px] rounded-lg px-2.5 py-1.5 outline-none"
                          style={{ background: c.inputBg, color: c.text1, border: `1px solid ${c.border}` }}
                        />
                      </div>

                      {/* Hourly rate */}
                      <div>
                        <label className="text-[10.5px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: c.text3 }}>
                          Sazba (Kč/h)
                        </label>
                        <input
                          type="number"
                          defaultValue={st.hourlyRate ?? ""}
                          onBlur={(e) => updateField(st, "hourlyRate", e.target.value)}
                          placeholder="Výchozí"
                          min="0"
                          step="10"
                          className="w-full text-[12.5px] rounded-lg px-2.5 py-1.5 outline-none"
                          style={{ background: c.inputBg, color: c.text1, border: `1px solid ${c.border}` }}
                        />
                      </div>

                      {/* Assignee */}
                      {members.length > 0 && (
                        <div>
                          <label className="text-[10.5px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: c.text3 }}>
                            Přiřadit
                          </label>
                          <div className="relative">
                            <button
                              onClick={() => setAssigneeOpen(assigneeOpen === st.id ? null : st.id)}
                              className="w-full flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 rounded-lg transition-all text-left"
                              style={{ background: c.inputBg, color: assignee ? c.text1 : c.text3, border: `1px solid ${c.border}` }}
                            >
                              {assignee
                                ? <><Avatar name={assignee.name} src={assignee.avatar} size="sm" /><span className="truncate">{assignee.name}</span></>
                                : <><User className="w-3.5 h-3.5" /><span>Nikdo</span></>
                              }
                              <ChevronDown className="w-3 h-3 ml-auto flex-shrink-0" />
                            </button>
                            {assigneeOpen === st.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setAssigneeOpen(null)} />
                                <div className="absolute top-full left-0 mt-1 w-48 rounded-xl overflow-hidden z-50"
                                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                                  {assignee && (
                                    <button
                                      onClick={() => updateAssignee(st, null)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] transition-colors hover:bg-[var(--hover)]"
                                      style={{ color: "var(--text-3)" }}
                                    >
                                      <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--bg-subtle)" }}>
                                        <User className="w-3 h-3" />
                                      </span>
                                      Odebrat přiřazení
                                    </button>
                                  )}
                                  {members.map((m) => (
                                    <button
                                      key={m.id}
                                      onClick={() => updateAssignee(st, m.id)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] transition-colors hover:bg-[var(--hover)]"
                                      style={{ color: "var(--text-1)" }}
                                    >
                                      <Avatar name={m.name} src={m.avatar} size="sm" />
                                      <span className="truncate">{m.name}</span>
                                      {st.assigneeId === m.id && <Check className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: "var(--accent)" }} />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <form onSubmit={add} className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: c.subtle, border: `1px solid ${c.border}` }}>
          <Plus className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.text3 }} />
          <input
            ref={newInputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Název podúkolu..."
            onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setNewTitle(""); } }}
            className="flex-1 text-[13px] bg-transparent outline-none"
            style={{ color: c.text1 }}
          />
          <button type="submit" className="text-[12px] font-semibold px-2 py-1 rounded-lg transition-colors"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            Přidat
          </button>
          <button type="button" onClick={() => { setAdding(false); setNewTitle(""); }}
            className="p-1 rounded-md transition-colors hover:text-red-500"
            style={{ color: c.text3 }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        subtasks.length === 0 && (
          <p className="text-[12.5px]" style={{ color: c.text3 }}>Žádné podúkoly</p>
        )
      )}
    </div>
  );
}
