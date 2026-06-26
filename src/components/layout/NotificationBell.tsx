"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, ExternalLink, BellOff, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatRelative } from "@/lib/utils";
import { NotifIcon } from "@/components/notifications/NotifIcon";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { DropdownPortal } from "@/components/ui/DropdownPortal";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  url?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const { pushState, enable, disable } = usePushSubscription();
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const showPushFooter = pushState !== "loading" && pushState !== "unsupported";

  return (
    <div>
      <button
        ref={triggerRef}
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

      <DropdownPortal
        triggerRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        align="right"
        className="w-80 rounded-2xl border overflow-hidden glass-strong animate-scale-in"
        style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)" }}
      >
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
                <div className="mt-0.5"><NotifIcon type={n.type} size={16} /></div>
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

        {/* Settings link */}
        <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => { setOpen(false); router.push("/settings?tab=notifikace"); }}
            className="flex items-center gap-2 w-full text-[12px] font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--text-2)" }}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Nastavení notifikací
          </button>
        </div>

        {/* Push toggle footer */}
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
                <button onClick={disable} className="text-[11.5px] font-medium transition-opacity hover:opacity-70" style={{ color: "var(--text-3)" }}>
                  Vypnout
                </button>
              </>
            ) : (
              <button
                onClick={enable}
                className="flex items-center gap-2 w-full text-[12px] font-semibold transition-opacity hover:opacity-80"
                style={{ color: "var(--accent)" }}
              >
                <Bell className="w-3.5 h-3.5" />
                Zapnout push notifikace
              </button>
            )}
          </div>
        )}
      </DropdownPortal>
    </div>
  );
}
