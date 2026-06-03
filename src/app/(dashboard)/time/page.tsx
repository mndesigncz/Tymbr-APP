"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Clock, TrendingUp, CheckSquare, Trash2, Users } from "lucide-react";
import { Input } from "@/components/ui/Input";
import type { TimeEntry } from "@/types";

type DateRange = "today" | "week" | "month" | "year" | "custom";
type ReportTab = "task" | "subtask" | "category" | "person" | "status";

// Effective hourly rate for a time entry: subtask rate overrides task rate
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

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

const STATUS_LABELS: Record<string, string> = {
  todo: "K provedení",
  in_progress: "Probíhá",
  review: "Ke schválení",
  done: "Hotovo",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "#6B7280",
  in_progress: "#3B82F6",
  review: "#EAB308",
  done: "#22C55E",
};

export default function TimePage() {
  const { data: session } = useSession();
  const [range, setRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ReportTab>("task");
  const [allUsers, setAllUsers] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { from, to } = getRange(range, customFrom, customTo);
    const params = new URLSearchParams({
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
    });
    if (allUsers) params.set("allUsers", "true");
    const res = await fetch(`/api/time-entries?${params}`);
    const data = await res.json();
    setEntries(Array.isArray(data) ? data.filter((e: TimeEntry) => e.stoppedAt) : []);
    setLoading(false);
  }, [range, customFrom, customTo, allUsers]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const totalMinutes = entries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
  const totalEarning = entries.reduce((s, e) => s + entryEarning(e), 0);
  const uniqueTasks = new Set(entries.map((e) => e.taskId)).size;

  // Group by subtask
  const bySubtask = entries.reduce((acc, e) => {
    const sub = (e as any).subtask;
    if (!sub) return acc;
    if (!acc[sub.id]) {
      acc[sub.id] = {
        title: sub.title,
        taskTitle: (e.task as any)?.title ?? "",
        minutes: 0,
        earning: 0,
        rate: sub.hourlyRate ?? (e.task as any)?.hourlyRate ?? null,
      };
    }
    acc[sub.id].minutes += e.durationMinutes ?? 0;
    acc[sub.id].earning += entryEarning(e);
    return acc;
  }, {} as Record<string, { title: string; taskTitle: string; minutes: number; earning: number; rate: number | null }>);

  const subtaskRows = Object.values(bySubtask).sort((a, b) => b.minutes - a.minutes);

  // Group by task
  const byTask = entries.reduce((acc, e) => {
    if (!acc[e.taskId]) {
      acc[e.taskId] = {
        title: (e.task as any)?.title ?? "Neznámý úkol",
        categoryName: (e.task as any)?.category?.name,
        categoryColor: (e.task as any)?.category?.color,
        status: (e.task as any)?.status ?? "todo",
        hourlyRate: (e.task as any)?.hourlyRate,
        minutes: 0,
      };
    }
    acc[e.taskId].minutes += e.durationMinutes ?? 0;
    return acc;
  }, {} as Record<string, { title: string; categoryName?: string; categoryColor?: string; status: string; hourlyRate?: number; minutes: number }>);

  const taskRows = Object.values(byTask).sort((a, b) => b.minutes - a.minutes);

  // Group by category
  const byCat = entries.reduce((acc, e) => {
    const name = (e.task as any)?.category?.name ?? "Bez kategorie";
    const color = (e.task as any)?.category?.color ?? "#9a9aa2";
    if (!acc[name]) acc[name] = { name, color, minutes: 0, earning: 0 };
    acc[name].minutes += e.durationMinutes ?? 0;
    acc[name].earning += entryEarning(e);
    return acc;
  }, {} as Record<string, { name: string; color: string; minutes: number; earning: number }>);

  const catRows = Object.values(byCat).sort((a, b) => b.minutes - a.minutes);

  // Group by person
  const byPerson = entries.reduce((acc, e) => {
    const userId = e.userId;
    const user = e.user as any;
    if (!acc[userId]) {
      acc[userId] = {
        userId,
        name: user?.name ?? "Neznámý",
        avatar: user?.avatar,
        minutes: 0,
        earning: 0,
        tasks: new Set<string>(),
      };
    }
    acc[userId].minutes += e.durationMinutes ?? 0;
    acc[userId].tasks.add(e.taskId);
    acc[userId].earning += entryEarning(e);
    return acc;
  }, {} as Record<string, { userId: string; name: string; avatar?: string; minutes: number; earning: number; tasks: Set<string> }>);

  const personRows = Object.values(byPerson).sort((a, b) => b.minutes - a.minutes);

  // Group by status
  const byStatus = entries.reduce((acc, e) => {
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

  return (
    <div>
      <Header title="Výkazy práce" subtitle="Přehled odpracovaného času a výdělků" />

      <div className="px-6 lg:px-8 pt-2 pb-12 space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DATE_LABELS) as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all"
                style={range === r
                  ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                  : { background: "var(--bg-card)", color: "var(--text-2)", borderColor: "var(--border-md)" }}
              >
                {DATE_LABELS[r]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAllUsers(!allUsers)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all"
            style={allUsers
              ? { background: "#3B82F615", color: "#3B82F6", borderColor: "#3B82F6" }
              : { background: "var(--bg-card)", color: "var(--text-2)", borderColor: "var(--border-md)" }}
          >
            <Users className="w-3.5 h-3.5" />
            Celý tým
          </button>
        </div>
        {range === "custom" && (
          <div className="flex gap-3 max-w-xs">
            <Input type="date" label="Od" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <Input type="date" label="Do" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Clock, color: "#3B82F6", value: formatMinutes(totalMinutes), label: "Celkem odpracováno" },
            { icon: TrendingUp, color: "#22C55E", value: totalEarning > 0 ? `${totalEarning.toLocaleString("cs-CZ")} Kč` : "—", label: "Celkový výdělek" },
            { icon: CheckSquare, color: "var(--accent)", value: String(uniqueTasks), label: "Úkolů s časem" },
          ].map(({ icon: Icon, color, value, label }) => (
            <div key={label} className="rounded-3xl p-6 flex flex-col gap-5 border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: `${color}15` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <p className="text-[28px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>{value}</p>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="rounded-3xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-1 p-2 border-b" style={{ borderColor: "var(--border)" }}>
            {(Object.keys(TAB_LABELS) as ReportTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
                style={tab === t ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--text-3)" }}>
              <Clock className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>Žádné záznamy</p>
              <p className="text-[13px] mt-1">Zahajte práci v přehledu nebo u úkolu</p>
            </div>
          ) : (
            <>
              {tab === "task" && (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {taskRows.map((row, i) => {
                    const pct = totalMinutes > 0 ? (row.minutes / totalMinutes) * 100 : 0;
                    const earning = row.hourlyRate ? Math.round((row.minutes / 60) * row.hourlyRate) : null;
                    return (
                      <div key={i} className="px-6 py-4">
                        <div className="flex items-center gap-3 mb-2">
                          {row.categoryColor && (
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.categoryColor }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-semibold line-clamp-1" style={{ color: "var(--text-1)" }}>{row.title}</p>
                            {row.categoryName && (
                              <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>{row.categoryName}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>
                              {formatMinutes(row.minutes)}
                            </p>
                            {earning && (
                              <p className="text-[12px]" style={{ color: "#22C55E" }}>
                                {earning.toLocaleString("cs-CZ")} Kč
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.categoryColor ?? "var(--accent)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "subtask" && (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {subtaskRows.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <p className="text-[13.5px]" style={{ color: "var(--text-3)" }}>
                        Žádný čas zaznamenaný na podúkolech. Spusť sledování podúkolu ve focus módu.
                      </p>
                    </div>
                  ) : (
                    subtaskRows.map((row, i) => {
                      const pct = totalMinutes > 0 ? (row.minutes / totalMinutes) * 100 : 0;
                      return (
                        <div key={i} className="px-6 py-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[13.5px] font-semibold line-clamp-1" style={{ color: "var(--text-1)" }}>{row.title}</p>
                              <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                                {row.taskTitle}{row.rate ? ` · ${row.rate} Kč/h` : ""}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>
                                {formatMinutes(row.minutes)}
                              </p>
                              {row.earning > 0 && (
                                <p className="text-[12px]" style={{ color: "#22C55E" }}>
                                  {row.earning.toLocaleString("cs-CZ")} Kč
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#a855f7" }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {tab === "category" && (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {catRows.map((row, i) => {
                    const pct = totalMinutes > 0 ? Math.round((row.minutes / totalMinutes) * 100) : 0;
                    return (
                      <div key={i} className="px-6 py-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: row.color }} />
                          <span className="text-[13.5px] font-semibold flex-1" style={{ color: "var(--text-1)" }}>{row.name}</span>
                          <span className="text-[11.5px]" style={{ color: "var(--text-3)" }}>{pct}%</span>
                          <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{formatMinutes(row.minutes)}</span>
                          {row.earning > 0 && (
                            <span className="text-[12.5px] font-semibold" style={{ color: "#22C55E" }}>
                              {row.earning.toLocaleString("cs-CZ")} Kč
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "person" && (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {personRows.map((row) => {
                    const pct = totalMinutes > 0 ? Math.round((row.minutes / totalMinutes) * 100) : 0;
                    const isMe = row.userId === session?.user?.id;
                    return (
                      <div key={row.userId} className="px-6 py-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar name={row.name} src={row.avatar} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-semibold flex items-center gap-1.5" style={{ color: "var(--text-1)" }}>
                              {row.name}
                              {isMe && (
                                <span className="text-[10px] font-medium px-1 py-0.5 rounded"
                                  style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>
                                  já
                                </span>
                              )}
                            </p>
                            <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                              {row.tasks.size} {row.tasks.size === 1 ? "úkol" : "úkolů"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>
                              {formatMinutes(row.minutes)}
                            </p>
                            {row.earning > 0 && (
                              <p className="text-[12px]" style={{ color: "#22C55E" }}>
                                {row.earning.toLocaleString("cs-CZ")} Kč
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "status" && (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {statusRows.map((row, i) => {
                    const pct = totalMinutes > 0 ? Math.round((row.minutes / totalMinutes) * 100) : 0;
                    return (
                      <div key={i} className="px-6 py-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[row.status] ?? "#9a9aa2" }} />
                          <span className="text-[13.5px] font-semibold flex-1" style={{ color: "var(--text-1)" }}>
                            {STATUS_LABELS[row.status] ?? row.status}
                          </span>
                          <span className="text-[12px]" style={{ color: "var(--text-3)" }}>{row.count} relací</span>
                          <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>
                            {formatMinutes(row.minutes)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: STATUS_COLORS[row.status] ?? "#9a9aa2" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Raw entries */}
        {entries.length > 0 && (
          <div className="rounded-3xl border overflow-hidden"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
                Záznamy ({entries.length})
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {entries.map((entry) => {
                const d = new Date(entry.startedAt);
                const dateStr = d.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
                const timeStr = d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
                const isMe = entry.userId === session?.user?.id;
                return (
                  <div key={entry.id} className="flex items-center gap-4 px-6 py-3.5">
                    {allUsers && (
                      <Avatar name={(entry.user as any)?.name ?? "?"} src={(entry.user as any)?.avatar} size="sm" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold line-clamp-1" style={{ color: "var(--text-1)" }}>
                        {(entry.task as any)?.title ?? "Neznámý úkol"}
                      </p>
                      <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-3)" }}>
                        {allUsers && !isMe && `${(entry.user as any)?.name} · `}
                        {dateStr} · {timeStr}
                        {(entry as any).subtask && ` · ${(entry as any).subtask.title}`}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>
                      {formatMinutes(entry.durationMinutes ?? 0)}
                    </span>
                    {isMe && (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                        style={{ color: "var(--text-3)" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
