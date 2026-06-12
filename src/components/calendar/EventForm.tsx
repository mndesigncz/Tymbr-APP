"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { MapPin, Lock, Users, Trash2 } from "lucide-react";
import type { CalendarEvent } from "@/types";

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

export function EventForm({ event, defaultDate, canUseTeam, onSaved, onDeleted, onClose }: EventFormProps) {
  const today = defaultDate || new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState(event?.title || "");
  const [date, setDate] = useState(event ? toDateInput(event.startAt) : today);
  const [endDate, setEndDate] = useState(event ? toDateInput(event.endAt) : today);
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startTime, setStartTime] = useState(event && !event.allDay ? toTimeInput(event.startAt) : "09:00");
  const [endTime, setEndTime] = useState(event && !event.allDay ? toTimeInput(event.endAt) : "10:00");
  const [location, setLocation] = useState(event?.location || "");
  const [description, setDescription] = useState(event?.description || "");
  const [color, setColor] = useState(event?.color || EVENT_COLORS[0]);
  const [visibility, setVisibility] = useState<"personal" | "team">(
    event?.visibility || (canUseTeam ? "team" : "personal")
  );

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

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

      {error && <p className="text-sm text-red-500 px-1">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {event && onDeleted && (
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="p-2.5 rounded-xl transition-colors hover:bg-red-50 disabled:opacity-50"
            style={{ color: "#ef4444" }} title="Smazat událost">
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
