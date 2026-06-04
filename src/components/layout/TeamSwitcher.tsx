"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronsUpDown, Check, Plus, Users } from "lucide-react";
import { useTeams, switchTeam } from "@/hooks/useTeams";

// Small deterministic colour per team so each avatar tile is distinguishable.
const TILE_COLORS = ["#f7592f", "#3B82F6", "#8B5CF6", "#22C55E", "#EAB308", "#EC4899", "#14B8A6"];
function tileColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
}

export function TeamSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const teams = useTeams();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentTeamId = session?.user?.teamId ?? null;
  const current = teams.find((t) => t.id === currentTeamId);
  const label = current?.name ?? "Bez týmu";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleSwitch = async (teamId: string) => {
    if (teamId === currentTeamId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    await switchTeam(teamId, currentTeamId, update);
  };

  const color = current ? tileColor(current.id) : "var(--text-3)";

  return (
    <div ref={ref} className="relative px-3">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all hover:bg-black/[0.035] disabled:opacity-60"
        style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold"
          style={{ background: color }}
        >
          {current ? current.name.charAt(0).toUpperCase() : <Users className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{label}</p>
          {current && (
            <p className="text-[10.5px] truncate" style={{ color: "var(--text-3)" }}>
              {current.memberCount} {current.memberCount === 1 ? "člen" : current.memberCount < 5 ? "členové" : "členů"}
            </p>
          )}
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
      </button>

      {open && (
        <div
          className="absolute top-full left-3 right-3 mt-1.5 rounded-2xl border z-50 overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,0.12))" }}
        >
          <div className="py-1.5 max-h-[260px] overflow-y-auto no-scrollbar">
            {teams.length > 0 && (
              <p className="px-3 pt-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                Tvoje týmy
              </p>
            )}
            {teams.map((t) => {
              const active = t.id === currentTeamId;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSwitch(t.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-black/[0.035] text-left"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
                    style={{ background: tileColor(t.id) }}
                  >
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 min-w-0 text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {t.name}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />}
                </button>
              );
            })}
          </div>
          <div className="border-t py-1.5" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => { setOpen(false); router.push("/settings/team?new=1"); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-colors hover:bg-black/[0.035] text-left"
              style={{ color: "var(--text-1)" }}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-subtle)" }}>
                <Plus className="w-3.5 h-3.5" style={{ color: "var(--text-2)" }} />
              </div>
              Vytvořit nebo se připojit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
