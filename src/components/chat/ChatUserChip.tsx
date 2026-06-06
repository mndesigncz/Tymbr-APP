"use client";

import { useState, useEffect } from "react";

interface UserInfo {
  id: string;
  name: string;
  avatar?: string | null;
}

const userCache = new Map<string, UserInfo | null>();

export function ChatUserChip({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserInfo | null | undefined>(
    userCache.has(userId) ? userCache.get(userId) : undefined
  );

  useEffect(() => {
    if (userCache.has(userId)) {
      setUser(userCache.get(userId));
      return;
    }
    let cancelled = false;
    fetch(`/api/users/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UserInfo | null) => {
        const val = data?.id ? data : null;
        userCache.set(userId, val);
        if (!cancelled) setUser(val);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (user === undefined) {
    return (
      <span className="inline-block w-20 h-4 rounded align-middle animate-pulse"
        style={{ background: "var(--border-md)" }} />
    );
  }

  if (user === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-semibold align-middle"
        style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>
        @smazaný uživatel
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12.5px] font-semibold align-middle"
      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
    >
      @{user.name.split(" ")[0]}
    </span>
  );
}
