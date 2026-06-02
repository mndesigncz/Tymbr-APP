"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskCard } from "@/components/tasks/TaskCard";
import { StartWorkButton } from "@/components/layout/StartWorkButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Task, TaskStatus } from "@/types";
import { Plus, LayoutGrid, List, Search, SlidersHorizontal, X, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const STATUS_OPTS = [
  { value: "", label: "Všechny statusy" },
  { value: "todo", label: "K provedení" },
  { value: "in_progress", label: "Probíhá" },
  { value: "review", label: "Ke schválení" },
];

const PRIORITY_OPTS = [
  { value: "", label: "Všechny priority" },
  { value: "low", label: "Nízká" },
  { value: "medium", label: "Střední" },
  { value: "high", label: "Vysoká" },
  { value: "urgent", label: "Urgentní" },
];

type DateRange = "today" | "week" | "month" | "year" | "custom";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: "Dnes",
  week: "Týden",
  month: "Měsíc",
  year: "Rok",
  custom: "Vlastní",
};

function getDateRange(range: DateRange, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now); to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  if (range === "today") from.setHours(0, 0, 0, 0);
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

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function TasksContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const initialTab = searchParams.get("tab") === "done" ? "done" : "active";
  const [tab, setTab] = useState<"active" | "done">(initialTab);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [scope, setScope] = useState<"all" | "mine">("mine");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: searchParams.get("status") || "",
    priority: "",
    categoryId: searchParams.get("categoryId") || "",
  });
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);

  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const myId = (session?.user as any)?.id;

  const fetchActive = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (scope === "mine" && myId) params.set("assigneeId", myId);

    // Also pull tasks completed today so the "Hotovo" column isn't empty
    const doneParams = new URLSearchParams(params);
    doneParams.set("status", "done");
    doneParams.set("completedFrom", startOfToday().toISOString());

    const [activeRes, doneRes] = await Promise.all([
      fetch(`/api/tasks?${params}`).then((r) => r.json()),
      fetch(`/api/tasks?${doneParams}`).then((r) => r.json()),
    ]);

    const activeTasks = Array.isArray(activeRes) ? activeRes.filter((t: Task) => t.status !== "done") : [];
    const doneToday = Array.isArray(doneRes) ? doneRes : [];
    setTasks([...activeTasks, ...doneToday]);
    setLoading(false);
  }, [filters, scope, myId]);

  const fetchDone = useCallback(async () => {
    setLoading(true);
    const { from, to } = getDateRange(dateRange, customFrom, customTo);
    const params = new URLSearchParams();
    params.set("status", "done");
    params.set("completedFrom", from.toISOString());
    params.set("completedTo", to.toISOString());
    if (filters.search) params.set("search", filters.search);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    const res = await fetch(`/api/tasks?${params}`);
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [dateRange, customFrom, customTo, filters.search, filters.categoryId]);

  useEffect(() => {
    if (tab === "active") fetchActive();
    else fetchDone();
  }, [tab, fetchActive, fetchDone]);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(Array.isArray(d) ? d : []));
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      // Keep done-today visible; just update in place
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    }
  };

  const activeFiltersCount = [filters.status, filters.priority].filter(Boolean).length;

  return (
    <div>
      <Header
        title="Úkoly"
        subtitle="Sdílená nástěnka celého týmu"
        actions={
          <div className="flex items-center gap-2">
            <StartWorkButton />
            <Link href="/tasks/new">
              <Button icon={<Plus className="w-4 h-4" />}>
                <span className="hidden sm:inline">Nový úkol</span>
              </Button>
            </Link>
          </div>
        }
      />

      <div className="px-6 lg:px-8 pt-2 pb-12 space-y-5">
        {/* Toggles row: Moje/Všechny + Aktivní/Hotové + search */}
        <div className="flex flex-wrap items-center gap-3">
          {tab === "active" && (
            <div className="flex items-center gap-1 p-1 rounded-xl border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
              <button
                onClick={() => setScope("mine")}
                className="px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all"
                style={scope === "mine" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}
              >
                Moje
              </button>
              <button
                onClick={() => setScope("all")}
                className="px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all"
                style={scope === "all" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}
              >
                Všechny
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 p-1 rounded-xl border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
            <button
              onClick={() => setTab("active")}
              className="px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={tab === "active" ? { background: "var(--text-1)", color: "#fff" } : { color: "var(--text-2)" }}
            >
              Aktivní
            </button>
            <button
              onClick={() => setTab("done")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={tab === "done" ? { background: "#22C55E", color: "#fff" } : { color: "var(--text-2)" }}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Hotové
            </button>
          </div>

          {/* Shorter search */}
          <div className="w-full sm:w-56">
            <Input
              placeholder="Hledat..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          {tab === "active" && (
            <>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-medium border transition-all hover:bg-black/[0.03]"
                style={showFilters || activeFiltersCount > 0
                  ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }
                  : { background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filtry</span>
                {activeFiltersCount > 0 && (
                  <span className="text-white text-[11px] font-semibold w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: "var(--accent)" }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1 rounded-xl p-1 border ml-auto"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
                <button onClick={() => setView("kanban")} className="p-2 rounded-lg transition-all"
                  style={view === "kanban" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-3)" }}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setView("list")} className="p-2 rounded-lg transition-all"
                  style={view === "list" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-3)" }}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Done tab: date range chips */}
        {tab === "done" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((r) => (
                <button key={r} onClick={() => setDateRange(r)}
                  className="px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all"
                  style={dateRange === r
                    ? { background: "#22C55E15", color: "#22C55E", borderColor: "#22C55E" }
                    : { background: "var(--bg-card)", color: "var(--text-2)", borderColor: "var(--border-md)" }}>
                  {DATE_RANGE_LABELS[r]}
                </button>
              ))}
            </div>
            {dateRange === "custom" && (
              <div className="flex gap-3 max-w-md">
                <Input type="date" label="Od" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                <Input type="date" label="Do" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {/* Active tab: category chips + filters */}
        {tab === "active" && (
          <>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilters((f) => ({ ...f, categoryId: "" }))}
                  className="px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all"
                  style={!filters.categoryId
                    ? { background: "var(--text-1)", color: "#fff", borderColor: "var(--text-1)" }
                    : { background: "var(--bg-card)", color: "var(--text-2)", borderColor: "var(--border-md)" }}>
                  Vše
                </button>
                {categories.map((cat) => (
                  <button key={cat.id}
                    onClick={() => setFilters((f) => ({ ...f, categoryId: f.categoryId === cat.id ? "" : cat.id }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all"
                    style={filters.categoryId === cat.id
                      ? { background: `${cat.color}18`, color: cat.color, borderColor: cat.color }
                      : { background: "var(--bg-card)", color: "var(--text-2)", borderColor: "var(--border-md)" }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {showFilters && (
              <div className="flex flex-wrap gap-3 rounded-2xl border p-4"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex-1 min-w-36">
                  <Select options={STATUS_OPTS} value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} />
                </div>
                <div className="flex-1 min-w-36">
                  <Select options={PRIORITY_OPTS} value={filters.priority}
                    onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} />
                </div>
                {activeFiltersCount > 0 && (
                  <button onClick={() => setFilters((f) => ({ ...f, status: "", priority: "" }))}
                    className="flex items-center gap-1 text-[13px] font-medium hover:text-red-500 transition-colors px-2"
                    style={{ color: "var(--text-3)" }}>
                    <X className="w-4 h-4" /> Vymazat
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : tab === "done" ? (
          <div className="space-y-3">
            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: "var(--text-3)" }}>
                <CheckCheck className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>Žádné hotové úkoly</p>
                <p className="text-[13px] mt-1">za vybrané období</p>
              </div>
            )}
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} compact />
            ))}
          </div>
        ) : view === "kanban" ? (
          <KanbanBoard tasks={tasks} onStatusChange={handleStatusChange} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {tasks.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-24" style={{ color: "var(--text-3)" }}>
                <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>Žádné úkoly</p>
                <Link href="/tasks/new" className="mt-4">
                  <Button icon={<Plus className="w-4 h-4" />}>Nový úkol</Button>
                </Link>
              </div>
            )}
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onStatusAdvance={handleStatusChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense>
      <TasksContent />
    </Suspense>
  );
}
