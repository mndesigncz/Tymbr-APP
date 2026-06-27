"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronsUpDown, Check, Plus, Users, CornerDownRight } from "lucide-react";
import { useTeams, switchTeam } from "@/hooks/useTeams";
import { DropdownPortal } from "@/components/ui/DropdownPortal";

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
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentTeamId = session?.user?.teamId ?? null;
  const current = teams.find((t) => t.id === currentTeamId);
  const label = current?.name ?? "Bez týmu";

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
    <div className="px-3">
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all hover:bg-[var(--hover)] disabled:opacity-60"
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

      <DropdownPortal
        triggerRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        align="left"
        className="rounded-2xl border overflow-hidden glass-strong animate-scale-in"
        style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)", minWidth: "200px" }}
      >
        <div className="py-1.5 max-h-[280px] overflow-y-auto no-scrollbar">
          {teams.length > 0 && (
            <p className="px-3 pt-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
              Tvoje týmy
            </p>
          )}
          {(() => {
            // Render parent teams first, then their subteams indented
            const parents = teams.filter((t) => !t.parentId);
            const subs = teams.filter((t) => t.parentId);
            const ordered: typeof teams = [];
            for (const p of parents) {
              ordered.push(p);
              ordered.push(...subs.filter((s) => s.parentId === p.id));
            }
            // Standalone subteams (parent not in list) at end
            ordered.push(...subs.filter((s) => !parents.find((p) => p.id === s.parentId)));
            return ordered.map((t) => {
              const active = t.id === currentTeamId;
              const isSubteam = !!t.parentId;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSwitch(t.id)}
                  className="w-full flex items-center gap-2.5 transition-colors hover:bg-[var(--hover)] text-left"
                  style={{ paddingLeft: isSubteam ? "28px" : "12px", paddingRight: "12px", paddingTop: "6px", paddingBottom: "6px" }}
                >
                  {isSubteam ? (
                    <CornerDownRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
                      style={{ background: tileColor(t.id) }}
                    >
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-1)", fontSize: isSubteam ? "12px" : "13px", fontWeight: isSubteam ? 500 : 600 }}>
                    {t.name}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />}
                </button>
              );
            });
          })()}
        </div>
        <div className="border-t py-1.5" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => { setOpen(false); router.push("/settings/team?new=1"); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--hover)] text-left"
            style={{ color: "var(--text-1)" }}
          >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-subtle)" }}>
              <Plus className="w-3.5 h-3.5" style={{ color: "var(--text-2)" }} />
            </div>
            Vytvořit nebo se připojit
          </button>
        </div>
      </DropdownPortal>
    </div>
  );
}
