"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  User, Mail, Shield, LogOut, Bell, Camera, Trash2,
  Palette, Monitor, SmartphoneNfc, BellOff, Check, ExternalLink, RefreshCw,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { DEFAULT_NOTIF_PREFS, NOTIF_CATEGORIES } from "@/lib/notifTypes";
import { NotifIcon } from "@/components/notifications/NotifIcon";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { formatRelative } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "profil" | "notifikace" | "zobrazeni" | "zabezpeceni";

interface Notif {
  id: string; type: string; title: string;
  body?: string | null; url?: string | null;
  isRead: boolean; createdAt: string;
}
type Prefs = Record<string, { inApp: boolean; push: boolean }>;

// ── Avatar resize util ────────────────────────────────────────────────────────

function fileToAvatarDataUrl(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        const scale = Math.max(size / img.width, size / img.height);
        ctx.drawImage(img, (size - img.width * scale) / 2, (size - img.height * scale) / 2, img.width * scale, img.height * scale);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Toggle UI component ───────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onChange} disabled={disabled}
      className="relative flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ background: on ? "var(--accent)" : "var(--border-md)", opacity: disabled ? 0.5 : 1 }}
    >
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200"
        style={{ left: on ? "calc(100% - 1.375rem)" : "0.125rem" }} />
    </button>
  );
}

// ── Push subscription card ────────────────────────────────────────────────────

function PushCard() {
  const { pushState, pushError, enable, disable } = usePushSubscription();
  if (pushState === "loading" || pushState === "unsupported") return null;
  return (
    <div className="rounded-2xl border px-4 py-4" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>
        Push notifikace v prohlížeči
      </p>
      {pushState === "denied" && (
        <div className="flex items-center gap-2.5">
          <BellOff className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Push notifikace jsou zakázány — povolte je v nastavení prohlížeče pro tento web.
          </p>
        </div>
      )}
      {pushState === "enabled" && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#22C55E" }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>Push notifikace jsou aktivní</p>
          </div>
          <button onClick={disable}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-colors hover:bg-[var(--hover)]"
            style={{ color: "var(--text-3)" }}>
            Vypnout
          </button>
        </div>
      )}
      {(pushState === "disabled" || pushState === "error") && (
        <div className="space-y-2">
          <button onClick={enable}
            className="flex items-center gap-2 w-full py-2.5 px-3 rounded-xl font-semibold text-[13px] transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--accent)", color: "#fff" }}>
            <Bell className="w-4 h-4" />
            Zapnout push notifikace
          </button>
          {pushError && (
            <p className="text-[11.5px] px-1" style={{ color: "#EF4444" }}>{pushError}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Profil tab ────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [avatar, setAvatar] = useState<string | null | undefined>(session?.user?.image);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = name.trim() !== (session?.user?.name || "") || (avatar ?? null) !== (session?.user?.image ?? null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMsg({ type: "err", text: "Vyber prosím obrázek" }); return; }
    try { setAvatar(await fileToAvatarDataUrl(file)); setMsg(null); }
    catch { setMsg({ type: "err", text: "Obrázek se nepodařilo načíst" }); }
    finally { if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), avatar: avatar ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: "err", text: data.error || "Uložení selhalo" }); }
      else { await update({ name: data.name, image: data.avatar }); setMsg({ type: "ok", text: "Změny uloženy" }); }
    } catch { setMsg({ type: "err", text: "Chyba spojení" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center gap-2 mb-5">
          <User className="w-[18px] h-[18px]" style={{ color: "var(--accent)" }} />
          <h2 className="text-[16px] font-bold" style={{ color: "var(--text-1)" }}>Profil</h2>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group">
            <Avatar name={name || session?.user?.name || "?"} src={avatar} size="lg" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105"
              style={{ background: "var(--accent)", color: "#fff" }} title="Změnit fotku">
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{session?.user?.name}</p>
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>{session?.user?.email}</p>
            {avatar && (
              <button type="button" onClick={() => setAvatar("")}
                className="text-[12px] font-medium mt-1.5 inline-flex items-center gap-1 hover:opacity-80"
                style={{ color: "#EF4444" }}>
                <Trash2 className="w-3 h-3" /> Odebrat fotku
              </button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <Input label="Jméno" value={name} onChange={(e) => setName(e.target.value)} icon={<User className="w-4 h-4" />} />
          <Input label="Email" value={session?.user?.email || ""} disabled icon={<Mail className="w-4 h-4" />} />
        </div>
        {msg && <p className="mt-4 text-[13px] font-medium" style={{ color: msg.type === "ok" ? "#16A34A" : "#EF4444" }}>{msg.text}</p>}
        <Button className="mt-5" variant="primary" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Ukládám…" : "Uložit změny"}
        </Button>
      </div>
    </div>
  );
}

// ── Notifikace tab ────────────────────────────────────────────────────────────

function NotificationsTab() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_NOTIF_PREFS });
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [tab, setTab] = useState<"all" | "unread">("all");

  const loadNotifs = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifs(data.notifications ?? []);
    setUnread(data.unread ?? 0);
  }, []);

  const loadPrefs = useCallback(async () => {
    setLoadingPrefs(true);
    try {
      const res = await fetch("/api/notifications/preferences");
      if (!res.ok) return;
      const data = await res.json();
      setPrefs((p) => ({ ...p, ...data }));
    } finally { setLoadingPrefs(false); }
  }, []);

  useEffect(() => { loadNotifs(); loadPrefs(); }, [loadNotifs, loadPrefs]);

  const togglePref = async (key: string, channel: "inApp" | "push") => {
    const cur = prefs[key] ?? DEFAULT_NOTIF_PREFS[key] ?? { inApp: true, push: true };
    const next = { ...prefs, [key]: { ...cur, [channel]: !cur[channel] } };
    setPrefs(next);
    await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setUnread(0);
    setNotifs((p) => p.map((n) => ({ ...n, isRead: true })));
  };

  const handleClick = async (n: Notif) => {
    if (!n.isRead) {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
      setNotifs((p) => p.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.url) router.push(n.url);
  };

  const display = tab === "unread" ? notifs.filter((n) => !n.isRead) : notifs;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* ── Recent notifications ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <div className="flex gap-1 rounded-xl p-0.5" style={{ background: "var(--bg-subtle)" }}>
            {[{ id: "all", label: "Vše" }, { id: "unread", label: `Nepřečtené${unread > 0 ? ` (${unread})` : ""}` }].map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id as any)}
                className="px-3 py-1 rounded-lg text-[13px] font-medium transition-all"
                style={tab === id
                  ? { background: "var(--bg-page)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                  : { color: "var(--text-3)" }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadNotifs} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: "var(--text-3)" }}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[12px] font-medium transition-opacity hover:opacity-70" style={{ color: "var(--accent)" }}>
                <Check className="w-3.5 h-3.5" /> Přečíst vše
              </button>
            )}
          </div>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
          {display.length === 0 ? (
            <div className="py-14 text-center">
              <Bell className="w-9 h-9 mx-auto mb-3 opacity-20" style={{ color: "var(--text-3)" }} />
              <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
                {tab === "unread" ? "Žádné nepřečtené notifikace" : "Žádné notifikace"}
              </p>
            </div>
          ) : display.map((n) => (
            <button key={n.id} onClick={() => handleClick(n)}
              className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--hover)] border-b last:border-b-0"
              style={{ borderColor: "var(--border)", background: n.isRead ? "transparent" : "color-mix(in srgb, var(--accent) 4%, transparent)" }}>
              <div className="mt-0.5"><NotifIcon type={n.type} size={16} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-snug" style={{ color: "var(--text-1)" }}>{n.title}</p>
                {n.body && <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: "var(--text-3)" }}>{n.body}</p>}
                <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>{formatRelative(n.createdAt)}</p>
              </div>
              {n.url && <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-30" style={{ color: "var(--text-3)" }} />}
              {!n.isRead && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: "var(--accent)" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Preferences ── */}
      <div className="space-y-4">
        {/* Column headers */}
        <div className="rounded-2xl border px-4 py-3 flex items-center gap-4" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <div className="flex-1 text-[14px] font-bold" style={{ color: "var(--text-1)" }}>Nastavení notifikací</div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: "var(--text-3)" }}>
              <Monitor className="w-3.5 h-3.5" /> Aplikace
            </div>
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: "var(--text-3)" }}>
              <SmartphoneNfc className="w-3.5 h-3.5" /> Push
            </div>
          </div>
        </div>

        {NOTIF_CATEGORIES.map((cat) => (
          <div key={cat.label} className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{cat.label}</span>
            </div>
            {cat.types.map((t) => {
              const pref = prefs[t.key] ?? DEFAULT_NOTIF_PREFS[t.key] ?? { inApp: true, push: true };
              return (
                <div key={t.key} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                  <NotifIcon type={t.key} size={16} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--text-1)" }}>{t.label}</p>
                    <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-3)" }}>{t.description}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <Toggle on={pref.inApp} onChange={() => togglePref(t.key, "inApp")} disabled={loadingPrefs} />
                    <Toggle on={pref.push} onChange={() => togglePref(t.key, "push")} disabled={loadingPrefs} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <PushCard />
      </div>
    </div>
  );
}

// ── Settings page ─────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profil",        label: "Profil",        icon: User   },
  { id: "notifikace",    label: "Notifikace",     icon: Bell   },
  { id: "zobrazeni",     label: "Zobrazení",      icon: Palette },
  { id: "zabezpeceni",   label: "Zabezpečení",    icon: Shield },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams.get("tab") as Tab | null;
  const activeTab: Tab = TABS.some((t) => t.id === rawTab) ? rawTab! : "profil";

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/settings?${params.toString()}`);
  };

  return (
    <>
      <Header title="Nastavení" subtitle="Správa účtu a předvoleb" />
      <div className="px-4 sm:px-6 lg:px-8 pb-10">
        {/* Tab bar */}
        <div className="flex gap-1 rounded-2xl p-1 mb-7 overflow-x-auto no-scrollbar w-fit"
          style={{ background: "var(--bg-subtle)" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap"
              style={activeTab === id
                ? { background: "var(--bg-page)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                : { color: "var(--text-3)" }}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "profil" && <ProfileTab />}

        {activeTab === "notifikace" && <NotificationsTab />}

        {activeTab === "zobrazeni" && (
          <div className="max-w-lg">
            <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center gap-2 mb-5">
                <Palette className="w-[18px] h-[18px]" style={{ color: "var(--accent)" }} />
                <h2 className="text-[16px] font-bold" style={{ color: "var(--text-1)" }}>Zobrazení</h2>
              </div>
              <ThemeToggle />
            </div>
          </div>
        )}

        {activeTab === "zabezpeceni" && (
          <div className="max-w-lg">
            <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "rgba(239,68,68,0.18)", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center gap-2 mb-5">
                <Shield className="w-[18px] h-[18px] text-red-500" />
                <h2 className="text-[16px] font-bold" style={{ color: "var(--text-1)" }}>Zabezpečení</h2>
              </div>
              <p className="text-[13px] mb-4" style={{ color: "var(--text-3)" }}>
                Odhlásí tě ze všech zařízení a přesměruje na přihlašovací stránku.
              </p>
              <Button variant="danger" icon={<LogOut className="w-4 h-4" />}
                onClick={() => signOut({ callbackUrl: "/login" })}>
                Odhlásit se ze všech zařízení
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
