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

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-orange-400" />
            <h2 className="text-base font-semibold text-white">Profil</h2>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <Avatar name={session?.user?.name || "?"} src={session?.user?.image} size="lg" />
            <div>
              <p className="font-semibold text-white">{session?.user?.name}</p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
              <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                {(session?.user as any)?.role === "admin" ? "Administrátor" : "Člen"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Jméno"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="w-4 h-4" />}
            />
            <Input
              label="Email"
              value={session?.user?.email || ""}
              disabled
              icon={<Mail className="w-4 h-4" />}
            />
          </div>

          <Button className="mt-4" variant="secondary">
            Uložit změny
          </Button>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-4 h-4 text-orange-400" />
            <h2 className="text-base font-semibold text-white">Oznámení</h2>
          </div>

          <div className="space-y-3">
            {[
              { label: "Nové úkoly přiřazené mně", defaultChecked: true },
              { label: "Komentáře u mých úkolů", defaultChecked: true },
              { label: "Blížící se termíny", defaultChecked: true },
              { label: "Změny statusu úkolů", defaultChecked: false },
            ].map(({ label, defaultChecked }) => (
              <label key={label} className="flex items-center justify-between py-2 cursor-pointer group">
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>
                <div className="relative">
                  <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
                  <div className="w-10 h-6 bg-[#2a2a2a] peer-checked:bg-orange-500 rounded-full transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4 text-red-400" />
            <h2 className="text-base font-semibold text-white">Zabezpečení</h2>
          </div>

          <Button
            variant="danger"
            icon={<LogOut className="w-4 h-4" />}
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="!bg-red-500/10 !text-red-400 hover:!bg-red-500/20"
          >
            Odhlásit se ze všech zařízení
          </Button>
        </div>
      </div>
    </div>
  );
}
