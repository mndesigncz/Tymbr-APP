"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Clock, TrendingUp, CheckSquare, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import type { TimeEntry } from "@/types";

type DateRange = "today" | "week" | "month" | "year" | "custom";
type ReportTab = "task" | "category" | "status";

const DATE_LABELS: Record<DateRange, string> = {
  today: "Dnes",
  week: "Tento týden",
  month: "Tento měsíc",
  year: "Tento rok",
  custom: "Vlastní",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "K provedení",
  in_progress: "Probíhá",
  review: "Ke schválení",
  done: "Hotovo",
};

function getRange(range: DateRange, customFrom: string, customTo: string) {
  const now = new Date();
  const to = new Date(now); to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  if (range === "today") { from.setHours(0, 0, 0, 0); }
  else if (range === "week") { from.setDate(from.getDate() - 7); from.setHours(0,0,0,0); }
  else if (range === "month") { from.setMonth(from.getMonth() - 1); from.setHours(0,0,0,0); }
  else if (range === "year") { from.setFullYear(from.getFullYear() - 1); from.setHours(0,0,0,0); }
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

function calcEarning(minutes: number, rate?: number | null) {
  if (!rate) return null;
  return Math.round((minutes / 60) * rate);
}

export default function TimePage() {
  const [range, setRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ReportTab>("task");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { from, to } = getRange(range, customFrom, customTo);
    const params = new URLSearchParams({
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
    });
    const res = await fetch(`/api/time-entries?${params}`);
    const data = await res.json();
    setEntries(Array.isArray(data) ? data.filter((e: TimeEntry) => e.stoppedAt) : []);
    setLoading(false);
  }, [range, customFrom, customTo]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const totalMinutes = entries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
  const totalEarning = entries.reduce((s, e) => {
    const rate = (e.task as any)?.hourlyRate;
    if (!rate) return s;
    return s + Math.round(((e.durationMinutes ?? 0) / 60) * rate);
  }, 0);
  const uniqueTasks = new Set(entries.map((e) => e.taskId)).size;

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
    const rate = (e.task as any)?.hourlyRate;
    if (rate) acc[name].earning += Math.round(((e.durationMinutes ?? 0) / 60) * rate);
    return acc;
  }, {} as Record<string, { name: string; color: string; minutes: number; earning: number }>);

  const catRows = Object.values(byCat).sort((a, b) => b.minutes - a.minutes);

  // Group by status
  const byStatus = entries.reduce((acc, e) => {
    const s = (e.task as any)?.status ?? "todo";
    if (!acc[s]) acc[s] = { status: s, minutes: 0, count: 0 };
    acc[s].minutes += e.durationMinutes ?? 0;
    acc[s].count += 1;
    return acc;
  }, {} as Record<string, { status: string; minutes: number; count: number }>);

  const statusRows = Object.values(byStatus).sort((a, b) => b.minutes - a.minutes);

  return (
    <div>
      <Header title="Výkazy práce" subtitle="Přehled odpracovaného času a výdělků" />

      <div className="px-6 lg:px-8 pt-2 pb-12 space-y-6">
        {/* Date range picker */}
        <div className="flex flex-wrap gap-2 items-center">
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
        {range === "custom" && (
          <div className="flex gap-3 max-w-xs">
            <Input type="date" label="Od" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <Input type="date" label="Do" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="rounded-3xl p-6 flex flex-col gap-5 border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "#3B82F615" }}>
              <Clock className="w-5 h-5" style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <p className="text-[28px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
                {formatMinutes(totalMinutes)}
              </p>
              <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>Celkem odpracováno</p>
            </div>
          </div>

          <div className="rounded-3xl p-6 flex flex-col gap-5 border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "#22C55E15" }}>
              <TrendingUp className="w-5 h-5" style={{ color: "#22C55E" }} />
            </div>
            <div>
              <p className="text-[28px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
                {totalEarning > 0 ? `${totalEarning.toLocaleString("cs-CZ")} Kč` : "—"}
              </p>
              <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>Celkový výdělek</p>
            </div>
          </div>

          <div className="rounded-3xl p-6 flex flex-col gap-5 border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "#F7592F15" }}>
              <CheckSquare className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p className="text-[28px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>{uniqueTasks}</p>
              <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>Úkolů s časem</p>
            </div>
          </div>
        </div>

        {/* Report tabs */}
        <div className="rounded-3xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-1 p-2 border-b" style={{ borderColor: "var(--border)" }}>
            {(["task", "category", "status"] as ReportTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
                style={tab === t
                  ? { background: "var(--accent)", color: "#fff" }
                  : { color: "var(--text-2)" }}
              >
                {t === "task" ? "Podle úkolu" : t === "category" ? "Podle kategorie" : "Podle stavu"}
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
              <p className="text-[13px] mt-1">Zahajte práci v postranním panelu</p>
            </div>
          ) : (
            <>
              {tab === "task" && (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {taskRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                      {row.categoryColor && (
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.categoryColor }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold line-clamp-1" style={{ color: "var(--text-1)" }}>
                          {row.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {row.categoryName && (
                            <span className="text-[11.5px]" style={{ color: "var(--text-3)" }}>{row.categoryName}</span>
                          )}
                          <span className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                            {STATUS_LABELS[row.status] ?? row.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>
                          {formatMinutes(row.minutes)}
                        </p>
                        {calcEarning(row.minutes, row.hourlyRate) && (
                          <p className="text-[12px]" style={{ color: "#22C55E" }}>
                            {calcEarning(row.minutes, row.hourlyRate)!.toLocaleString("cs-CZ")} Kč
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
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
                          <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{formatMinutes(row.minutes)}</span>
                          {row.earning > 0 && (
                            <span className="text-[12.5px] font-semibold" style={{ color: "#22C55E" }}>
                              {row.earning.toLocaleString("cs-CZ")} Kč
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: row.color }} />
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
                    const colors: Record<string, string> = {
                      todo: "#6B7280", in_progress: "#3B82F6", review: "#EAB308", done: "#22C55E",
                    };
                    return (
                      <div key={i} className="px-6 py-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: colors[row.status] ?? "#9a9aa2" }} />
                          <span className="text-[13.5px] font-semibold flex-1" style={{ color: "var(--text-1)" }}>
                            {STATUS_LABELS[row.status] ?? row.status}
                          </span>
                          <span className="text-[12px]" style={{ color: "var(--text-3)" }}>{row.count} záznamů</span>
                          <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>
                            {formatMinutes(row.minutes)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[row.status] ?? "#9a9aa2" }} />
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
                return (
                  <div key={entry.id} className="flex items-center gap-4 px-6 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold line-clamp-1" style={{ color: "var(--text-1)" }}>
                        {(entry.task as any)?.title ?? "Neznámý úkol"}
                      </p>
                      <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-3)" }}>
                        {dateStr} · {timeStr}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>
                      {formatMinutes(entry.durationMinutes ?? 0)}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                      style={{ color: "var(--text-3)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
