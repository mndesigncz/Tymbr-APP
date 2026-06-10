"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { cs } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, MapPin, Lock, Users,
  CheckSquare, CalendarDays,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EventForm } from "./EventForm";
import type { CalendarEvent, Task } from "@/types";

type Scope = "all" | "personal" | "team";

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const TASK_COLOR = "#9a9aa2";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CalendarView({ canUseTeam }: { canUseTeam: boolean }) {
  const [current, setCurrent] = useState(() => new Date());
  const [scope, setScope] = useState<Scope>(canUseTeam ? "all" : "personal");
  const [showTasks, setShowTasks] = useState(true);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Visible 6-week grid range
  const gridStart = useMemo(() => startOfWeek(startOfMonth(current), { weekStartsOn: 1 }), [current]);
  const gridEnd = useMemo(() => endOfWeek(endOfMonth(current), { weekStartsOn: 1 }), [current]);
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        from: gridStart.toISOString(),
        to: gridEnd.toISOString(),
        scope,
      });
      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    }
  }, [gridStart, gridEnd, scope]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Tasks fetched once; filtered client-side by dueDate
  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => setTasks(Array.isArray(data) ? data.filter((t: Task) => t.dueDate) : []))
      .catch(() => setTasks([]));
  }, []);

  // ── Items per day ──
  const eventsForDay = useCallback((day: Date) =>
    events.filter((e) => {
      const s = new Date(e.startAt);
      const en = new Date(e.endAt);
      return s <= endOfDay(day) && en >= startOfDay(day);
    }), [events]);

  const tasksForDay = useCallback((day: Date) =>
    showTasks ? tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day)) : [],
    [tasks, showTasks]);

  const openNew = (day: Date) => {
    setSelectedDay(day);
    setEditingEvent(null);
    setModalOpen(true);
  };
  const openEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setModalOpen(true);
  };

  const handleSaved = (saved: CalendarEvent) => {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
    });
    setModalOpen(false);
    setEditingEvent(null);
    fetchEvents();
  };
  const handleDeleted = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setModalOpen(false);
    setEditingEvent(null);
  };

  const segStyle = (on: boolean) =>
    on
      ? { background: "var(--btn-invert-bg)", color: "var(--btn-invert-text)" }
      : { color: "var(--text-2)" };

  const selectedEvents = eventsForDay(selectedDay);
  const selectedTasks = tasksForDay(selectedDay);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent((c) => subMonths(c, 1))}
            className="p-2 rounded-xl border transition-colors hover:bg-black/[0.03]"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-[17px] font-bold tracking-tight min-w-[150px] text-center" style={{ color: "var(--text-1)" }}>
            {cap(format(current, "LLLL yyyy", { locale: cs }))}
          </h2>
          <button onClick={() => setCurrent((c) => addMonths(c, 1))}
            className="p-2 rounded-xl border transition-colors hover:bg-black/[0.03]"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => { const t = new Date(); setCurrent(t); setSelectedDay(t); }}
            className="ml-1 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-colors hover:bg-black/[0.03]"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}>
            Dnes
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
            {([["all", "Vše"], ["personal", "Osobní"], ["team", "Týmové"]] as [Scope, string][])
              .filter(([s]) => s !== "team" || canUseTeam)
              .map(([s, label]) => (
                <button key={s} onClick={() => setScope(s)}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all"
                  style={segStyle(scope === s)}>
                  {label}
                </button>
              ))}
          </div>
          {/* Task layer toggle */}
          <button onClick={() => setShowTasks((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12.5px] font-semibold transition-all"
            style={showTasks
              ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }
              : { background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
            <CheckSquare className="w-3.5 h-3.5" />
            Úkoly
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-3xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border)" }}>
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2.5 text-center text-[11.5px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-3)" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = isSameMonth(day, current);
            const today = isToday(day);
            const selected = isSameDay(day, selectedDay);
            const dayEvents = eventsForDay(day);
            const dayTasks = tasksForDay(day);
            const items = [
              ...dayEvents.map((e) => ({ id: "e" + e.id, color: e.color || "var(--accent)", label: e.title })),
              ...dayTasks.map((t) => ({ id: "t" + t.id, color: t.category?.color || TASK_COLOR, label: t.title })),
            ];
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                onDoubleClick={() => openNew(day)}
                className="min-h-[78px] sm:min-h-[100px] p-1.5 text-left border-b border-r transition-colors hover:bg-black/[0.015] flex flex-col gap-1"
                style={{
                  borderColor: "var(--border)",
                  background: selected ? "color-mix(in srgb, var(--accent) 7%, transparent)" : "transparent",
                  opacity: inMonth ? 1 : 0.4,
                }}
              >
                <span
                  className="w-6 h-6 flex items-center justify-center rounded-full text-[12.5px] font-semibold flex-shrink-0"
                  style={today
                    ? { background: "var(--accent)", color: "#fff" }
                    : { color: "var(--text-1)" }}
                >
                  {format(day, "d")}
                </span>

                {/* Desktop: text chips */}
                <div className="hidden sm:flex flex-col gap-0.5 min-w-0">
                  {items.slice(0, 3).map((it) => (
                    <span key={it.id}
                      className="text-[10.5px] leading-tight font-medium truncate rounded px-1 py-0.5"
                      style={{ background: `color-mix(in srgb, ${it.color} 16%, transparent)`, color: "var(--text-1)" }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: it.color }} />
                      {it.label}
                    </span>
                  ))}
                  {items.length > 3 && (
                    <span className="text-[10px] font-semibold px-1" style={{ color: "var(--text-3)" }}>
                      +{items.length - 3} další
                    </span>
                  )}
                </div>

                {/* Mobile: dots */}
                <div className="sm:hidden flex items-center gap-0.5 flex-wrap">
                  {items.slice(0, 4).map((it) => (
                    <span key={it.id} className="w-1.5 h-1.5 rounded-full" style={{ background: it.color }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="rounded-3xl border p-4 sm:p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-[15px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
            {cap(format(selectedDay, "EEEE d. MMMM", { locale: cs }))}
          </h3>
          <button onClick={() => openNew(selectedDay)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90"
            style={{ background: "var(--accent)", color: "#fff" }}>
            <Plus className="w-4 h-4" />
            Událost
          </button>
        </div>

        {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
          <div className="py-8 text-center">
            <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-3)", opacity: 0.5 }} />
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Žádné události ani úkoly</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((ev) => (
              <button key={ev.id} onClick={() => openEdit(ev)}
                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-2xl border text-left transition-colors hover:bg-black/[0.02]"
                style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
                <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: ev.color || "var(--accent)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{ev.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
                      {ev.allDay
                        ? "Celý den"
                        : `${format(new Date(ev.startAt), "HH:mm")} – ${format(new Date(ev.endAt), "HH:mm")}`}
                    </span>
                    {ev.location && (
                      <span className="text-[12px] flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                        <MapPin className="w-3 h-3" /> {ev.location}
                      </span>
                    )}
                    <span className="text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium"
                      style={{ background: "var(--bg-card)", color: "var(--text-3)" }}>
                      {ev.visibility === "team" ? <><Users className="w-2.5 h-2.5" /> Tým</> : <><Lock className="w-2.5 h-2.5" /> Osobní</>}
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {selectedTasks.map((t) => (
              <Link key={t.id} href={`/tasks/${t.id}`}
                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-2xl border text-left transition-colors hover:bg-black/[0.02]"
                style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
                <CheckSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: t.category?.color || TASK_COLOR }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{t.title}</p>
                  <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
                    Termín úkolu{t.category ? ` · ${t.category.name}` : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingEvent(null); }}
        title={editingEvent ? "Upravit událost" : "Nová událost"}>
        <EventForm
          event={editingEvent ?? undefined}
          defaultDate={selectedDay.toISOString().slice(0, 10)}
          canUseTeam={canUseTeam}
          onSaved={handleSaved}
          onDeleted={editingEvent ? handleDeleted : undefined}
          onClose={() => { setModalOpen(false); setEditingEvent(null); }}
        />
      </Modal>
    </div>
  );
}

// Local helpers (avoid importing startOfDay/endOfDay to keep bundle lean — trivial inline)
function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function endOfDay(d: Date) {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x;
}
