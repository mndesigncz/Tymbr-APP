"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Settings, LogOut, Users, Check, Plus } from "lucide-react";
import { useTeams, switchTeam } from "@/hooks/useTeams";

export function ProfileMenu() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const teams = useTeams();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentTeamId = session?.user?.teamId ?? null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!session?.user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center rounded-full transition-opacity hover:opacity-80 focus:outline-none"
        aria-label="Profil"
      >
        <Avatar name={session.user.name || "?"} src={session.user.image} size="sm" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[220px] rounded-2xl border z-50 overflow-hidden glass-strong animate-scale-in"
          style={{
            borderColor: "var(--border-md)",
            boxShadow: "var(--shadow-overlay)",
          }}
        >
          {/* User info */}
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
              {session.user.name}
            </p>
            <p className="text-[11.5px] truncate mt-0.5" style={{ color: "var(--text-3)" }}>
              {session.user.email}
            </p>
          </div>

          {/* Teams */}
          {teams.length > 0 && (
            <div className="py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
              <p className="px-4 pt-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                Tvoje týmy
              </p>
              <div className="max-h-[200px] overflow-y-auto no-scrollbar">
                {teams.map((t) => {
                  const active = t.id === currentTeamId;
                  return (
                    <button
                      key={t.id}
                      disabled={switching}
                      onClick={async () => {
                        if (active) { setOpen(false); return; }
                        setSwitching(true);
                        await switchTeam(t.id, currentTeamId, update);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 transition-colors hover:bg-[var(--hover)] text-left disabled:opacity-60"
                    >
                      <span className="flex-1 min-w-0 text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                        {t.name}
                      </span>
                      {active && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => { setOpen(false); router.push("/settings/team?new=1"); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--hover)] text-left"
                style={{ color: "var(--text-2)" }}
              >
                <Plus className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                Vytvořit nebo se připojit
              </button>
            </div>
          )}

          {/* Menu items */}
          <div className="py-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-[var(--hover)]"
              style={{ color: "var(--text-1)" }}
            >
              <Settings className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
              Nastavení účtu
            </Link>
            <Link
              href="/settings/team"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-[var(--hover)]"
              style={{ color: "var(--text-1)" }}
            >
              <Users className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
              Správa týmu
            </Link>
          </div>

          <div className="border-t pb-1.5" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-[var(--danger-soft)] text-left"
              style={{ color: "var(--danger)" }}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Odhlásit se
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
