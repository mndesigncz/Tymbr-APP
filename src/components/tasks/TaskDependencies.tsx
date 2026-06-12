"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Lock, ArrowRight, X, Plus, Search } from "lucide-react";

interface DepTask { id: string; title: string; status: string; priority: string }
interface Dep { id: string; blocker: DepTask }

const STATUS_COLORS: Record<string, string> = {
  todo: "#6B7280", in_progress: "#3B82F6", review: "#EAB308", done: "#22C55E",
};
const STATUS_LABELS: Record<string, string> = {
  todo: "K provedení", in_progress: "Probíhá", review: "Ke schválení", done: "Hotovo",
};

interface Props { taskId: string; teamId?: string | null }

export function TaskDependencies({ taskId, teamId }: Props) {
  const [blockedBy, setBlockedBy] = useState<Dep[]>([]);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<DepTask[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/dependencies`)
      .then((r) => r.json())
      .then((d) => setBlockedBy(d.blockedBy ?? []));
  }, [taskId]);

  useEffect(() => {
    if (!adding) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.length < 2) { setSuggestions([]); return; }
    setLoadingSug(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      const existing = new Set(blockedBy.map((d) => d.blocker.id));
      setSuggestions((data.tasks ?? []).filter((t: DepTask) => t.id !== taskId && !existing.has(t.id)));
      setLoadingSug(false);
    }, 250);
  }, [search, adding, blockedBy, taskId]);

  const addDep = async (blocker: DepTask) => {
    const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockerId: blocker.id }),
    });
    if (res.ok) {
      const dep = await res.json();
      setBlockedBy((prev) => [...prev, dep]);
      setAdding(false);
      setSearch("");
      setSuggestions([]);
    }
  };

  const removeDep = async (depId: string) => {
    await fetch(`/api/tasks/${taskId}/dependencies`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depId }),
    });
    setBlockedBy((prev) => prev.filter((d) => d.id !== depId));
  };

  const isBlocked = blockedBy.some((d) => d.blocker.status !== "done");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4" style={{ color: isBlocked ? "#ef4444" : "var(--text-3)" }} />
          <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>
            Závislosti
          </span>
          {isBlocked && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: "#ef444420", color: "#ef4444" }}>
              Blokováno
            </span>
          )}
        </div>
        <button onClick={() => setAdding((a) => !a)}
          className="flex items-center gap-1 text-[12px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: "var(--accent)" }}>
          <Plus className="w-3.5 h-3.5" />
          Přidat
        </button>
      </div>

      {/* Blocked by list */}
      {blockedBy.length > 0 && (
        <div className="space-y-1.5">
          {blockedBy.map((dep) => {
            const done = dep.blocker.status === "done";
            return (
              <div key={dep.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: done ? "#22c55e0f" : "#ef44440f", border: `1px solid ${done ? "#22c55e25" : "#ef444425"}` }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLORS[dep.blocker.status] ?? "#6B7280" }} />
                <Link href={`/tasks/${dep.blocker.id}`}
                  className="flex-1 text-[12.5px] font-medium truncate hover:underline"
                  style={{ color: "var(--text-1)" }}>
                  {dep.blocker.title}
                </Link>
                <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-3)" }}>
                  {STATUS_LABELS[dep.blocker.status] ?? dep.blocker.status}
                </span>
                <button onClick={() => removeDep(dep.id)}
                  className="p-0.5 rounded hover:text-red-500 transition-colors flex-shrink-0"
                  style={{ color: "var(--text-3)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add picker */}
      {adding && (
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}>
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hledat blokovací úkol…"
              className="flex-1 bg-transparent outline-none text-[13px]"
              style={{ color: "var(--text-1)" }}
              onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setSearch(""); } }}
            />
          </div>
          {(suggestions.length > 0 || loadingSug) && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-30 shadow-lg"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)" }}>
              {loadingSug && <p className="text-[12px] px-4 py-3" style={{ color: "var(--text-3)" }}>Hledám…</p>}
              {suggestions.map((t) => (
                <button key={t.id} onClick={() => addDep(t)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[var(--hover)]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLORS[t.status] ?? "#6B7280" }} />
                  <span className="flex-1 text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>{t.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {blockedBy.length === 0 && !adding && (
        <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Žádné závislosti</p>
      )}
    </div>
  );
}
