"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskCard } from "@/components/tasks/TaskCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Task, TaskStatus } from "@/types";
import { Plus, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const STATUS_OPTS = [
  { value: "", label: "Všechny statusy" },
  { value: "todo", label: "K provedení" },
  { value: "in_progress", label: "Probíhá" },
  { value: "review", label: "Ke schválení" },
  { value: "done", label: "Hotovo" },
];

const PRIORITY_OPTS = [
  { value: "", label: "Všechny priority" },
  { value: "low", label: "Nízká" },
  { value: "medium", label: "Střední" },
  { value: "high", label: "Vysoká" },
  { value: "urgent", label: "Urgentní" },
];

function TasksContent() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: searchParams.get("status") || "",
    priority: "",
    categoryId: searchParams.get("categoryId") || "",
  });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);

    const res = await fetch(`/api/tasks?${params}`);
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

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
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    }
  };

  const catOptions = [
    { value: "", label: "Všechny kategorie" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const activeFiltersCount = [filters.status, filters.priority, filters.categoryId].filter(Boolean).length;

  return (
    <div>
      <Header
        title="Úkoly"
        subtitle="Sdílená nástěnka týmu"
        actions={
          <Link href="/tasks/new">
            <Button icon={<Plus className="w-4 h-4" />} size="sm">
              <span className="hidden sm:inline">Nový úkol</span>
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-48">
            <Input
              placeholder="Hledat úkoly..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              showFilters || activeFiltersCount > 0
                ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                : "bg-[#1a1a1a] border-[#2d2d2d] text-gray-400 hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtry
            {activeFiltersCount > 0 && (
              <span className="bg-orange-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl p-1">
            <button
              onClick={() => setView("kanban")}
              className={`p-1.5 rounded-lg transition-all ${view === "kanban" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-lg transition-all ${view === "list" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-4">
            <div className="flex-1 min-w-36">
              <Select
                options={STATUS_OPTS}
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                placeholder="Status"
              />
            </div>
            <div className="flex-1 min-w-36">
              <Select
                options={PRIORITY_OPTS}
                value={filters.priority}
                onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
                placeholder="Priorita"
              />
            </div>
            <div className="flex-1 min-w-36">
              <Select
                options={catOptions}
                value={filters.categoryId}
                onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
                placeholder="Kategorie"
              />
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => setFilters({ search: filters.search, status: "", priority: "", categoryId: "" })}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors px-2"
              >
                <X className="w-4 h-4" />
                Vymazat filtry
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === "kanban" ? (
          <KanbanBoard tasks={tasks} onStatusChange={handleStatusChange} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {tasks.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                <CheckSquareIcon className="w-12 h-12 mb-3 text-gray-700" />
                <p className="text-lg font-medium">Žádné úkoly</p>
                <p className="text-sm mt-1">Vytvořte první úkol kliknutím na tlačítko</p>
                <Link href="/tasks/new" className="mt-4">
                  <Button icon={<Plus className="w-4 h-4" />}>Nový úkol</Button>
                </Link>
              </div>
            )}
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function TasksPage() {
  return (
    <Suspense>
      <TasksContent />
    </Suspense>
  );
}
