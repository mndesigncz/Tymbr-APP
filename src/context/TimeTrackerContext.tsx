"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

export interface ActiveEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  categoryColor?: string;
  startedAt: string;
  subtaskId?: string | null;
  lastHeartbeatAt?: string | null;
}

// Set when a running timer looks forgotten (no client check-in for a while —
// e.g. the laptop was closed). suggestedEnd is the last confirmed activity.
export interface StaleInfo {
  entryId: string;
  taskTitle: string;
  startedAt: string;
  suggestedEnd: string;
}

interface TimeTrackerState {
  active: ActiveEntry | null;
  elapsed: number;
  isLoading: boolean;
  focusOpen: boolean;
  staleInfo: StaleInfo | null;
  start: (taskId: string, taskTitle: string, categoryColor?: string, subtaskId?: string) => Promise<void>;
  stop: () => Promise<void>;
  openFocus: () => void;
  closeFocus: () => void;
  setActiveSubtask: (subtaskId: string | null) => void;
  resolveStale: (action: "stopAt" | "stopNow" | "keep") => Promise<void>;
}

const TimeTrackerContext = createContext<TimeTrackerState>({
  active: null,
  elapsed: 0,
  isLoading: false,
  focusOpen: false,
  staleInfo: null,
  start: async () => {},
  stop: async () => {},
  openFocus: () => {},
  closeFocus: () => {},
  setActiveSubtask: () => {},
  resolveStale: async () => {},
});

const HEARTBEAT_MS = 60_000;      // check in every minute while running
const STALE_MS = 5 * 60_000;      // no check-in for 5 min ⇒ likely forgotten

export function TimeTrackerProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [staleInfo, setStaleInfo] = useState<StaleInfo | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef<ActiveEntry | null>(null);
  const lastBeatRef = useRef<number>(0);     // ms of the last confirmed check-in
  const stalePendingRef = useRef<boolean>(false);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    fetch("/api/time-entries/active")
      .then((r) => r.json())
      .then((entry) => {
        if (entry?.id) {
          setActive({
            id: entry.id,
            taskId: entry.taskId,
            taskTitle: entry.task?.title ?? "",
            categoryColor: entry.task?.category?.color,
            startedAt: entry.startedAt,
            subtaskId: entry.subtaskId ?? null,
            lastHeartbeatAt: entry.lastHeartbeatAt ?? null,
          });
          // If the last check-in is old, the timer was likely left running.
          const lastBeat = entry.lastHeartbeatAt ? new Date(entry.lastHeartbeatAt).getTime() : null;
          lastBeatRef.current = lastBeat ?? new Date(entry.startedAt).getTime();
          if (lastBeat && Date.now() - lastBeat > STALE_MS) {
            stalePendingRef.current = true;
            setStaleInfo({
              entryId: entry.id,
              taskTitle: entry.task?.title ?? "",
              startedAt: entry.startedAt,
              suggestedEnd: new Date(lastBeat).toISOString(),
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Heartbeat + forgotten-timer detection while a timer runs.
  useEffect(() => {
    if (!active) { stalePendingRef.current = false; return; }
    if (!stalePendingRef.current && lastBeatRef.current === 0) lastBeatRef.current = Date.now();

    const flagStale = () => {
      const cur = activeRef.current;
      if (!cur) return;
      stalePendingRef.current = true;
      setStaleInfo({
        entryId: cur.id,
        taskTitle: cur.taskTitle,
        startedAt: cur.startedAt,
        suggestedEnd: new Date(lastBeatRef.current).toISOString(),
      });
    };

    const beat = () => {
      const cur = activeRef.current;
      if (!cur || stalePendingRef.current) return;
      // A large gap since the last beat means the machine was asleep/closed —
      // background tabs keep firing (throttled) while the machine is awake, so a
      // big gap specifically indicates sleep, not just an inactive tab.
      if (Date.now() - lastBeatRef.current > STALE_MS) { flagStale(); return; }
      fetch("/api/time-entries/heartbeat", { method: "POST" }).catch(() => {});
      lastBeatRef.current = Date.now();
    };

    const id = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => { if (!document.hidden) beat(); };
    const onHide = () => {
      // Best-effort final check-in as the tab/window goes away.
      try { navigator.sendBeacon?.("/api/time-entries/heartbeat"); } catch { /* ignore */ }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onHide);
    beat();

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onHide);
    };
  }, [active]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (active) {
      const calc = () => Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
      setElapsed(calc());
      intervalRef.current = setInterval(() => setElapsed(calc()), 1000);
    } else {
      setElapsed(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);

  const start = useCallback(async (taskId: string, taskTitle: string, categoryColor?: string, subtaskId?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, subtaskId: subtaskId || null }),
      });
      if (res.ok) {
        const entry = await res.json();
        lastBeatRef.current = Date.now();
        stalePendingRef.current = false;
        setStaleInfo(null);
        setActive({ id: entry.id, taskId, taskTitle, categoryColor, startedAt: entry.startedAt, subtaskId: subtaskId || null });
        setFocusOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stop = useCallback(async () => {
    const cur = activeRef.current;
    if (!cur) return;
    setIsLoading(true);
    try {
      await fetch(`/api/time-entries/${cur.id}`, { method: "PATCH" });
      stalePendingRef.current = false;
      setStaleInfo(null);
      setActive(null);
      setFocusOpen(false);
      window.dispatchEvent(new CustomEvent("noisium:task-updated"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Resolve a forgotten-timer prompt.
  const resolveStale = useCallback(async (action: "stopAt" | "stopNow" | "keep") => {
    const info = staleInfo;
    if (!info) return;
    if (action === "keep") {
      stalePendingRef.current = false;
      lastBeatRef.current = Date.now();
      setStaleInfo(null);
      fetch("/api/time-entries/heartbeat", { method: "POST" }).catch(() => {});
      return;
    }
    setIsLoading(true);
    try {
      const body = action === "stopAt" ? { stopAt: info.suggestedEnd } : {};
      await fetch(`/api/time-entries/${info.entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      stalePendingRef.current = false;
      setStaleInfo(null);
      setActive(null);
      setFocusOpen(false);
      window.dispatchEvent(new CustomEvent("noisium:task-updated"));
    } finally {
      setIsLoading(false);
    }
  }, [staleInfo]);

  const setActiveSubtask = useCallback(async (subtaskId: string | null) => {
    const cur = activeRef.current;
    if (!cur) return;
    // Stop current entry and start new one with the subtask
    const taskId = cur.taskId;
    const taskTitle = cur.taskTitle;
    const categoryColor = cur.categoryColor;
    setIsLoading(true);
    try {
      await fetch(`/api/time-entries/${cur.id}`, { method: "PATCH" });
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, subtaskId }),
      });
      if (res.ok) {
        const entry = await res.json();
        lastBeatRef.current = Date.now();
        stalePendingRef.current = false;
        setActive({ id: entry.id, taskId, taskTitle, categoryColor, startedAt: entry.startedAt, subtaskId });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openFocus = useCallback(() => setFocusOpen(true), []);
  const closeFocus = useCallback(() => setFocusOpen(false), []);

  return (
    <TimeTrackerContext.Provider value={{ active, elapsed, isLoading, focusOpen, staleInfo, start, stop, openFocus, closeFocus, setActiveSubtask, resolveStale }}>
      {children}
    </TimeTrackerContext.Provider>
  );
}

export const useTimeTracker = () => useContext(TimeTrackerContext);

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
