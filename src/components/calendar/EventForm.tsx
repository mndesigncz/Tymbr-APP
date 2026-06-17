"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { MapPin, Lock, Users, Trash2, Check, Share2 } from "lucide-react";
import type { CalendarEvent, Task, User } from "@/types";
import { ShareSheet } from "@/components/share/ShareSheet";

export const EVENT_COLORS = [
  "#f7592f", // orange (accent)
  "#3b82f6", // blue
  "#22c55e", // green
  "#a855f7", // purple
  "#ef4444", // red
  "#eab308", // amber
  "#14b8a6", // teal
  "#ec4899", // pink
];

interface EventFormProps {
  event?: CalendarEvent;
  defaultDate?: string; // yyyy-mm-dd to prefill for new events
  /** Pre-fill a NEW event (e.g. when creating from a note). Ignored when editing. */
  initialValues?: { title?: string; description?: string };
  canUseTeam: boolean;
  onSaved: (event: CalendarEvent) => void;
  onDeleted?: (id: string) => void;
  onClose: () => void;
}

function toDateInput(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}
function toTimeInput(d: Date | string): string {
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

export function EventForm({ event, defaultDate, initialValues, canUseTeam, onSaved, onDeleted, onClose }: EventFormProps) {
  const today = defaultDate || new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState(event?.title || initialValues?.title || "");
  const [date, setDate] = useState(event ? toDateInput(event.startAt) : today);
  const [endDate, setEndDate] = useState(event ? toDateInput(event.endAt) : today);
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startTime, setStartTime] = useState(event && !event.allDay ? toTimeInput(event.startAt) : "09:00");
  const [endTime, setEndTime] = useState(event && !event.allDay ? toTimeInput(event.endAt) : "10:00");
  const [location, setLocation] = useState(event?.location || "");
  const [description, setDescription] = useState(event?.description || initialValues?.description || "");
  const [color, setColor] = useState(event?.color || EVENT_COLORS[0]);
  const [visibility, setVisibility] = useState<"personal" | "team">(
    event?.visibility || (canUseTeam ? "team" : "personal")
  );
  const [taskId, setTaskId] = useState(event?.taskId || "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(event?.assignees?.map((a) => a.id) ?? []);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    fetch("/api/tasks").then((r) => r.json()).then((d) => Array.isArray(d) && setTasks(d)).catch(() => {});
    fetch("/api/users").then((r) => r.json()).then((d) => Array.isArray(d) && setMembers(d)).catch(() => {});
  }, []);

  const toggleAssignee = (id: string) =>
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filteredMembers = assigneeSearch.trim()
    ? members.filter((m) =>
        m.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(assigneeSearch.toLowerCase()))
    : members;
  const selectedCount = assigneeIds.length;

  const buildPayload = () => {
    const startAt = allDay
      ? new Date(`${date}T00:00`).toISOString()
      : new Date(`${date}T${startTime || "00:00"}`).toISOString();
    const endBase = allDay ? endDate || date : date;
    const endAt = allDay
      ? new Date(`${endBase}T23:59`).toISOString()
      : new Date(`${date}T${endTime || startTime || "00:00"}`).toISOString();
    return {
      title: title.trim(),
      description: description || null,
      startAt,
      endAt,
      allDay,
      location: location || null,
      color,
      visibility,
      taskId: taskId || null,
      assigneeIds,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Název je povinný"); return; }
    setLoading(true);
    setError("");
    try {
      const url = event ? `/api/events/${event.id}` : "/api/events";
      const method = event ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Něco se pokazilo");
        return;
      }
      const saved: CalendarEvent = await res.json();
      onSaved(saved);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (res.ok) onDeleted?.(event.id);
    } finally {
      setDeleting(false);
    }
  };

  const segStyle = (on: boolean) =>
    on
      ? { background: "var(--btn-invert-bg)", color: "var(--btn-invert-text)" }
      : { color: "var(--text-2)" };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Název události"
        className="text-[15px] font-semibold"
      />

      {/* Visibility toggle — personal vs team */}
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>
          Viditelnost
        </label>
        <div className="flex items-center gap-1 p-1 rounded-xl border"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}>
          <button type="button" onClick={() => setVisibility("personal")}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={segStyle(visibility === "personal")}>
            <Lock className="w-3.5 h-3.5" />
            Osobní
          </button>
          <button type="button"
            onClick={() => canUseTeam && setVisibility("team")}
            disabled={!canUseTeam}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40"
            style={segStyle(visibility === "team")}>
            <Users className="w-3.5 h-3.5" />
            Týmová
          </button>
        </div>
        <p className="text-[11.5px] mt-1.5 px-1" style={{ color: "var(--text-3)" }}>
          {visibility === "team"
            ? "Uvidí celý tým v kalendáři."
            : "Uvidíš jen ty."}
        </p>
      </div>

      {/* All-day toggle */}
      <label className="flex items-center justify-between cursor-pointer px-1">
        <span className="text-[14px] font-medium" style={{ color: "var(--text-1)" }}>Celý den</span>
        <button type="button" onClick={() => setAllDay((v) => !v)}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{ background: allDay ? "var(--accent)" : "var(--border-md)" }}>
          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
            style={{ transform: allDay ? "translateX(20px)" : "none", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
      </label>

      {/* Date & time */}
      {allDay ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>Od</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>Do</label>
            <Input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>Datum</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>Začátek</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>Konec</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Color */}
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>Barva</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: color === c ? `3px solid ${c}` : undefined,
                outlineOffset: "2px",
              }} />
          ))}
        </div>
      </div>

      {/* Linked task */}
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>
          Propojený úkol
        </label>
        <Select
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          placeholder="Žádný úkol"
          options={tasks.map((t) => ({ value: t.id, label: t.title }))}
        />
        <p className="text-[11.5px] mt-1.5 px-1" style={{ color: "var(--text-3)" }}>
          Provázat událost s úkolem — usnadní přechod mezi kalendářem a úkoly.
        </p>
      </div>

      {/* Participants */}
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>
          Účastníci{selectedCount > 0 && <span style={{ color: "var(--accent)" }}> · {selectedCount}</span>}
        </label>
        {members.length > 0 ? (
          <div className="rounded-xl border p-2 space-y-2" style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}>
            <input
              type="text"
              value={assigneeSearch}
              onChange={(e) => setAssigneeSearch(e.target.value)}
              placeholder="Hledat člena týmu..."
              className="w-full text-[13px] rounded-lg px-3 py-2 outline-none border"
              style={{ background: "var(--bg-card)", color: "var(--text-1)", borderColor: "var(--border-md)" }}
            />
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <p className="text-[12.5px] text-center py-3" style={{ color: "var(--text-3)" }}>Nikdo nenalezen</p>
              ) : (
                filteredMembers.map((u) => {
                  const selected = assigneeIds.includes(u.id);
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

      {/* Location */}
      <Input
        icon={<MapPin className="w-4 h-4" />}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Místo (nepovinné)"
      />

      {/* Description */}
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Poznámka (nepovinné)"
        rows={3}
      />

      {/* Share — existing events only */}
      {event && (
        <div className="rounded-xl border" style={{ borderColor: "var(--border-md)", background: "var(--bg-subtle)" }}>
          <button
            type="button"
            onClick={() => setShowShare((s) => !s)}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors hover:bg-[var(--hover)] rounded-xl"
            style={{ color: "var(--text-1)" }}
          >
            <Share2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
            Sdílet událost
          </button>
          {showShare && (
            <div className="px-3.5 pb-3.5">
              <ShareSheet
                resourceType="event"
                resourceId={event.id}
                chatMessage={`📅 **${title || event.title}**`}
              />
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm px-1" style={{ color: "var(--danger)" }}>{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {event && onDeleted && (
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="p-2.5 rounded-xl transition-colors hover:bg-[var(--danger-soft)] disabled:opacity-50"
            style={{ color: "var(--danger)" }} title="Smazat událost" aria-label="Smazat událost">
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        )}
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Zrušit
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {event ? "Uložit" : "Vytvořit"}
        </Button>
      </div>
    </form>
  );
}
