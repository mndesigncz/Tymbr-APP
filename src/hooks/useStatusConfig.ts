"use client";

import { useState, useEffect } from "react";

export interface StatusConfig {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
  showInFocus: boolean;
  isBuiltin: boolean;
}

// Mirrors the API's BUILTIN_DEFAULTS — used as the initial / offline fallback so
// the UI always has something to render before the network responds.
export const BUILTIN_STATUSES: StatusConfig[] = [
  { id: "b_todo", key: "todo",        label: "K provedení", color: "#6B7280", order: 0, showInFocus: true,  isBuiltin: true },
  { id: "b_inp",  key: "in_progress", label: "Probíhá",      color: "#3B82F6", order: 1, showInFocus: true,  isBuiltin: true },
  { id: "b_rev",  key: "review",      label: "Ke schválení", color: "#EAB308", order: 2, showInFocus: false, isBuiltin: true },
  { id: "b_done", key: "done",        label: "Hotovo",        color: "#22C55E", order: 3, showInFocus: false, isBuiltin: true },
];

// Module-level cache shared across every component so the config is fetched once
// and a change (reorder, add, edit) instantly propagates everywhere.
let cache: StatusConfig[] | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<(s: StatusConfig[]) => void>();

function sortByOrder(arr: StatusConfig[]): StatusConfig[] {
  return [...arr].sort((a, b) => a.order - b.order);
}

function load(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/teams/status-config", { cache: "no-store" });
      const data = await res.json();
      cache = Array.isArray(data) && data.length > 0 ? sortByOrder(data) : BUILTIN_STATUSES;
    } catch {
      cache = BUILTIN_STATUSES;
    }
    listeners.forEach((l) => l(cache!));
    inflight = null;
  })();
  return inflight;
}

/** Force a refetch and notify every subscribed component. */
export function refreshStatusConfig(): Promise<void> {
  cache = null;
  return load();
}

export function useStatusConfig(): StatusConfig[] {
  const [statuses, setStatuses] = useState<StatusConfig[]>(cache ?? BUILTIN_STATUSES);
  useEffect(() => {
    listeners.add(setStatuses);
    if (cache) setStatuses(cache);
    else load();
    return () => { listeners.delete(setStatuses); };
  }, []);
  return statuses;
}

export function statusLabel(statuses: StatusConfig[], key: string): string {
  return statuses.find((s) => s.key === key)?.label ?? key;
}

export function statusColor(statuses: StatusConfig[], key: string): string {
  return statuses.find((s) => s.key === key)?.color ?? "#6B7280";
}

/** The next status in the configured order, or null if `key` is the last one. */
export function nextStatus(statuses: StatusConfig[], key: string): StatusConfig | null {
  const idx = statuses.findIndex((s) => s.key === key);
  if (idx === -1 || idx >= statuses.length - 1) return null;
  return statuses[idx + 1];
}
