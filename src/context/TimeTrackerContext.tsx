"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

export interface ActiveEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  categoryColor?: string;
  startedAt: string;
  subtaskId?: string | null;
}

interface TimeTrackerState {
  active: ActiveEntry | null;
  elapsed: number;
  isLoading: boolean;
  focusOpen: boolean;
  start: (taskId: string, taskTitle: string, categoryColor?: string, subtaskId?: string) => Promise<void>;
  stop: () => Promise<void>;
  openFocus: () => void;
  closeFocus: () => void;
  setActiveSubtask: (subtaskId: string | null) => void;
}

const TimeTrackerContext = createContext<TimeTrackerState>({
  active: null,
  elapsed: 0,
  isLoading: false,
  focusOpen: false,
  start: async () => {},
  stop: async () => {},
  openFocus: () => {},
  closeFocus: () => {},
  setActiveSubtask: () => {},
});

export function TimeTrackerProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef<ActiveEntry | null>(null);

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
          });
        }
      })
      .catch(() => {});
  }, []);

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
      setActive(null);
      setFocusOpen(false);
      window.dispatchEvent(new CustomEvent("noisium:task-updated"));
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        setActive({ id: entry.id, taskId, taskTitle, categoryColor, startedAt: entry.startedAt, subtaskId });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openFocus = useCallback(() => setFocusOpen(true), []);
  const closeFocus = useCallback(() => setFocusOpen(false), []);

  return (
    <TimeTrackerContext.Provider value={{ active, elapsed, isLoading, focusOpen, start, stop, openFocus, closeFocus, setActiveSubtask }}>
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
