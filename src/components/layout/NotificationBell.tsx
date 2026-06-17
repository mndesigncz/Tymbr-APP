"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, ExternalLink, BellOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatRelative } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  url?: string | null;
  isRead: boolean;
  createdAt: string;
}

type PushState = "loading" | "unsupported" | "denied" | "enabled" | "disabled";

const TYPE_ICONS: Record<string, string> = {
  task_assigned: "📋",
  comment: "💬",
  status_change: "🔄",
  mention: "🔔",
  invitation: "✉️",
};

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output.buffer;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [pushState, setPushState] = useState<PushState>("loading");
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setUnread(data.unread ?? 0);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // Detect push state on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushState(sub ? "enabled" : "disabled"))
      .catch(() => setPushState("unsupported"));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.url) router.push(n.url);
  };

  const enablePush = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushState("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });

      setPushState("enabled");
    } catch {
      setPushState("disabled");
    }
  };

  const disablePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushState("disabled");
    } catch {}
  };

  const showPushFooter = pushState !== "loading" && pushState !== "unsupported";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-[var(--bg-subtle)]"
        style={{ color: "var(--text-2)" }}
        title="Notifikace"
        aria-label="Notifikace"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
            style={{ background: "var(--accent)" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl border overflow-hidden z-50 glass-strong animate-scale-in"
          style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-[14px] font-bold" style={{ color: "var(--text-1)" }}>Notifikace</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[12px] font-medium transition-opacity hover:opacity-70" style={{ color: "var(--accent)" }}>
                <Check className="w-3.5 h-3.5" />
                Označit vše jako přečtené
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-3)" }} />
                <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Žádné notifikace</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--hover)] border-b"
                  style={{ borderColor: "var(--border)", background: n.isRead ? "transparent" : "color-mix(in srgb, var(--accent) 4%, transparent)" }}
                >
                  <span className="text-[18px] flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-snug line-clamp-1" style={{ color: "var(--text-1)" }}>{n.title}</p>
                    {n.body && <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: "var(--text-3)" }}>{n.body}</p>}
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>{formatRelative(n.createdAt)}</p>
                  </div>
                  {n.url && <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 mt-1 opacity-30" style={{ color: "var(--text-3)" }} />}
                  {!n.isRead && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: "var(--accent)" }} />}
                </button>
              ))
            )}
          </div>

          {/* Push notification toggle footer */}
          {showPushFooter && (
            <div className="px-4 py-3 border-t flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
              {pushState === "denied" ? (
                <>
                  <BellOff className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                  <p className="text-[11.5px] flex-1" style={{ color: "var(--text-3)" }}>Push notifikace jsou zakázány v prohlížeči</p>
                </>
              ) : pushState === "enabled" ? (
                <>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#22C55E" }} />
                  <span className="text-[11.5px] flex-1" style={{ color: "var(--text-2)" }}>Push notifikace zapnuty</span>
                  <button
                    onClick={disablePush}
                    className="text-[11.5px] font-medium transition-opacity hover:opacity-70"
                    style={{ color: "var(--text-3)" }}
                  >
                    Vypnout
                  </button>
                </>
              ) : (
                <button
                  onClick={enablePush}
                  className="flex items-center gap-2 w-full text-[12px] font-semibold transition-opacity hover:opacity-80"
                  style={{ color: "var(--accent)" }}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Zapnout push notifikace
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
