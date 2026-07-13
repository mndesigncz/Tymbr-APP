"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Clock, TrendingUp, CheckSquare, Trash2, ChevronDown, ChevronUp, Download, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { isManager } from "@/lib/roles";
import { ScrollFadeX } from "@/components/ui/ScrollFadeX";
import type { TimeEntry } from "@/types";
import { useStatusConfig, statusLabel, statusColor } from "@/hooks/useStatusConfig";

type DateRange = "today" | "week" | "month" | "year" | "custom";
type ReportTab = "task" | "subtask" | "category" | "person" | "status";

function entryRate(e: any): number | null {
  const subRate = e.subtask?.hourlyRate;
  if (subRate != null) return subRate;
  return e.task?.hourlyRate ?? null;
}

function entryEarning(e: any): number {
  const rate = entryRate(e);
  if (!rate) return 0;
  return Math.round(((e.durationMinutes ?? 0) / 60) * rate);
}

const DATE_LABELS: Record<DateRange, string> = {
  today: "Dnes",
  week: "Tento týden",
  month: "Tento měsíc",
  year: "Tento rok",
  custom: "Vlastní",
};

function getRange(range: DateRange, customFrom: string, customTo: string) {
  const now = new Date();
  const to = new Date(now); to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  if (range === "today") { from.setHours(0, 0, 0, 0); }
  else if (range === "week") { from.setDate(from.getDate() - 7); from.setHours(0, 0, 0, 0); }
  else if (range === "month") { from.setMonth(from.getMonth() - 1); from.setHours(0, 0, 0, 0); }
  else if (range === "year") { from.setFullYear(from.getFullYear() - 1); from.setHours(0, 0, 0, 0); }
  else if (range === "custom") {
    return {
      from: customFrom ? new Date(customFrom) : new Date(0),
      to: customTo ? new Date(customTo + "T23:59:59") : to,
    };
  }
  return { from, to };
}

// ISO/date string → value for a <input type="datetime-local"> (in local time).
function toLocalInput(d: string | Date): string {
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function TimeReports({ embedded = false }: { embedded?: boolean }) {
  const { data: session } = useSession();
  const statuses = useStatusConfig();
  const [range, setRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ReportTab>("task");
  const [members, setMembers] = useState<{ id: string; name: string; avatar?: string | null }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const myId = session?.user?.id;
  const manager = isManager((session?.user as any)?.teamRole);

  useEffect(() => {
    // Only managers can browse other members; members never load the team list.
    if (!manager) return;
    fetch("/api/users").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setMembers(d);
    });
  }, [manager]);

  // Default to current user selected
  useEffect(() => {
    if (myId && selectedUserIds.size === 0) {
      setSelectedUserIds(new Set([myId]));
    }
  }, [myId]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { from, to } = getRange(range, customFrom, customTo);
    const params = new URLSearchParams({
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
    });
    // If all members selected or none selected, fetch all; else fetch all and filter client-side
    if (selectedUserIds.size !== 1 || !selectedUserIds.has(myId ?? "")) {
      params.set("allUsers", "true");
    }
    const res = await fetch(`/api/time-entries?${params}`);
    const data = await res.json();
    setEntries(Array.isArray(data) ? data.filter((e: TimeEntry) => e.stoppedAt) : []);
    setLoading(false);
  }, [range, customFrom, customTo, selectedUserIds, myId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // Inline editing of a completed entry's start / end times.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const beginEdit = (e: TimeEntry) => {
    setEditingId(e.id);
    setEditErr(null);
    setEditStart(toLocalInput(e.startedAt));
    setEditEnd(e.stoppedAt ? toLocalInput(e.stoppedAt) : toLocalInput(new Date().toISOString()));
  };

  const saveEdit = async (id: string) => {
    setEditErr(null);
    const startedAt = new Date(editStart);
    const stoppedAt = new Date(editEnd);
    if (isNaN(startedAt.getTime()) || isNaN(stoppedAt.getTime())) { setEditErr("Neplatné datum"); return; }
    if (stoppedAt <= startedAt) { setEditErr("Konec musí být po začátku"); return; }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/time-entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startedAt: startedAt.toISOString(), stoppedAt: stoppedAt.toISOString() }),
      });
      if (!res.ok) { setEditErr((await res.json()).error || "Uložení selhalo"); return; }
      setEditingId(null);
      fetchEntries();
    } catch {
      setEditErr("Uložení selhalo");
    } finally {
      setEditSaving(false);
    }
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else { next.add(id); }
      return next;
    });
  };

  const selectAll = () => setSelectedUserIds(new Set(members.map((m) => m.id)));
  const isAllSelected = members.length > 0 && members.every((m) => selectedUserIds.has(m.id));

  // Filter entries by selected users
  const filteredEntries = selectedUserIds.size === 0
    ? entries
    : entries.filter((e) => selectedUserIds.has(e.userId));

  const exportCsv = () => {
    const rows = [
      ["Úkol", "Podúkol", "Kategorie", "Uživatel", "Začátek", "Konec", "Minut", "Sazba (Kč/h)", "Výdělek (Kč)"],
      ...filteredEntries.map((e) => {
        const rate = entryRate(e);
        return [
          (e.task as any)?.title ?? "",
          (e as any).subtask?.title ?? "",
          (e.task as any)?.category?.name ?? "",
          (e as any).user?.name ?? "",
          e.startedAt ? new Date(e.startedAt).toLocaleString("cs-CZ") : "",
          e.stoppedAt ? new Date(e.stoppedAt).toLocaleString("cs-CZ") : "",
          String(e.durationMinutes ?? 0),
          rate ? String(rate) : "",
          String(entryEarning(e)),
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vykazy-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalMinutes = filteredEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
  const totalEarning = filteredEntries.reduce((s, e) => s + entryEarning(e), 0);
  const uniqueTasks = new Set(filteredEntries.map((e) => e.taskId)).size;

  // Group by subtask
  const bySubtask = filteredEntries.reduce((acc, e) => {
    const sub = (e as any).subtask;
    if (!sub) return acc;
    if (!acc[sub.id]) {
      acc[sub.id] = { title: sub.title, taskTitle: (e.task as any)?.title ?? "", minutes: 0, earning: 0, rate: sub.hourlyRate ?? (e.task as any)?.hourlyRate ?? null };
    }
    acc[sub.id].minutes += e.durationMinutes ?? 0;
    acc[sub.id].earning += entryEarning(e);
    return acc;
  }, {} as Record<string, { title: string; taskTitle: string; minutes: number; earning: number; rate: number | null }>);
  const subtaskRows = Object.values(bySubtask).sort((a, b) => b.minutes - a.minutes);

  // Group by task
  const byTask = filteredEntries.reduce((acc, e) => {
    if (!acc[e.taskId]) {
      acc[e.taskId] = { title: (e.task as any)?.title ?? "Neznámý úkol", categoryName: (e.task as any)?.category?.name, categoryColor: (e.task as any)?.category?.color, status: (e.task as any)?.status ?? "todo", hourlyRate: (e.task as any)?.hourlyRate, minutes: 0 };
    }
    acc[e.taskId].minutes += e.durationMinutes ?? 0;
    return acc;
  }, {} as Record<string, { title: string; categoryName?: string; categoryColor?: string; status: string; hourlyRate?: number; minutes: number }>);
  const taskRows = Object.values(byTask).sort((a, b) => b.minutes - a.minutes);

  // Group by category
  const byCat = filteredEntries.reduce((acc, e) => {
    const name = (e.task as any)?.category?.name ?? "Bez kategorie";
    const color = (e.task as any)?.category?.color ?? "#9a9aa2";
    if (!acc[name]) acc[name] = { name, color, minutes: 0, earning: 0 };
    acc[name].minutes += e.durationMinutes ?? 0;
    acc[name].earning += entryEarning(e);
    return acc;
  }, {} as Record<string, { name: string; color: string; minutes: number; earning: number }>);
  const catRows = Object.values(byCat).sort((a, b) => b.minutes - a.minutes);

  // Group by person
  const byPerson = filteredEntries.reduce((acc, e) => {
    const userId = e.userId;
    const user = e.user as any;
    if (!acc[userId]) acc[userId] = { userId, name: user?.name ?? "Neznámý", avatar: user?.avatar, minutes: 0, earning: 0, tasks: new Set<string>() };
    acc[userId].minutes += e.durationMinutes ?? 0;
    acc[userId].tasks.add(e.taskId);
    acc[userId].earning += entryEarning(e);
    return acc;
  }, {} as Record<string, { userId: string; name: string; avatar?: string; minutes: number; earning: number; tasks: Set<string> }>);
  const personRows = Object.values(byPerson).sort((a, b) => b.minutes - a.minutes);

  // Group by status
  const byStatus = filteredEntries.reduce((acc, e) => {
    const s = (e.task as any)?.status ?? "todo";
    if (!acc[s]) acc[s] = { status: s, minutes: 0, count: 0 };
    acc[s].minutes += e.durationMinutes ?? 0;
    acc[s].count += 1;
    return acc;
  }, {} as Record<string, { status: string; minutes: number; count: number }>);
  const statusRows = Object.values(byStatus).sort((a, b) => b.minutes - a.minutes);

  const TAB_LABELS: Record<ReportTab, string> = {
    task: "Úkoly",
    subtask: "Podúkoly",
    category: "Kategorie",
    person: "Lidé",
    status: "Stav",
  };

  const BarRow = ({ pct, color }: { pct: number; color: string }) => (
    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );

  const exportBtn = filteredEntries.length > 0 ? (
    <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportCsv}>
      Export CSV
    </Button>
  ) : undefined;

  return (
    <div>
      {embedded ? (
        exportBtn ? <div className="px-4 sm:px-6 lg:px-8 pt-2 flex justify-end">{exportBtn}</div> : null
      ) : (
        <Header
          title="Výkazy práce"
          subtitle="Přehled odpracovaného času a výdělků"
          actions={exportBtn}
        />
      )}

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-6">
        {/* Date range — single scrollable row */}
        <div className="space-y-3">
          <ScrollFadeX className="flex items-center gap-2 pb-0.5" fadeColor="var(--bg-page)">
            {(Object.keys(DATE_LABELS) as DateRange[]).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className="px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all flex-shrink-0 whitespace-nowrap"
                style={range === r
                  ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                  : { background: "var(--bg-card)", color: "var(--text-2)", borderColor: "var(--border-md)" }}>
                {DATE_LABELS[r]}
              </button>
            ))}
          </ScrollFadeX>
          {range === "custom" && (
            <div className="flex gap-3 max-w-xs">
              <Input type="date" label="Od" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <Input type="date" label="Do" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Clock, color: "#3B82F6", value: formatMinutes(totalMinutes), label: "Celkem odpracováno" },
            { icon: TrendingUp, color: "#22C55E", value: totalEarning > 0 ? `${totalEarning.toLocaleString("cs-CZ")} Kč` : "—", label: "Celkový výdělek" },
            { icon: CheckSquare, color: "var(--accent)", value: String(uniqueTasks), label: "Úkolů s časem" },
          ].map(({ icon: Icon, color, value, label }) => (
            <div key={label} className="rounded-3xl p-6 flex flex-col gap-5 border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <p className="text-[28px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>{value}</p>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Member selector — managers only, sits below the summary cards */}
        {manager && members.length > 0 && (
          <div className="rounded-3xl border p-5"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between mb-3.5">
              <p className="text-[13px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
                Koho zobrazit
              </p>
              {members.length > 1 && (
                <button
                  onClick={isAllSelected ? () => setSelectedUserIds(new Set([myId ?? ""])) : selectAll}
                  className="text-[12.5px] font-semibold transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent)" }}>
                  {isAllSelected ? "Jen já" : "Celý tým"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button key={m.id}
                  onClick={() => toggleUser(m.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all"
                  style={selectedUserIds.has(m.id)
                    ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" }
                    : { background: "var(--bg-subtle)", color: "var(--text-2)", borderColor: "var(--border-md)" }}>
                  <Avatar name={m.name} src={m.avatar} size="xs" />
                  {m.name.split(" ")[0]}
                  {m.id === myId && (
                    <span className="text-[10px]" style={{ opacity: 0.6 }}>já</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Report tabs */}
        <div className="rounded-3xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="border-b" style={{ borderColor: "var(--border)" }}>
            <ScrollFadeX className="flex items-center gap-1 p-2" fadeColor="var(--bg-card)">
              {(Object.keys(TAB_LABELS) as ReportTab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all flex-shrink-0 whitespace-nowrap"
                  style={tab === t ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}>
                  {TAB_LABELS[t]}
                </button>
              ))}
            </ScrollFadeX>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--text-3)" }}>
              <Clock className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>Žádné záznamy</p>
              <p className="text-[13px] mt-1">Zahajte práci v přehledu nebo u úkolu</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {tab === "task" && taskRows.map((row, i) => {
                const pct = totalMinutes > 0 ? (row.minutes / totalMinutes) * 100 : 0;
                const earning = row.hourlyRate ? Math.round((row.minutes / 60) * row.hourlyRate) : null;
                return (
                  <div key={i} className="rounded-2xl px-4 py-3.5" style={{ background: "var(--bg-subtle)" }}>
                    <div className="flex items-center gap-3">
                      {row.categoryColor && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.categoryColor }} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold line-clamp-1" style={{ color: "var(--text-1)" }}>{row.title}</p>
                        {row.categoryName && <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>{row.categoryName}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{formatMinutes(row.minutes)}</p>
                        {earning && <p className="text-[12px]" style={{ color: "#22C55E" }}>{earning.toLocaleString("cs-CZ")} Kč</p>}
                      </div>
                    </div>
                    <BarRow pct={pct} color={row.categoryColor ?? "var(--accent)"} />
                  </div>
                );
              })}

              {tab === "subtask" && (subtaskRows.length === 0 ? (
                <p className="text-[13.5px] text-center py-8" style={{ color: "var(--text-3)" }}>
                  Žádný čas na podúkolech. Spusť sledování podúkolu ve focus módu.
                </p>
              ) : subtaskRows.map((row, i) => {
                const pct = totalMinutes > 0 ? (row.minutes / totalMinutes) * 100 : 0;
                return (
                  <div key={i} className="rounded-2xl px-4 py-3.5" style={{ background: "var(--bg-subtle)" }}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold line-clamp-1" style={{ color: "var(--text-1)" }}>{row.title}</p>
                        <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                          {row.taskTitle}{row.rate ? ` · ${row.rate} Kč/h` : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{formatMinutes(row.minutes)}</p>
                        {row.earning > 0 && <p className="text-[12px]" style={{ color: "#22C55E" }}>{row.earning.toLocaleString("cs-CZ")} Kč</p>}
                      </div>
                    </div>
                    <BarRow pct={pct} color="#a855f7" />
                  </div>
                );
              }))}

              {tab === "category" && catRows.map((row, i) => {
                const pct = totalMinutes > 0 ? Math.round((row.minutes / totalMinutes) * 100) : 0;
                return (
                  <div key={i} className="rounded-2xl px-4 py-3.5" style={{ background: "var(--bg-subtle)" }}>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: row.color }} />
                      <span className="text-[13.5px] font-semibold flex-1" style={{ color: "var(--text-1)" }}>{row.name}</span>
                      <span className="text-[11.5px]" style={{ color: "var(--text-3)" }}>{pct}%</span>
                      <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{formatMinutes(row.minutes)}</span>
                      {row.earning > 0 && <span className="text-[12.5px] font-semibold" style={{ color: "#22C55E" }}>{row.earning.toLocaleString("cs-CZ")} Kč</span>}
                    </div>
                    <BarRow pct={pct} color={row.color} />
                  </div>
                );
              })}

              {tab === "person" && personRows.map((row) => {
                const pct = totalMinutes > 0 ? Math.round((row.minutes / totalMinutes) * 100) : 0;
                const isMe = row.userId === myId;
                return (
                  <div key={row.userId} className="rounded-2xl px-4 py-3.5" style={{ background: "var(--bg-subtle)" }}>
                    <div className="flex items-center gap-3">
                      <Avatar name={row.name} src={row.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold flex items-center gap-1.5" style={{ color: "var(--text-1)" }}>
                          {row.name}
                          {isMe && <span className="text-[10px] font-medium px-1 py-0.5 rounded" style={{ background: "var(--bg-card)", color: "var(--text-3)" }}>já</span>}
                        </p>
                        <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>{row.tasks.size} {row.tasks.size === 1 ? "úkol" : "úkolů"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{formatMinutes(row.minutes)}</p>
                        {row.earning > 0 && <p className="text-[12px]" style={{ color: "#22C55E" }}>{row.earning.toLocaleString("cs-CZ")} Kč</p>}
                      </div>
                    </div>
                    <BarRow pct={pct} color="var(--accent)" />
                  </div>
                );
              })}

              {tab === "status" && statusRows.map((row, i) => {
                const pct = totalMinutes > 0 ? Math.round((row.minutes / totalMinutes) * 100) : 0;
                return (
                  <div key={i} className="rounded-2xl px-4 py-3.5" style={{ background: "var(--bg-subtle)" }}>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: statusColor(statuses, row.status) }} />
                      <span className="text-[13.5px] font-semibold flex-1" style={{ color: "var(--text-1)" }}>{statusLabel(statuses, row.status)}</span>
                      <span className="text-[12px]" style={{ color: "var(--text-3)" }}>{row.count} záznamů</span>
                      <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{formatMinutes(row.minutes)}</span>
                    </div>
                    <BarRow pct={pct} color={statusColor(statuses, row.status)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Raw entries */}
        {filteredEntries.length > 0 && (
          <div className="rounded-3xl border overflow-hidden"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
                Záznamy ({filteredEntries.length})
              </h2>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {filteredEntries.map((entry) => {
                const d = new Date(entry.startedAt);
                const d2 = entry.stoppedAt ? new Date(entry.stoppedAt) : null;
                const dateStr = d.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
                const timeStart = d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
                const timeEnd = d2?.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }) ?? "–";
                const isMe = entry.userId === myId;
                const expanded = expandedEntry === entry.id;
                const user = entry.user as any;
                const subtask = (entry as any).subtask;
                return (
                  <div key={entry.id} className="rounded-2xl overflow-hidden"
                    style={{ background: "var(--bg-subtle)" }}>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                      onClick={() => setExpandedEntry(expanded ? null : entry.id)}>
                      <Avatar name={user?.name ?? "?"} src={user?.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold line-clamp-1" style={{ color: "var(--text-1)" }}>
                          {(entry.task as any)?.title ?? "Neznámý úkol"}
                        </p>
                        {subtask && (
                          <p className="inline-flex items-center gap-1 text-[11.5px] font-medium mt-1 px-2 py-0.5 rounded-md"
                            style={{ background: "#a855f715", color: "#a855f7" }}>
                            ↳ {subtask.title} · {formatMinutes(entry.durationMinutes ?? 0)}
                          </p>
                        )}
                        <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-3)" }}>
                          {user?.name} · {dateStr} · {timeStart}–{timeEnd}
                        </p>
                      </div>
                      <span className="text-[13px] font-semibold flex-shrink-0" style={{ color: "var(--text-2)" }}>
                        {formatMinutes(entry.durationMinutes ?? 0)}
                      </span>
                      {expanded
                        ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                        : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />}
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 pt-0 space-y-1.5 border-t" style={{ borderColor: "var(--border)" }}>
                        {editingId === entry.id ? (
                          /* Inline editor for start / end */
                          <div className="mt-3 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-3)" }}>Začátek</p>
                                <Input type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="w-full" />
                              </div>
                              <div>
                                <p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-3)" }}>Konec</p>
                                <Input type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="w-full" />
                              </div>
                            </div>
                            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                              Délka:{" "}
                              <span className="font-semibold" style={{ color: "var(--text-1)" }}>
                                {(() => {
                                  const mins = Math.round((new Date(editEnd).getTime() - new Date(editStart).getTime()) / 60000);
                                  return mins > 0 && !isNaN(mins) ? formatMinutes(mins) : "–";
                                })()}
                              </span>
                            </p>
                            {editErr && <p className="text-[12px]" style={{ color: "var(--danger, #ef4444)" }}>{editErr}</p>}
                            <div className="flex items-center gap-2">
                              <button onClick={() => saveEdit(entry.id)} disabled={editSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold text-white disabled:opacity-50"
                                style={{ background: "var(--accent)" }}>
                                <Check className="w-3.5 h-3.5" /> Uložit
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-medium border"
                                style={{ borderColor: "var(--border-md)", color: "var(--text-2)" }}>
                                <X className="w-3.5 h-3.5" /> Zrušit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              {[
                                ["Začátek", `${dateStr} ${timeStart}`],
                                ["Konec", `${dateStr} ${timeEnd}`],
                                ["Délka", formatMinutes(entry.durationMinutes ?? 0)],
                                ...(subtask ? [["Podúkol", subtask.title]] : []),
                                ["Stav úkolu", statusLabel(statuses, (entry.task as any)?.status ?? "")],
                                ...(entryRate(entry) ? [["Hodinová sazba", `${entryRate(entry)} Kč/h`]] : []),
                                ...(entryEarning(entry) > 0 ? [["Výdělek", `${entryEarning(entry).toLocaleString("cs-CZ")} Kč`]] : []),
                              ].map(([k, v]) => (
                                <div key={k}>
                                  <p className="text-[11px] font-medium" style={{ color: "var(--text-3)" }}>{k}</p>
                                  <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>{v}</p>
                                </div>
                              ))}
                            </div>
                            {(isMe || manager) && (
                              <div className="flex items-center gap-4 mt-2">
                                <button onClick={() => beginEdit(entry)}
                                  className="flex items-center gap-1.5 text-[12.5px] font-medium transition-colors hover:text-[var(--accent)]"
                                  style={{ color: "var(--text-3)" }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                  Upravit čas
                                </button>
                                <button onClick={() => handleDelete(entry.id)}
                                  className="flex items-center gap-1.5 text-[12.5px] font-medium transition-colors hover:text-red-500"
                                  style={{ color: "var(--text-3)" }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Smazat záznam
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
