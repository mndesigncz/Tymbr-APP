"use client";

import { useState, useEffect, useRef } from "react";
import {
  Check, Plus, Trash2, Play, User, Calendar, X, ListChecks,
  Clock, DollarSign, Pencil,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { minutesToHours, hoursToMinutes } from "@/lib/pricing";
import { formatDate, isOverdue } from "@/lib/utils";
import type { SubTask } from "@/types";

interface Member { id: string; name: string; avatar?: string | null }

interface SubtasksProps {
  taskId: string;
  dark?: boolean;
  onChange?: (subtasks: SubTask[]) => void;
  activeSubtaskId?: string | null;
  onActivateSubtask?: (id: string | null) => void;
  members?: Member[];
}

/** Inline editable field — shows value as chip, becomes input on click */
function EditableField({
  value, placeholder, type = "text", onSave, children,
}: {
  value?: string;
  placeholder: string;
  type?: string;
  onSave: (v: string) => void;
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { setEditing(false); onSave(val); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); setEditing(false); onSave(val); }
          if (e.key === "Escape") { setEditing(false); setVal(value ?? ""); }
        }}
        className="text-[12px] rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--accent)] w-28"
        style={{ background: "var(--bg-card)", color: "var(--text-1)", border: "1px solid var(--accent)" }}
      />
    );
  }
  return (
    <button
      onClick={() => { setVal(value ?? ""); setEditing(true); }}
      className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg transition-all hover:bg-[var(--hover)]"
      style={{ color: "var(--text-2)", background: "var(--bg-subtle)", border: "1px solid var(--border-md)" }}
    >
      {children}
      {placeholder}
    </button>
  );
}

export function Subtasks({
  taskId, dark, onChange, activeSubtaskId, onActivateSubtask, members = [],
}: SubtasksProps) {
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleVal, setEditTitleVal] = useState("");
  const [assigneeOpenId, setAssigneeOpenId] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const c = {
    text1: dark ? "#f5f5f7" : "var(--text-1)",
    text2: dark ? "#c0c0c8" : "var(--text-2)",
    text3: dark ? "#8a8a92" : "var(--text-3)",
    subtle: dark ? "rgba(255,255,255,0.06)" : "var(--bg-subtle)",
    border: dark ? "rgba(255,255,255,0.1)" : "var(--border)",
    borderMd: dark ? "rgba(255,255,255,0.15)" : "var(--border-md)",
    card: dark ? "rgba(255,255,255,0.04)" : "var(--bg-card)",
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
  useEffect(() => { if (editingTitleId) titleInputRef.current?.focus(); }, [editingTitleId]);
  useEffect(() => { if (adding) newInputRef.current?.focus(); }, [adding]);

  const patch = async (id: string, data: Record<string, unknown>) => {
    await fetch(`/api/subtasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  };

  const toggle = async (st: SubTask) => {
    const next = !st.done;
    setSubtasks((prev) => prev.map((s) => s.id === st.id ? { ...s, done: next } : s));
    await patch(st.id, { done: next });
  };

  const commitTitle = async (st: SubTask) => {
    const val = editTitleVal.trim();
    setEditingTitleId(null);
    if (val && val !== st.title) await patch(st.id, { title: val });
    else load();
  };

  const remove = async (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/subtasks/${id}`, { method: "DELETE" });
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

  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks
            className="w-4 h-4"
            style={{ color: subtasks.length > 0 && doneCount === subtasks.length ? "var(--success)" : "var(--text-3)" }}
          />
          <span className="text-[13.5px] font-semibold" style={{ color: c.text1 }}>Podúkoly</span>
          {subtasks.length > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
              style={{ background: c.subtle, color: c.text3 }}>
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

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: c.subtle }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(doneCount / subtasks.length) * 100}%`, background: "var(--success)" }} />
        </div>
      )}

      {/* Subtask mini-cards */}
      {subtasks.length > 0 && (
        <div className="space-y-2">
          {subtasks.map((st) => {
            const isActive = activeSubtaskId === st.id;
            const assignee = st.assignee ?? members.find((m) => m.id === st.assigneeId);
            const overdue = !st.done && st.dueDate && isOverdue(st.dueDate);
            const isEditingTitle = editingTitleId === st.id;
            const hasExtras = !!(st.description || st.dueDate || st.estimatedMinutes || st.hourlyRate || assignee);

            return (
              <div
                key={st.id}
                className="rounded-2xl border group transition-all"
                style={{
                  background: isActive
                    ? "color-mix(in srgb, var(--success) 5%, var(--bg-card))"
                    : st.done
                      ? "color-mix(in srgb, var(--success) 3%, var(--bg-card))"
                      : c.card,
                  borderColor: isActive
                    ? "color-mix(in srgb, var(--success) 30%, transparent)"
                    : c.border,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Title row */}
                <div className="flex items-start gap-2.5 px-4 py-3.5">
                  {/* Done toggle */}
                  <button
                    onClick={() => toggle(st)}
                    className="w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all border"
                    style={
                      st.done
                        ? { background: "var(--success)", borderColor: "var(--success)" }
                        : { borderColor: c.borderMd, background: "transparent" }
                    }
                  >
                    {st.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </button>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    {isEditingTitle ? (
                      <input
                        ref={titleInputRef}
                        value={editTitleVal}
                        onChange={(e) => setEditTitleVal(e.target.value)}
                        onBlur={() => commitTitle(st)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); commitTitle(st); }
                          if (e.key === "Escape") { setEditingTitleId(null); load(); }
                        }}
                        className="w-full text-[13.5px] font-semibold bg-transparent outline-none border-b"
                        style={{ color: c.text1, borderColor: "var(--accent)" }}
                      />
                    ) : (
                      <p
                        onClick={() => { if (!st.done) { setEditingTitleId(st.id); setEditTitleVal(st.title); } }}
                        className="text-[13.5px] font-semibold leading-snug"
                        style={{
                          color: st.done ? c.text3 : c.text1,
                          textDecoration: st.done ? "line-through" : undefined,
                          cursor: st.done ? "default" : "text",
                        }}
                      >
                        {st.title}
                      </p>
                    )}

                    {/* Description — only if exists */}
                    {st.description && (
                      <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: c.text3 }}>
                        {st.description}
                      </p>
                    )}

                    {/* Chips row — only show fields that have data */}
                    {hasExtras && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {st.dueDate && (
                          <span
                            className="flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-lg"
                            style={{
                              color: overdue ? "var(--danger)" : c.text3,
                              background: overdue ? "var(--danger-soft)" : c.subtle,
                            }}
                          >
                            <Calendar className="w-3 h-3" />
                            {formatDate(st.dueDate)}
                          </span>
                        )}
                        {st.estimatedMinutes != null && st.estimatedMinutes > 0 && (
                          <span className="flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-lg"
                            style={{ color: c.text3, background: c.subtle }}>
                            <Clock className="w-3 h-3" />
                            {minutesToHours(st.estimatedMinutes)} h
                          </span>
                        )}
                        {st.hourlyRate != null && st.hourlyRate > 0 && (
                          <span className="flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-lg"
                            style={{ color: c.text3, background: c.subtle }}>
                            <DollarSign className="w-3 h-3" />
                            {st.hourlyRate} Kč/h
                          </span>
                        )}
                        {assignee && (
                          <div className="flex items-center gap-1">
                            <Avatar name={assignee.name} src={assignee.avatar} size="sm" />
                            <span className="text-[11.5px]" style={{ color: c.text3 }}>{assignee.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {onActivateSubtask && (
                      <button
                        onClick={() => onActivateSubtask(isActive ? null : st.id)}
                        className="p-1.5 rounded-lg transition-all"
                        title={isActive ? "Zastavit" : "Sledovat čas"}
                        style={{ color: isActive ? "var(--success)" : c.text3 }}
                      >
                        <Play className={`w-3.5 h-3.5${isActive ? " fill-current" : ""}`} />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingFieldId(editingFieldId === st.id ? null : st.id)}
                      className="p-1.5 rounded-lg transition-all hover:bg-[var(--hover)]"
                      title="Upravit detaily"
                      style={{ color: c.text3 }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(st.id)}
                      className="p-1.5 rounded-lg transition-all hover:bg-[var(--danger-soft)] hover:text-red-500"
                      title="Smazat"
                      style={{ color: c.text3 }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Edit panel — opens when clicking pencil icon */}
                {editingFieldId === st.id && (
                  <div className="border-t px-4 pb-3.5 pt-3 space-y-2.5" style={{ borderColor: c.border }}>
                    {/* Description */}
                    <textarea
                      key={`desc-${st.id}`}
                      defaultValue={st.description ?? ""}
                      onBlur={(e) => patch(st.id, { description: e.target.value || null })}
                      placeholder="Popis podúkolu..."
                      rows={2}
                      className="w-full text-[13px] rounded-xl px-3 py-2 resize-none outline-none transition-all focus:ring-1 focus:ring-[var(--accent)]"
                      style={{ background: c.inputBg, color: c.text1, border: `1px solid ${c.borderMd}` }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {/* Due date */}
                      <div>
                        <label className="text-[10.5px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: c.text3 }}>Termín</label>
                        <div className="relative flex items-center">
                          <input
                            type="date"
                            key={`date-${st.id}`}
                            defaultValue={st.dueDate ? new Date(st.dueDate).toISOString().slice(0, 10) : ""}
                            onBlur={(e) => patch(st.id, { dueDate: e.target.value || null })}
                            className="w-full text-[12.5px] rounded-xl px-2.5 py-1.5 outline-none pr-7"
                            style={{ background: c.inputBg, color: c.text1, border: `1px solid ${c.borderMd}` }}
                          />
                          {st.dueDate && (
                            <button type="button" onClick={() => patch(st.id, { dueDate: null })}
                              className="absolute right-1.5 p-0.5 rounded" style={{ color: c.text3 }}>
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Estimated time */}
                      <div>
                        <label className="text-[10.5px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: c.text3 }}>Odh. čas (h)</label>
                        <input type="number" key={`est-${st.id}`}
                          defaultValue={minutesToHours(st.estimatedMinutes)}
                          onBlur={(e) => patch(st.id, { estimatedMinutes: hoursToMinutes(e.target.value) })}
                          placeholder="—" min="0" step="0.5"
                          className="w-full text-[12.5px] rounded-xl px-2.5 py-1.5 outline-none"
                          style={{ background: c.inputBg, color: c.text1, border: `1px solid ${c.borderMd}` }} />
                      </div>
                      {/* Hourly rate */}
                      <div>
                        <label className="text-[10.5px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: c.text3 }}>Sazba (Kč/h)</label>
                        <input type="number" key={`rate-${st.id}`}
                          defaultValue={st.hourlyRate ?? ""}
                          onBlur={(e) => patch(st.id, { hourlyRate: e.target.value ? Number(e.target.value) : null })}
                          placeholder="Výchozí" min="0" step="10"
                          className="w-full text-[12.5px] rounded-xl px-2.5 py-1.5 outline-none"
                          style={{ background: c.inputBg, color: c.text1, border: `1px solid ${c.borderMd}` }} />
                      </div>
                      {/* Assignee */}
                      {members.length > 0 && (
                        <div>
                          <label className="text-[10.5px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: c.text3 }}>Přiřadit</label>
                          <div className="relative">
                            <button
                              onClick={() => setAssigneeOpenId(assigneeOpenId === st.id ? null : st.id)}
                              className="w-full flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 rounded-xl text-left"
                              style={{ background: c.inputBg, color: assignee ? c.text1 : c.text3, border: `1px solid ${c.borderMd}` }}
                            >
                              {assignee
                                ? <><Avatar name={assignee.name} src={assignee.avatar} size="sm" /><span className="truncate">{assignee.name}</span></>
                                : <><User className="w-3.5 h-3.5" /><span>Nikdo</span></>}
                            </button>
                            {assigneeOpenId === st.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setAssigneeOpenId(null)} />
                                <div className="absolute top-full left-0 mt-1 w-48 rounded-xl overflow-hidden z-50"
                                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                                  {assignee && (
                                    <button onClick={() => { setAssigneeOpenId(null); patch(st.id, { assigneeId: null }); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-[var(--hover)]"
                                      style={{ color: "var(--text-3)" }}>
                                      <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--bg-subtle)" }}>
                                        <User className="w-3 h-3" />
                                      </span>
                                      Odebrat přiřazení
                                    </button>
                                  )}
                                  {members.map((m) => (
                                    <button key={m.id} onClick={() => { setAssigneeOpenId(null); patch(st.id, { assigneeId: m.id }); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] hover:bg-[var(--hover)]"
                                      style={{ color: "var(--text-1)" }}>
                                      <Avatar name={m.name} src={m.avatar} size="sm" />
                                      <span className="truncate">{m.name}</span>
                                      {st.assigneeId === m.id && <Check className="w-3 h-3 ml-auto" style={{ color: "var(--accent)" }} />}
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
        <form onSubmit={add}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: c.subtle, border: `1px solid ${c.borderMd}` }}>
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
          <button type="submit" className="text-[12px] font-semibold px-2 py-1 rounded-lg"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            Přidat
          </button>
          <button type="button" onClick={() => { setAdding(false); setNewTitle(""); }}
            className="p-1 rounded-md hover:text-red-500" style={{ color: c.text3 }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : subtasks.length === 0 && (
        <p className="text-[12.5px]" style={{ color: c.text3 }}>Žádné podúkoly</p>
      )}
    </div>
  );
}
