"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { User, Mail, Shield, LogOut, Bell } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name || "");

  return (
    <div>
      <Header title="Nastavení" subtitle="Správa účtu a předvoleb" />

      <div className="px-6 lg:px-8 pt-2 pb-12 max-w-2xl mx-auto space-y-7">
        <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-5">
            <User className="w-[18px] h-[18px]" style={{ color: "var(--accent)" }} />
            <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Profil</h2>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <Avatar name={session?.user?.name || "?"} src={session?.user?.image} size="lg" />
            <div>
              <p className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{session?.user?.name}</p>
              <p className="text-[13px]" style={{ color: "var(--text-3)" }}>{session?.user?.email}</p>
              <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-md mt-1.5 inline-block"
                style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
                {(session?.user as any)?.role === "admin" ? "Administrátor" : "Člen"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <Input label="Jméno" value={name} onChange={(e) => setName(e.target.value)} icon={<User className="w-4 h-4" />} />
            <Input label="Email" value={session?.user?.email || ""} disabled icon={<Mail className="w-4 h-4" />} />
          </div>

          <Button className="mt-5" variant="secondary">Uložit změny</Button>
        </div>

        <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-[18px] h-[18px]" style={{ color: "var(--accent)" }} />
            <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Oznámení</h2>
          </div>

          <div className="space-y-1">
            {[
              { label: "Nové úkoly přiřazené mně", defaultChecked: true },
              { label: "Komentáře u mých úkolů", defaultChecked: true },
              { label: "Blížící se termíny", defaultChecked: true },
              { label: "Změny statusu úkolů", defaultChecked: false },
            ].map(({ label, defaultChecked }) => (
              <label key={label} className="flex items-center justify-between py-2.5 cursor-pointer">
                <span className="text-[14px]" style={{ color: "var(--text-1)" }}>{label}</span>
                <div className="relative">
                  <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
                  <div className="w-10 h-6 rounded-full transition-colors peer-checked:bg-[var(--accent)]"
                    style={{ background: "var(--bg-subtle)" }} />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
                </div>
              </label>
            ))}
          </div>
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
