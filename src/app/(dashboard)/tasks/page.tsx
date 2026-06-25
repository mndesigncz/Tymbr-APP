"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskCard } from "@/components/tasks/TaskCard";
import { SubtaskListCard } from "@/components/tasks/SubtaskListCard";
import { Avatar } from "@/components/ui/Avatar";
import { StartWorkButton } from "@/components/layout/StartWorkButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Task } from "@/types";
import { Plus, LayoutGrid, List, Search, SlidersHorizontal, X, CheckCheck, ChevronDown, Trash2, Square, CheckSquare2, Download } from "lucide-react";
import { exportTasksToPdf } from "@/lib/exportPdf";
import { useStatusConfig } from "@/hooks/useStatusConfig";
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
type Scope = "mine" | "all" | "pick";

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
  const { data: session, status: sessionStatus } = useSession();
  const statuses = useStatusConfig();

  const initialTab = searchParams.get("tab") === "done" ? "done" : "active";
  const [tab, setTab] = useState<"active" | "done">(initialTab);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [scope, setScope] = useState<Scope>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    priority: "",
    categoryId: searchParams.get("categoryId") || "",
  });
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; avatar?: string | null }[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [pickDropOpen, setPickDropOpen] = useState(false);
  const pickRef = useRef<HTMLDivElement>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting || tasks.length === 0) return;
    setExporting(true);
    try {
      const label = tab === "done" ? "Hotové úkoly" : "Aktivní úkoly";
      await exportTasksToPdf(tasks, label);
    } finally {
      setExporting(false);
    }
  };

  const myId = session?.user?.id;

  // Close pick dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickRef.current && !pickRef.current.contains(e.target as Node)) setPickDropOpen(false);
    };
    if (pickDropOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickDropOpen]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);

      if (scope === "pick" && selectedMembers.size > 0) {
        params.set("assigneeIds", [...selectedMembers].join(","));
      } else if (scope === "mine" && myId) {
        params.set("assigneeId", myId);
      }

      const doneParams = new URLSearchParams(params);
      doneParams.set("status", "done");
      doneParams.set("completedFrom", startOfToday().toISOString());

      const safeJson = async (r: Response) => {
        const text = await r.text();
        try { return JSON.parse(text); } catch { return null; }
      };

      const [activeR, doneR] = await Promise.all([
        fetch(`/api/tasks?${params}`),
        fetch(`/api/tasks?${doneParams}`),
      ]);

      const [activeRes, doneRes] = await Promise.all([safeJson(activeR), safeJson(doneR)]);

      if (!Array.isArray(activeRes)) {
        const msg = activeRes?.error ?? `HTTP ${activeR.status}`;
        console.error("[fetchActive] server error:", msg);
        throw new Error(msg);
      }

      const activeTasks = activeRes.filter((t: Task) => t.status !== "done");
      const doneToday = Array.isArray(doneRes) ? doneRes : [];
      setTasks([...activeTasks, ...doneToday]);
    } catch (e) {
      console.error("[fetchActive]", e);
      setFetchError("Nepodařilo se načíst úkoly. Zkus to znovu.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filters, scope, myId, selectedMembers]);

  const fetchDone = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { from, to } = getDateRange(dateRange, customFrom, customTo);
      const params = new URLSearchParams();
      params.set("status", "done");
      params.set("completedFrom", from.toISOString());
      params.set("completedTo", to.toISOString());
      if (filters.search) params.set("search", filters.search);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      const res = await fetch(`/api/tasks?${params}`);
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(`HTTP ${res.status}: non-JSON response`); }
      if (!Array.isArray(data)) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setTasks(data);
    } catch (e) {
      console.error("[fetchDone]", e);
      setFetchError("Nepodařilo se načíst úkoly. Zkus to znovu.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customFrom, customTo, filters.search, filters.categoryId]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (tab === "active") fetchActive();
    else fetchDone();
  }, [tab, fetchActive, fetchDone, sessionStatus]);

  useEffect(() => {
    const handler = () => { if (tab === "active") fetchActive(); };
    window.addEventListener("noisium:task-updated", handler);
    return () => window.removeEventListener("noisium:task-updated", handler);
  }, [tab, fetchActive]);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(Array.isArray(d) ? d : []));
    fetch("/api/users").then((r) => r.json()).then((d) => setMembers(Array.isArray(d) ? d : []));
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    }
  };

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectAll = () => setSelected(new Set(tasks.map((t) => t.id)));
  const clearSelect = () => setSelected(new Set());

  const handleBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    await Promise.all([...selected].map((id) => handleStatusChange(id, bulkStatus)));
    clearSelect();
    setBulkStatus("");
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0 || !confirm(`Smazat ${selected.size} úkolů?`)) return;
    await Promise.all([...selected].map((id) => fetch(`/api/tasks/${id}`, { method: "DELETE" })));
    setTasks((prev) => prev.filter((t) => !selected.has(t.id)));
    clearSelect();
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeFiltersCount = [filters.status, filters.priority].filter(Boolean).length;

  const pickLabel = scope === "pick" && selectedMembers.size > 0
    ? `${selectedMembers.size} ${selectedMembers.size === 1 ? "osoba" : selectedMembers.size < 5 ? "osoby" : "osob"}`
    : "Výběr";

  return (
    <div>
      <Header
        title="Úkoly"
        subtitle="Sdílená nástěnka celého týmu"
        actions={
          <div className="flex items-center gap-2">
            <StartWorkButton />
            <button
              onClick={handleExport}
              disabled={exporting || tasks.length === 0}
              title="Exportovat do PDF"
              aria-label="Exportovat do PDF"
              className="p-2.5 rounded-xl border transition-colors hover:bg-[var(--hover)] disabled:opacity-40"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}
            >
              <Download className="w-4 h-4" />
            </button>
            <Link href="/tasks/new">
              <Button icon={<Plus className="w-4 h-4" />}>
                <span>Nový úkol</span>
              </Button>
            </Link>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-5">
        {/* Main toolbar */}
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-2.5">
          {/* Toggles row — always: Active/Done first, then scope — scrolls horizontally on small screens */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 lg:flex-shrink-0">
          {/* Active / Done — always first so position never jumps */}
          <div className="flex items-center gap-1 p-1 rounded-xl border flex-shrink-0"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
            <button onClick={() => setTab("active")}
              className="px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={tab === "active" ? { background: "var(--btn-invert-bg)", color: "var(--btn-invert-text)" } : { color: "var(--text-2)" }}>
              Aktivní
            </button>
            <button onClick={() => setTab("done")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={tab === "done" ? { background: "#22C55E", color: "#fff" } : { color: "var(--text-2)" }}>
              <CheckCheck className="w-3.5 h-3.5" />
              Hotové
            </button>
          </div>

          {/* Scope: Moje / Všechny / Výběr — only in active tab */}
          {tab === "active" && (
            <div className="flex items-center gap-1 p-1 rounded-xl border flex-shrink-0"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
              {(["mine", "all"] as const).map((s) => (
                <button key={s}
                  onClick={() => { setScope(s); setSelectedMembers(new Set()); }}
                  className="px-3 py-2 rounded-lg text-[13px] font-semibold transition-all"
                  style={scope === s ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}>
                  {s === "mine" ? "Moje" : "Všechny"}
                </button>
              ))}
              {/* Pick dropdown */}
              <div ref={pickRef} className="relative">
                <button
                  onClick={() => { setScope("pick"); setPickDropOpen((o) => !o); }}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all"
                  style={scope === "pick"
                    ? { background: "var(--accent)", color: "#fff" }
                    : { color: "var(--text-2)" }}>
                  {pickLabel}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {pickDropOpen && members.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 z-50 rounded-2xl border py-1.5 min-w-[180px]"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,0.1))" }}>
                    {members.map((m) => (
                      <label key={m.id}
                        className="flex items-center gap-2.5 px-3.5 py-2 cursor-pointer hover:bg-[var(--hover)] transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(m.id)}
                          onChange={() => toggleMember(m.id)}
                          className="w-3.5 h-3.5 rounded accent-[var(--accent)]"
                        />
                        <Avatar name={m.name} src={m.avatar} size="xs" />
                        <span className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
                          {m.name.split(" ")[0]}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>

          {/* Search */}
          <div className="lg:flex-1 lg:min-w-[160px]">
            <Input
              placeholder="Hledat..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Filtry + View */}
          {tab === "active" && (
            <div className="flex items-center justify-between gap-2 lg:justify-start lg:flex-shrink-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium border transition-all hover:bg-[var(--hover)]"
                style={showFilters || activeFiltersCount > 0
                  ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }
                  : { background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filtry</span>
                {activeFiltersCount > 0 && (
                  <span className="text-white text-[11px] font-semibold w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: "var(--accent)" }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1 rounded-xl p-1 border"
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
            </div>
          )}
        </div>

        {/* Done date range */}
        {tab === "done" && (
          <div className="space-y-3">
            <div className="flex gap-2 items-center overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 lg:flex-wrap">
              {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((r) => (
                <button key={r} onClick={() => setDateRange(r)}
                  className="px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all whitespace-nowrap flex-shrink-0"
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

        {/* Active: category chips + filter panel */}
        {tab === "active" && (
          <>
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 lg:flex-wrap">
                <button onClick={() => setFilters((f) => ({ ...f, categoryId: "" }))}
                  className="px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all whitespace-nowrap flex-shrink-0"
                  style={!filters.categoryId
                    ? { background: "var(--btn-invert-bg)", color: "var(--btn-invert-text)", borderColor: "var(--btn-invert-bg)" }
                    : { background: "var(--bg-card)", color: "var(--text-2)", borderColor: "var(--border-md)" }}>
                  Vše
                </button>
                {categories.map((cat) => (
                  <button key={cat.id}
                    onClick={() => setFilters((f) => ({ ...f, categoryId: f.categoryId === cat.id ? "" : cat.id }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all whitespace-nowrap flex-shrink-0"
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
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>{fetchError}</p>
            <button onClick={() => tab === "active" ? fetchActive() : fetchDone()}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: "var(--accent)" }}>
              Zkusit znovu
            </button>
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
          <KanbanBoard tasks={tasks} currentUserId={myId} onStatusChange={handleStatusChange} />
        ) : (
          <>
            {tasks.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <button
                  onClick={selected.size === tasks.length ? clearSelect : selectAll}
                  className="flex items-center gap-2 text-[13px] font-medium transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-2)" }}>
                  {selected.size === tasks.length
                    ? <CheckSquare2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    : <Square className="w-4 h-4" />}
                  {selected.size === tasks.length ? "Zrušit výběr" : "Vybrat vše"}
                </button>
                {selected.size > 0 && (
                  <span className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
                    {selected.size} vybráno
                  </span>
                )}
              </div>
            )}
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
                <div key={task.id} className="flex flex-col">
                  <div className="relative group">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(task.id); }}
                      className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={selected.has(task.id) ? { opacity: 1 } : {}}>
                      {selected.has(task.id)
                        ? <CheckSquare2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
                        : <Square className="w-5 h-5" style={{ color: "var(--text-3)" }} />}
                    </button>
                    <div className="rounded-2xl transition-shadow"
                      style={selected.has(task.id) ? { boxShadow: "0 0 0 2px var(--accent)" } : {}}>
                      <TaskCard task={task} currentUserId={myId} />
                    </div>
                  </div>
                  {/* Subtask cards — visually connected to parent */}
                  {(task.subtasks ?? []).length > 0 && (
                    <div className="relative ml-5 mt-1.5 flex flex-col gap-1.5 pl-4"
                      style={{ borderLeft: "2px solid var(--border-md)" }}>
                      {(task.subtasks ?? []).map((st) => (
                        <SubtaskListCard key={st.id} subtask={st} parentTaskId={task.id} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Floating bulk toolbar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
          <span className="text-[13px] font-semibold mr-1" style={{ color: "var(--text-1)" }}>
            {selected.size} vybráno
          </span>
          <button onClick={clearSelect} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
            style={{ color: "var(--text-3)" }}>
            <X className="w-4 h-4" />
          </button>
          <div className="w-px h-5 mx-1" style={{ background: "var(--border-md)" }} />
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="text-[13px] font-medium rounded-xl px-3 py-1.5 border outline-none"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }}>
            <option value="">Status...</option>
            {statuses.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          {bulkStatus && (
            <button onClick={handleBulkStatus}
              className="px-3 py-1.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: "var(--accent)" }}>
              Použít
            </button>
          )}
          <div className="w-px h-5 mx-1" style={{ background: "var(--border-md)" }} />
          <button onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-colors hover:bg-red-50"
            style={{ color: "#ef4444" }}>
            <Trash2 className="w-4 h-4" />
            Smazat
          </button>
        </div>
      )}
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
