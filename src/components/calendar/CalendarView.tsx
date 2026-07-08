"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfDay, endOfDay, addDays, addMonths, subMonths,
  isSameDay, isToday, isWithinInterval,
} from "date-fns";
import { cs } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, Clock,
  CheckSquare, Calendar as CalendarIcon, Lock, Users, MapPin, RefreshCw, Palmtree, X,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { EventForm } from "./EventForm";
import { CalendarTimeGrid } from "./CalendarTimeGrid";
import { isOverdue } from "@/lib/utils";
import type { CalendarEvent, Task, Vacation } from "@/types";

type Scope = "all" | "personal" | "team";
type RangeMode = "day" | "week" | "month" | "custom";

const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const STATUS_COLORS: Record<string, string> = {
  todo: "#6B7280", in_progress: "#3B82F6", review: "#EAB308", done: "#22C55E",
};
const STATUS_LABELS: Record<string, string> = {
  todo: "K provedení", in_progress: "Probíhá", review: "Ke kontrole", done: "Hotovo",
};

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function taskColor(t: Task) {
  if (t.status !== "done" && isOverdue(t.dueDate)) return "var(--danger)";
  return STATUS_COLORS[t.status] ?? "#6B7280";
}

// Unified item shape for grid + agenda
const VACATION_COLOR = "#0EA5E9";
const VACATION_LABELS: Record<string, string> = { vacation: "Dovolená", sick: "Nemoc", personal: "Volno" };

type DayItem =
  | { kind: "event"; date: Date; color: string; data: CalendarEvent }
  | { kind: "task"; date: Date; color: string; data: Task }
  | { kind: "vacation"; date: Date; color: string; data: Vacation };

function itemTitle(it: DayItem): string {
  if (it.kind === "vacation") return `${it.data.user?.name ?? "Člen"} · ${VACATION_LABELS[it.data.type] ?? "Dovolená"}`;
  return it.data.title;
}

export function CalendarView({ canUseTeam }: { canUseTeam: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [current, setCurrent] = useState(() => new Date());
  const [scope, setScope] = useState<Scope>(canUseTeam ? "all" : "personal");
  const [showTasks, setShowTasks] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  const [rangeMode, setRangeMode] = useState<RangeMode>("day");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [customFrom, setCustomFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);

  // Google Calendar (read-only mirror)
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [gcal, setGcal] = useState<{ configured: boolean; connected: boolean; email: string | null } | null>(null);
  const [showGoogle, setShowGoogle] = useState(true);
  const [gcalMsg, setGcalMsg] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  // When creating from a clicked time slot, remember the exact start moment.
  const [slotStart, setSlotStart] = useState<Date | null>(null);

  const isTimeGrid = rangeMode === "day" || rangeMode === "week";

  // 6-week grid starting Monday
  const gridStart = useMemo(() => startOfWeek(startOfMonth(current), { weekStartsOn: 1 }), [current]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const gridEnd = useMemo(() => days[41], [days]);

  // Active agenda range [from, to]
  const [rangeFrom, rangeTo] = useMemo<[Date, Date]>(() => {
    if (rangeMode === "day") return [startOfDay(anchor), endOfDay(anchor)];
    if (rangeMode === "week") return [startOfWeek(anchor, { weekStartsOn: 1 }), endOfWeek(anchor, { weekStartsOn: 1 })];
    if (rangeMode === "month") return [startOfMonth(current), endOfMonth(current)];
    return [startOfDay(new Date(customFrom)), endOfDay(new Date(customTo))];
  }, [rangeMode, anchor, current, customFrom, customTo]);

  // Fetch events covering both the visible grid and the agenda range
  const fetchFrom = rangeFrom < gridStart ? rangeFrom : gridStart;
  const fetchTo = rangeTo > gridEnd ? rangeTo : gridEnd;

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        from: fetchFrom.toISOString(),
        to: fetchTo.toISOString(),
        scope,
      });
      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    }
  }, [fetchFrom, fetchTo, scope]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Approved team absences shown as all-day bars
  useEffect(() => {
    const params = new URLSearchParams({
      status: "approved",
      from: fetchFrom.toISOString(),
      to: fetchTo.toISOString(),
    });
    fetch(`/api/vacations?${params}`)
      .then((r) => r.json())
      .then((d) => setVacations(Array.isArray(d) ? d : []))
      .catch(() => setVacations([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFrom.getTime(), fetchTo.getTime()]);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => setTasks(Array.isArray(data) ? data.filter((t: Task) => t.dueDate) : []))
      .catch(() => setTasks([]));
  }, []);

  // Google Calendar connection status
  const loadGcalStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/google/calendar/status");
      if (r.ok) setGcal(await r.json());
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadGcalStatus(); }, [loadGcalStatus]);

  // Surface the OAuth redirect result (/calendar?gcal=connected|error|…)
  useEffect(() => {
    const g = searchParams.get("gcal");
    if (!g) return;
    const map: Record<string, string> = {
      connected: "Google kalendář propojen ✓",
      error: "Propojení Google kalendáře selhalo",
      denied: "Přístup ke Google kalendáři byl zamítnut",
      norefresh: "Zkus propojení prosím znovu",
      notconfigured: "Google kalendář zatím není na serveru nastavený",
    };
    setGcalMsg(map[g] ?? null);
    loadGcalStatus();
    router.replace("/calendar");
    const t = setTimeout(() => setGcalMsg(null), 4500);
    return () => clearTimeout(t);
  }, [searchParams, router, loadGcalStatus]);

  // Pull Google events for the visible window when connected
  useEffect(() => {
    if (!gcal?.connected || !showGoogle) { setGoogleEvents([]); return; }
    const params = new URLSearchParams({ from: fetchFrom.toISOString(), to: fetchTo.toISOString() });
    fetch(`/api/google/calendar/events?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d)) { setGoogleEvents([]); return; }
        setGoogleEvents(d.map((g: any): CalendarEvent => ({
          id: "g_" + g.id,
          title: g.title,
          description: g.description ?? null,
          startAt: g.startAt,
          endAt: g.endAt,
          allDay: !!g.allDay,
          location: g.location ?? null,
          color: "#4285F4",
          visibility: "personal",
          createdAt: g.startAt,
          updatedAt: g.startAt,
          createdById: "",
          source: "google",
          htmlLink: g.htmlLink ?? null,
        })));
      })
      .catch(() => setGoogleEvents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcal?.connected, showGoogle, fetchFrom.getTime(), fetchTo.getTime()]);

  // DB events + Google mirror, used for all rendering
  const mergedEvents = useMemo(
    () => (showGoogle ? [...events, ...googleEvents] : events),
    [events, googleEvents, showGoogle]
  );

  // Allow other sections to deep-link into "new event" via /calendar?new=event
  useEffect(() => {
    if (searchParams.get("new") === "event") {
      setEditingEvent(null);
      setModalOpen(true);
      router.replace("/calendar");
    }
  }, [searchParams, router]);

  // Deep-link to a specific event via /calendar?event=<id> (e.g. from global search)
  useEffect(() => {
    const eventId = searchParams.get("event");
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) return;
        const ev: CalendarEvent = await res.json();
        if (cancelled || !ev?.id) return;
        const start = new Date(ev.startAt);
        setCurrent(start);
        setAnchor(start);
        setRangeMode("day");
        setEditingEvent(ev);
        setModalOpen(true);
      } catch { /* ignore */ }
      finally { if (!cancelled) router.replace("/calendar"); }
    })();
    return () => { cancelled = true; };
  }, [searchParams, router]);

  // Items intersecting a given day
  const itemsForDay = useCallback((day: Date): DayItem[] => {
    const out: DayItem[] = [];
    if (showEvents) {
      for (const e of mergedEvents) {
        if (new Date(e.startAt) <= endOfDay(day) && new Date(e.endAt) >= startOfDay(day)) {
          out.push({ kind: "event", date: new Date(e.startAt), color: e.color || "var(--accent)", data: e });
        }
      }
    }
    if (showTasks) {
      for (const t of tasks) {
        if (t.dueDate && isSameDay(new Date(t.dueDate), day)) {
          out.push({ kind: "task", date: new Date(t.dueDate), color: taskColor(t), data: t });
        }
      }
    }
    for (const v of vacations) {
      if (new Date(v.startDate) <= endOfDay(day) && new Date(v.endDate) >= startOfDay(day)) {
        out.push({ kind: "vacation", date: new Date(v.startDate), color: VACATION_COLOR, data: v });
      }
    }
    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [mergedEvents, tasks, vacations, showEvents, showTasks]);

  // Agenda: all items within [rangeFrom, rangeTo], grouped by day
  const agendaGroups = useMemo(() => {
    const within = (d: Date) => isWithinInterval(d, { start: rangeFrom, end: rangeTo });
    const items: DayItem[] = [];
    if (showEvents) {
      for (const e of mergedEvents) {
        const s = new Date(e.startAt), en = new Date(e.endAt);
        if (s <= rangeTo && en >= rangeFrom) {
          items.push({ kind: "event", date: s, color: e.color || "var(--accent)", data: e });
        }
      }
    }
    if (showTasks) {
      for (const t of tasks) {
        if (t.dueDate && within(new Date(t.dueDate))) {
          items.push({ kind: "task", date: new Date(t.dueDate), color: taskColor(t), data: t });
        }
      }
    }
    for (const v of vacations) {
      const s2 = new Date(v.startDate), e2 = new Date(v.endDate);
      if (s2 <= rangeTo && e2 >= rangeFrom) {
        items.push({ kind: "vacation", date: s2 < rangeFrom ? rangeFrom : s2, color: VACATION_COLOR, data: v });
      }
    }
    items.sort((a, b) => a.date.getTime() - b.date.getTime());
    // group by day key
    const groups = new Map<string, DayItem[]>();
    for (const it of items) {
      const key = format(it.date, "yyyy-MM-dd");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
    return Array.from(groups.entries()).map(([key, list]) => ({ key, date: list[0].date, list }));
  }, [mergedEvents, tasks, vacations, rangeFrom, rangeTo, showEvents, showTasks]);

  const agendaCount = agendaGroups.reduce((s, g) => s + g.list.length, 0);
  const multiDay = rangeMode !== "day";

  // ── Actions ──
  const selectDay = (day: Date) => { setAnchor(day); setCurrent(day); setRangeMode("day"); };
  const openNew = (day: Date) => { setAnchor(day); setSlotStart(null); setEditingEvent(null); setModalOpen(true); };
  const openNewAt = (at: Date) => { setAnchor(at); setSlotStart(at); setEditingEvent(null); setModalOpen(true); };
  const openEdit = (ev: CalendarEvent) => {
    // Google events are read-only here — open them in Google Calendar instead.
    if (ev.source === "google") { if (ev.htmlLink) window.open(ev.htmlLink, "_blank"); return; }
    setEditingEvent(ev);
    setModalOpen(true);
  };

  // Range-aware previous/next navigation.
  const navigate = (dir: -1 | 1) => {
    if (rangeMode === "day") { setAnchor((a) => addDays(a, dir)); setCurrent((c) => addDays(c, dir)); }
    else if (rangeMode === "week") { setAnchor((a) => addDays(a, 7 * dir)); setCurrent((c) => addDays(c, 7 * dir)); }
    else setCurrent((c) => (dir > 0 ? addMonths(c, 1) : subMonths(c, 1)));
  };
  const goToday = () => { const t = new Date(); setAnchor(t); setCurrent(t); };

  const disconnectGoogle = async () => {
    try { await fetch("/api/google/calendar/disconnect", { method: "POST" }); } catch { /* ignore */ }
    setGoogleEvents([]);
    setShowGoogle(true);
    loadGcalStatus();
  };

  const weekStart = useMemo(() => startOfWeek(anchor, { weekStartsOn: 1 }), [anchor]);

  const setRangePreset = (mode: RangeMode) => {
    setRangeMode(mode);
    if (mode === "day" || mode === "week") {
      const t = new Date();
      setAnchor(t);
      setCurrent(t);
    }
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

  // ── Style helpers ──
  const seg = (on: boolean) =>
    on ? { background: "var(--btn-invert-bg)", color: "var(--btn-invert-text)" } : { color: "var(--text-2)" };
  const chip = (on: boolean) =>
    on
      ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }
      : { background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" };

  const rangeLabel = (() => {
    if (rangeMode === "day")
      return isToday(anchor) ? "Dnes" : cap(format(anchor, "EEEE d. MMMM", { locale: cs }));
    if (rangeMode === "week")
      return `${format(rangeFrom, "d. M.")} – ${format(rangeTo, "d. M.")}`;
    if (rangeMode === "month")
      return cap(format(current, "LLLL yyyy", { locale: cs }));
    return `${format(rangeFrom, "d. M.")} – ${format(rangeTo, "d. M.")}`;
  })();

  return (
    <div className="space-y-4">
      {gcalMsg && (
        <div className="px-3.5 py-2.5 rounded-xl text-[13px] font-medium border"
          style={{ background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }}>
          {gcalMsg}
        </div>
      )}

      {/* ── Filter bar — everything in one row, like the tasks tab ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar lg:flex-wrap lg:overflow-visible">
          {/* Range segmented */}
          <div className="flex items-center gap-1 p-1 rounded-xl border flex-shrink-0"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
            {([["day", "Dnes"], ["week", "Týden"], ["month", "Měsíc"], ["custom", "Vlastní"]] as [RangeMode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => setRangePreset(m)}
                className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all whitespace-nowrap"
                style={seg(rangeMode === m)}>
                {label}
              </button>
            ))}
          </div>

          {/* Scope segmented */}
          <div className="flex items-center gap-1 p-1 rounded-xl border flex-shrink-0"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
            {([["all", "Vše"], ["personal", "Osobní"], ["team", "Týmové"]] as [Scope, string][])
              .filter(([s]) => s !== "team" || canUseTeam)
              .map(([s, label]) => (
                <button key={s} onClick={() => setScope(s)}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all whitespace-nowrap"
                  style={seg(scope === s)}>
                  {label}
                </button>
              ))}
          </div>

          {/* Layer toggles */}
          <button onClick={() => setShowEvents((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12.5px] font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={chip(showEvents)}>
            <CalendarIcon className="w-3.5 h-3.5" />
            Události
          </button>
          <button onClick={() => setShowTasks((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12.5px] font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={chip(showTasks)}>
            <CheckSquare className="w-3.5 h-3.5" />
            Úkoly
          </button>

          {/* Google Calendar — connect, or toggle/disconnect the mirror */}
          {gcal?.configured && (gcal.connected ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setShowGoogle((v) => !v)}
                title={gcal.email ? `Google: ${gcal.email}` : "Google kalendář"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12.5px] font-semibold transition-all whitespace-nowrap"
                style={showGoogle
                  ? { background: "#4285F415", borderColor: "#4285F4", color: "#4285F4" }
                  : { background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#4285F4" }} />
                Google
              </button>
              <button onClick={disconnectGoogle} title="Odpojit Google kalendář"
                className="p-2 rounded-xl border transition-colors hover:bg-[var(--hover)]"
                style={{ borderColor: "var(--border-md)", color: "var(--text-3)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <a href="/api/google/calendar/connect"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12.5px] font-semibold transition-all whitespace-nowrap flex-shrink-0 hover:bg-[var(--hover)]"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#4285F4" }} />
              Propojit Google
            </a>
          ))}
        </div>

        {/* Custom range inputs */}
        {rangeMode === "custom" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-auto" />
            <span className="text-[13px]" style={{ color: "var(--text-3)" }}>–</span>
            <Input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} className="w-auto" />
          </div>
        )}
      </div>

      {/* ── Time grid (week / day) ── */}
      {isTimeGrid ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[18px] font-bold tracking-tight truncate" style={{ color: "var(--text-1)" }}>
              {rangeLabel}
            </h2>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => navigate(-1)} aria-label="Předchozí"
                className="p-2 rounded-xl transition-colors hover:bg-[var(--hover)]" style={{ color: "var(--text-2)" }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={goToday}
                className="px-3 py-1.5 text-[12.5px] font-semibold rounded-xl border transition-colors hover:bg-[var(--hover)]"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
                Dnes
              </button>
              <button onClick={() => navigate(1)} aria-label="Další"
                className="p-2 rounded-xl transition-colors hover:bg-[var(--hover)]" style={{ color: "var(--text-2)" }}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <CalendarTimeGrid
            mode={rangeMode as "week" | "day"}
            anchor={rangeMode === "week" ? weekStart : anchor}
            events={mergedEvents}
            tasks={tasks}
            vacations={vacations}
            showEvents={showEvents}
            showTasks={showTasks}
            onSelectEvent={openEdit}
            onCreateAt={openNewAt}
            onSelectDay={selectDay}
          />
        </div>
      ) : (
      /* ── Calendar + agenda (month / custom) ── */
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 lg:gap-6">
        {/* Calendar card */}
        <div className="rounded-3xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          {/* Month header */}
          <div className="flex items-center justify-between px-4 sm:px-5 pt-5 pb-4">
            <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
              {cap(format(current, "LLLL", { locale: cs }))} <span style={{ color: "var(--text-3)" }}>{format(current, "yyyy")}</span>
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrent((c) => subMonths(c, 1))} aria-label="Předchozí měsíc"
                className="p-2 rounded-xl transition-colors hover:bg-[var(--hover)]" style={{ color: "var(--text-2)" }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => { const t = new Date(); setCurrent(t); selectDay(t); }}
                className="px-3 py-1.5 text-[12.5px] font-semibold rounded-xl border transition-colors hover:bg-[var(--hover)]"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
                Dnes
              </button>
              <button onClick={() => setCurrent((c) => addMonths(c, 1))} aria-label="Další měsíc"
                className="p-2 rounded-xl transition-colors hover:bg-[var(--hover)]" style={{ color: "var(--text-2)" }}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 px-2 sm:px-3">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold py-2 uppercase tracking-wide"
                style={{ color: "var(--text-3)" }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 px-2 sm:px-3 pb-3">
            {days.map((day, i) => {
              const inMonth = day.getMonth() === current.getMonth();
              const today = isToday(day);
              const selected = isSameDay(day, anchor);
              const items = itemsForDay(day);
              return (
                <button
                  key={i}
                  onClick={() => selectDay(day)}
                  onDoubleClick={() => openNew(day)}
                  className="group relative aspect-square sm:aspect-auto sm:min-h-[78px] rounded-xl sm:rounded-2xl p-1 sm:p-1.5 flex flex-col items-center sm:items-stretch transition-colors"
                  style={{
                    background: selected ? "var(--accent)" : "transparent",
                    border: selected ? "none" : `1px solid ${today ? "var(--accent)" : "transparent"}`,
                  }}
                >
                  <div className="flex items-center justify-center sm:justify-start">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full text-[12.5px] font-semibold"
                      style={{ color: selected ? "#fff" : today ? "var(--accent)" : inMonth ? "var(--text-1)" : "var(--text-3)" }}>
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Desktop pills */}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-0.5 flex-1 w-full overflow-hidden">
                    {items.slice(0, 2).map((it, idx) => (
                      <span key={idx}
                        className="block text-[10px] font-medium px-1 py-0.5 rounded truncate leading-tight"
                        style={{
                          background: selected ? "rgba(255,255,255,0.22)" : `color-mix(in srgb, ${it.color} 15%, transparent)`,
                          color: selected ? "#fff" : "var(--text-1)",
                        }}
                        title={itemTitle(it)}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                          style={{ background: selected ? "#fff" : it.color }} />
                        {itemTitle(it)}
                      </span>
                    ))}
                    {items.length > 2 && (
                      <span className="text-[10px] px-1 font-medium"
                        style={{ color: selected ? "rgba(255,255,255,0.85)" : "var(--text-3)" }}>
                        +{items.length - 2} dalších
                      </span>
                    )}
                  </div>

                  {/* Mobile dots */}
                  {items.length > 0 && (
                    <div className="flex sm:hidden items-center justify-center gap-0.5 mt-0.5">
                      {items.slice(0, 3).map((it, di) => (
                        <span key={di} className="w-1.5 h-1.5 rounded-full"
                          style={{ background: selected ? "#fff" : it.color }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda panel */}
        <div className="rounded-3xl border overflow-hidden lg:sticky lg:top-4 lg:self-start"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
                  {rangeMode === "month" ? "Měsíc" : "Rozsah"}
                </p>
                <h3 className="text-[19px] font-bold tracking-tight mt-0.5 truncate" style={{ color: "var(--text-1)" }}>
                  {rangeLabel}
                </h3>
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--bg-subtle)" }}>
                <CalendarDays className="w-5 h-5" style={{ color: "var(--accent)" }} />
              </div>
            </div>
            <p className="text-[12.5px] mt-2" style={{ color: "var(--text-3)" }}>
              {agendaCount === 0 ? "Nic naplánováno" : `${agendaCount} ${agendaCount === 1 ? "položka" : agendaCount <= 4 ? "položky" : "položek"}`}
            </p>
          </div>

          <div className="p-3 space-y-3 max-h-[460px] lg:max-h-[60vh] overflow-y-auto">
            {agendaCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarDays className="w-8 h-8 mb-2 opacity-30" style={{ color: "var(--text-3)" }} />
                <p className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>Volno</p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>Žádné události ani úkoly</p>
              </div>
            ) : (
              agendaGroups.map((group) => (
                <div key={group.key} className="space-y-1.5">
                  {multiDay && (
                    <p className="text-[11.5px] font-semibold uppercase tracking-wide px-1.5 pt-1" style={{ color: "var(--text-3)" }}>
                      {cap(format(group.date, "EEEE d. M.", { locale: cs }))}
                    </p>
                  )}
                  {group.list.map((it, idx) =>
                    it.kind === "event" ? (
                      <button key={"e" + it.data.id + idx} onClick={() => openEdit(it.data)}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors hover:bg-[var(--hover)]">
                        <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: it.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold leading-snug line-clamp-2 flex items-center gap-1.5" style={{ color: "var(--text-1)" }}>
                            {it.data.recurring && it.data.recurring !== "none" && (
                              <RefreshCw className="w-3 h-3 flex-shrink-0 opacity-60" style={{ color: "var(--accent)" }} />
                            )}
                            {it.data.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11.5px]" style={{ color: "var(--text-3)" }}>
                              <Clock className="w-3 h-3" />
                              {it.data.allDay ? "Celý den" : `${format(new Date(it.data.startAt), "HH:mm")} – ${format(new Date(it.data.endAt), "HH:mm")}`}
                            </span>
                            {it.data.location && (
                              <span className="inline-flex items-center gap-1 text-[11.5px]" style={{ color: "var(--text-3)" }}>
                                <MapPin className="w-3 h-3" />{it.data.location}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-md"
                              style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>
                              {it.data.visibility === "team" ? <><Users className="w-2.5 h-2.5" /> Tým</> : <><Lock className="w-2.5 h-2.5" /> Osobní</>}
                            </span>
                            {it.data.task && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-md max-w-[140px]"
                                style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
                                <CheckSquare className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">{it.data.task.title}</span>
                              </span>
                            )}
                          </div>
                          {it.data.assignees && it.data.assignees.length > 0 && (
                            <div className="flex items-center -space-x-1.5 mt-2">
                              {it.data.assignees.slice(0, 5).map((a) => (
                                <span key={a.id} className="ring-2 rounded-full" style={{ "--tw-ring-color": "var(--bg-card)" } as React.CSSProperties}>
                                  <Avatar name={a.name} src={a.avatar} size="xs" />
                                </span>
                              ))}
                              {it.data.assignees.length > 5 && (
                                <span className="text-[10.5px] font-medium pl-2.5" style={{ color: "var(--text-3)" }}>
                                  +{it.data.assignees.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ) : it.kind === "task" ? (
                      <Link key={"t" + it.data.id + idx} href={`/tasks/${it.data.id}`}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-2xl transition-colors hover:bg-[var(--hover)]">
                        <CheckSquare className="w-3.5 h-3.5 mt-1 flex-shrink-0" style={{ color: it.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold leading-snug line-clamp-2" style={{ color: "var(--text-1)" }}>
                            {it.data.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                              style={{ background: `color-mix(in srgb, ${it.color} 14%, transparent)`, color: it.color }}>
                              {it.data.status !== "done" && isOverdue(it.data.dueDate) ? "Po termínu" : STATUS_LABELS[it.data.status] ?? it.data.status}
                            </span>
                            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>Úkol</span>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <Link key={"v" + it.data.id + idx} href="/vacation"
                        className="flex items-start gap-3 px-3 py-2.5 rounded-2xl transition-colors hover:bg-[var(--hover)]"
                        style={{ background: "color-mix(in srgb, #0EA5E9 6%, transparent)" }}>
                        <Palmtree className="w-3.5 h-3.5 mt-1 flex-shrink-0" style={{ color: it.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold leading-snug flex items-center gap-2" style={{ color: "var(--text-1)" }}>
                            {it.data.user && <Avatar name={it.data.user.name} src={it.data.user.avatar} size="xs" />}
                            {it.data.user?.name ?? "Člen"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                              style={{ background: `color-mix(in srgb, ${it.color} 14%, transparent)`, color: it.color }}>
                              {VACATION_LABELS[it.data.type] ?? "Dovolená"}
                            </span>
                            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                              {format(new Date(it.data.startDate), "d. M.")} – {format(new Date(it.data.endDate), "d. M.")}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => openNew(anchor)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}>
              <Plus className="w-4 h-4" />
              Nová událost
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Create / edit modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingEvent(null); setSlotStart(null); }}
        title={editingEvent ? "Upravit událost" : "Nová událost"}>
        <EventForm
          event={editingEvent ?? undefined}
          defaultDate={format(slotStart ?? anchor, "yyyy-MM-dd")}
          defaultTime={slotStart ? format(slotStart, "HH:mm") : undefined}
          canUseTeam={canUseTeam}
          onSaved={handleSaved}
          onDeleted={editingEvent ? handleDeleted : undefined}
          onClose={() => { setModalOpen(false); setEditingEvent(null); setSlotStart(null); }}
        />
      </Modal>
    </div>
  );
}
