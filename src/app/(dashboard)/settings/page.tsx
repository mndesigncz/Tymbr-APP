"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { User, Mail, Shield, LogOut, Bell, Camera, Trash2, Palette } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Resize an image file to a small square data URL so it stays tiny in the JWT.
function fileToAvatarDataUrl(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        // cover crop
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [avatar, setAvatar] = useState<string | null | undefined>(session?.user?.image);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  type NotifKey = "taskAssigned" | "comments" | "dueDates" | "statusChanges" | "weeklyDigest";
  const [prefs, setPrefs] = useState<Record<NotifKey, boolean>>({
    taskAssigned: true, comments: true, dueDates: true, statusChanges: false, weeklyDigest: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((d) => { if (d?.notificationPrefs) setPrefs((p) => ({ ...p, ...d.notificationPrefs })); })
      .catch(() => {});
  }, []);

  const togglePref = async (key: NotifKey) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSavingPrefs(true);
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPrefs: next }),
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const dirty =
    name.trim() !== (session?.user?.name || "") ||
    (avatar ?? null) !== (session?.user?.image ?? null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg({ type: "err", text: "Vyber prosím obrázek" });
      return;
    }
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatar(dataUrl);
      setMsg(null);
    } catch {
      setMsg({ type: "err", text: "Obrázek se nepodařilo načíst" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), avatar: avatar ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Uložení selhalo" });
      } else {
        await update({ name: data.name, image: data.avatar });
        setMsg({ type: "ok", text: "Změny uloženy" });
      }
    } catch {
      setMsg({ type: "err", text: "Chyba spojení" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header title="Nastavení" subtitle="Správa účtu a předvoleb" />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 max-w-2xl mx-auto space-y-7">
        <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-5">
            <User className="w-[18px] h-[18px]" style={{ color: "var(--accent)" }} />
            <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Profil</h2>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative group">
              <Avatar name={name || session?.user?.name || "?"} src={avatar} size="lg" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105"
                style={{ background: "var(--accent)", color: "#fff" }}
                title="Změnit fotku"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
            <div>
              <p className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{session?.user?.name}</p>
              <p className="text-[13px]" style={{ color: "var(--text-3)" }}>{session?.user?.email}</p>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar("")}
                  className="text-[12px] font-medium mt-1.5 inline-flex items-center gap-1 transition-colors hover:opacity-80"
                  style={{ color: "#EF4444" }}
                >
                  <Trash2 className="w-3 h-3" /> Odebrat fotku
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Input label="Jméno" value={name} onChange={(e) => setName(e.target.value)} icon={<User className="w-4 h-4" />} />
            <Input label="Email" value={session?.user?.email || ""} disabled icon={<Mail className="w-4 h-4" />} />
          </div>

          {msg && (
            <p className="mt-4 text-[13px] font-medium" style={{ color: msg.type === "ok" ? "#16A34A" : "#EF4444" }}>
              {msg.text}
            </p>
          )}

          <Button className="mt-5" variant="primary" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Ukládám…" : "Uložit změny"}
          </Button>
        </div>

        <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-[18px] h-[18px]" style={{ color: "var(--accent)" }} />
            <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Oznámení</h2>
            {savingPrefs && (
              <span className="text-[11px] ml-auto" style={{ color: "var(--text-3)" }}>Ukládám…</span>
            )}
          </div>

          <div className="space-y-1">
            {([
              { key: "taskAssigned", label: "Nové úkoly přiřazené mně" },
              { key: "comments", label: "Komentáře u mých úkolů" },
              { key: "dueDates", label: "Blížící se termíny" },
              { key: "statusChanges", label: "Změny statusu úkolů" },
              { key: "weeklyDigest", label: "Týdenní přehled (každé pondělí)" },
            ] as { key: NotifKey; label: string }[]).map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between py-2.5 cursor-pointer">
                <span className="text-[14px]" style={{ color: "var(--text-1)" }}>{label}</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={() => togglePref(key)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 rounded-full transition-colors peer-checked:bg-[var(--accent)]"
                    style={{ background: "var(--bg-subtle)" }} />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
                </div>
              </label>
            ))}
          </div>
          <p className="text-[12px] mt-3" style={{ color: "var(--text-3)" }}>
            Zatím se odesílají e-maily pouze pro „Nové úkoly přiřazené mně". Ostatní typy budou aktivní postupně.
          </p>
        </div>

        <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-5">
            <Palette className="w-[18px] h-[18px]" style={{ color: "var(--accent)" }} />
            <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Zobrazení</h2>
          </div>
          <ThemeToggle />
        </div>

        <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "rgba(239,68,68,0.18)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-[18px] h-[18px] text-red-500" />
            <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Zabezpečení</h2>
          </div>

          <Button variant="danger" icon={<LogOut className="w-4 h-4" />} onClick={() => signOut({ callbackUrl: "/login" })}>
            Odhlásit se ze všech zařízení
          </Button>
        </div>
      </div>
    </div>
  );
}
