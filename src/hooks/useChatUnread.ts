"use client";

import { useState, useEffect, useCallback } from "react";

// Returns true when there are team chat messages newer than the last visit.
// Uses localStorage to persist the last-visit timestamp across sessions.
export function useChatUnread(): boolean {
  const [hasUnread, setHasUnread] = useState(false);

  const check = useCallback(async () => {
    try {
      const lastVisit = localStorage.getItem("chatLastVisit");
      if (!lastVisit) {
        // First visit — mark now, no badge
        localStorage.setItem("chatLastVisit", new Date().toISOString());
        return;
      }
      const params = new URLSearchParams({ since: lastVisit });
      const res = await fetch(`/api/chat?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setHasUnread(Array.isArray(data) && data.length > 0);
    } catch {
      // Network errors are silently ignored
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [check]);

  return hasUnread;
}
