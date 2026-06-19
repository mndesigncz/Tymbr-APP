"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import {
  Bell, Check, ExternalLink, Monitor, SmartphoneNfc,
  BellOff, RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatRelative } from "@/lib/utils";
import { DEFAULT_NOTIF_PREFS, NOTIF_CATEGORIES } from "@/lib/notifTypes";
import { NotifIcon } from "@/components/notifications/NotifIcon";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  url?: string | null;
  isRead: boolean;
  createdAt: string;
}

type Prefs = Record<string, { inApp: boolean; push: boolean }>;
type PushState = "loading" | "unsupported" | "denied" | "enabled" | "disabled";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output.buffer;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_NOTIF_PREFS });
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [pushState, setPushState] = useState<PushState>("loading");
  const [activeView, setActiveView] = useState<"notifications" | "settings">("notifications");

  const loadNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setUnread(data.unread ?? 0);
  }, []);

  const loadPrefs = useCallback(async () => {
    setLoadingPrefs(true);
    try {
      const res = await fetch("/api/notifications/preferences");
      if (!res.ok) return;
      const data = await res.json();
      setPrefs((p) => ({ ...p, ...data }));
    } finally {
      setLoadingPrefs(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadPrefs();
  }, [loadNotifications, loadPrefs]);

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

  const togglePref = async (key: string, channel: "inApp" | "push") => {
    const current = prefs[key] ?? DEFAULT_NOTIF_PREFS[key] ?? { inApp: true, push: true };
    const next = { ...prefs, [key]: { ...current, [channel]: !current[channel] } };
    setPrefs(next);
    await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotifClick = async (n: Notification) => {
    if (!n.isRead) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      });
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
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

  const displayNotifs = tab === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <>
      <Header
        title="Centrum notifikací"
        subtitle={unread > 0 ? `${unread} nepřečtených` : "Vše přečteno"}
        actions={
          <button
            onClick={loadNotifications}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors hover:bg-[var(--hover)]"
            style={{ color: "var(--text-2)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Aktualizovat
          </button>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        {/* Mobile tab switcher */}
        <div className="lg:hidden flex gap-1 rounded-2xl p-1 mb-5" style={{ background: "var(--bg-subtle)" }}>
          {[
            { id: "notifications", label: `Notifikace${unread > 0 ? ` (${unread})` : ""}` },
            { id: "settings",      label: "Nastavení" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all"
              style={activeView === id
                ? { background: "var(--bg-page)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                : { color: "var(--text-3)" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Notification list ── */}
          <div className={activeView === "settings" ? "hidden lg:block" : ""}>
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              {/* Tab bar */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                <div className="flex gap-1 rounded-xl p-0.5" style={{ background: "var(--bg-subtle)" }}>
                  {[
                    { id: "all",    label: "Vše" },
                    { id: "unread", label: `Nepřečtené${unread > 0 ? ` (${unread})` : ""}` },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id as any)}
                      className="px-3 py-1 rounded-lg text-[13px] font-medium transition-all"
                      style={tab === id
                        ? { background: "var(--bg-page)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                        : { color: "var(--text-3)" }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[12px] font-medium transition-opacity hover:opacity-70"
                    style={{ color: "var(--accent)" }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Přečíst vše
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
                {displayNotifs.length === 0 ? (
                  <div className="py-14 text-center">
                    <Bell
                      className="w-10 h-10 mx-auto mb-3 opacity-20"
                      style={{ color: "var(--text-3)" }}
                    />
                    <p className="text-[14px] font-medium" style={{ color: "var(--text-2)" }}>
                      {tab === "unread" ? "Žádné nepřečtené notifikace" : "Žádné notifikace"}
                    </p>
                  </div>
                ) : (
                  displayNotifs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--hover)] border-b last:border-b-0"
                      style={{
                        borderColor: "var(--border)",
                        background: n.isRead
                          ? "transparent"
                          : "color-mix(in srgb, var(--accent) 4%, transparent)",
                      }}
                    >
                      <div className="mt-0.5">
                        <NotifIcon type={n.type} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: "var(--text-3)" }}>
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>
                      {n.url && (
                        <ExternalLink
                          className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-30"
                          style={{ color: "var(--text-3)" }}
                        />
                      )}
                      {!n.isRead && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                          style={{ background: "var(--accent)" }}
                        />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Preferences ── */}
          <div className={`space-y-4 ${activeView === "notifications" ? "hidden lg:block" : ""}`}>
            {/* Column headers */}
            <div
              className="rounded-2xl border px-4 py-3 flex items-center gap-4"
              style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
            >
              <div className="flex-1 text-[14px] font-bold" style={{ color: "var(--text-1)" }}>
                Nastavení notifikací
              </div>
              <div className="flex items-center gap-5">
                <div
                  className="flex items-center gap-1.5 text-[11.5px] font-semibold"
                  style={{ color: "var(--text-3)" }}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Aplikace
                </div>
                <div
                  className="flex items-center gap-1.5 text-[11.5px] font-semibold"
                  style={{ color: "var(--text-3)" }}
                >
                  <SmartphoneNfc className="w-3.5 h-3.5" />
                  Push
                </div>
              </div>
            </div>

            {NOTIF_CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="px-4 py-2.5 border-b"
                  style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
                >
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-3)" }}
                  >
                    {cat.label}
                  </span>
                </div>
                {cat.types.map((t) => {
                  const pref = prefs[t.key] ?? DEFAULT_NOTIF_PREFS[t.key] ?? { inApp: true, push: true };
                  return (
                    <div
                      key={t.key}
                      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
                    >
                      <NotifIcon type={t.key} size={16} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--text-1)" }}>
                          {t.label}
                        </p>
                        <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-3)" }}>
                          {t.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <Toggle
                          on={pref.inApp}
                          onChange={() => togglePref(t.key, "inApp")}
                          disabled={loadingPrefs}
                        />
                        <Toggle
                          on={pref.push}
                          onChange={() => togglePref(t.key, "push")}
                          disabled={loadingPrefs}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Push subscription management */}
            {pushState !== "loading" && pushState !== "unsupported" && (
              <div
                className="rounded-2xl border px-4 py-4"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                <p className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>
                  Push notifikace v prohlížeči
                </p>
                {pushState === "denied" ? (
                  <div className="flex items-center gap-2.5">
                    <BellOff className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                    <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
                      Push notifikace jsou zakázány v nastavení prohlížeče. Povolte je v nastavení webu.
                    </p>
                  </div>
                ) : pushState === "enabled" ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#22C55E" }} />
                      <p className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
                        Push notifikace jsou aktivní
                      </p>
                    </div>
                    <button
                      onClick={disablePush}
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-colors hover:bg-[var(--hover)]"
                      style={{ color: "var(--text-3)" }}
                    >
                      Vypnout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={enablePush}
                    className="flex items-center gap-2 w-full py-2.5 px-3 rounded-xl font-semibold text-[13px] transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    <Bell className="w-4 h-4" />
                    Zapnout push notifikace
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      disabled={disabled}
      className="relative flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: on ? "var(--accent)" : "var(--border-md)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200"
        style={{ left: on ? "calc(100% - 1.375rem)" : "0.125rem" }}
      />
    </button>
  );
}
