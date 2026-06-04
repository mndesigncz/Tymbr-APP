"use client";

import { useState, useEffect } from "react";

export interface PriorityConfig {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
  isUrgent: boolean;
  isBuiltin: boolean;
}

// Mirrors the API's BUILTIN_DEFAULTS — initial / offline fallback.
export const BUILTIN_PRIORITIES: PriorityConfig[] = [
  { id: "p_low",    key: "low",    label: "Nízká",    color: "#6B7280", order: 0, isUrgent: false, isBuiltin: false },
  { id: "p_med",    key: "medium", label: "Střední",  color: "#3B82F6", order: 1, isUrgent: false, isBuiltin: false },
  { id: "p_high",   key: "high",   label: "Vysoká",   color: "#F97316", order: 2, isUrgent: false, isBuiltin: false },
  { id: "p_urgent", key: "urgent", label: "Urgentní", color: "#EF4444", order: 3, isUrgent: true,  isBuiltin: true  },
];

let cache: PriorityConfig[] | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<(p: PriorityConfig[]) => void>();

function sortByOrder(arr: PriorityConfig[]): PriorityConfig[] {
  return [...arr].sort((a, b) => a.order - b.order);
}

function load(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/teams/priority-config", { cache: "no-store" });
      const data = await res.json();
      cache = Array.isArray(data) && data.length > 0 ? sortByOrder(data) : BUILTIN_PRIORITIES;
    } catch {
      cache = BUILTIN_PRIORITIES;
    }
    listeners.forEach((l) => l(cache!));
    inflight = null;
  })();
  return inflight;
}

/** Force a refetch and notify every subscribed component. */
export function refreshPriorityConfig(): Promise<void> {
  cache = null;
  return load();
}

export function usePriorityConfig(): PriorityConfig[] {
  const [priorities, setPriorities] = useState<PriorityConfig[]>(cache ?? BUILTIN_PRIORITIES);
  useEffect(() => {
    listeners.add(setPriorities);
    if (cache) setPriorities(cache);
    else load();
    return () => { listeners.delete(setPriorities); };
  }, []);
  return priorities;
}

export function priorityLabel(priorities: PriorityConfig[], key: string): string {
  return priorities.find((p) => p.key === key)?.label ?? key;
}

export function priorityColor(priorities: PriorityConfig[], key: string): string {
  return priorities.find((p) => p.key === key)?.color ?? "#6B7280";
}
