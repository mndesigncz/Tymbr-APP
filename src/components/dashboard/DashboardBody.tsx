"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentTasks } from "@/components/dashboard/RecentTasks";
import { UrgentTasks } from "@/components/dashboard/UrgentTasks";
import { Modal } from "@/components/ui/Modal";
import {
  CheckSquare, Clock, CheckCircle2, CheckCheck, Wallet,
  SlidersHorizontal, RotateCcw,
} from "lucide-react";
import { formatRelative } from "@/lib/utils";
import type { Task } from "@/types";
import { ManagerAnalytics } from "@/components/dashboard/ManagerAnalytics";
import type { MemberStat } from "@/components/dashboard/ManagerAnalytics";

type WidgetId =
  | "stat_active" | "stat_todo" | "stat_progress" | "stat_done" | "stat_earning"
  | "panel_analytics" | "panel_urgent" | "panel_recent" | "panel_done" | "panel_categories";

interface Category { id: string; name: string; color: string; count: number }

interface DashboardBodyProps {
  manager: boolean;
  statActive: number;
  statTodo: number;
  statProgress: number;
  statDone: number;
  monthEarning: number;
  urgentAll: Task[];
  urgentMine: Task[];
  recent: Task[];
  myTasksList: Task[];
  doneList: Task[];
  doneTotal: number;
  categories: Category[];
  memberStats?: MemberStat[];
}

const STORAGE_KEY = "tymbr:dashboardWidgets";

const WIDGET_LABELS: { id: WidgetId; label: string; group: "stat" | "panel" }[] = [
  { id: "stat_active", label: "Aktivní / moje úkoly", group: "stat" },
  { id: "stat_todo", label: "K provedení", group: "stat" },
  { id: "stat_progress", label: "Probíhá", group: "stat" },
  { id: "stat_done", label: "Hotovo celkem", group: "stat" },
  { id: "stat_earning", label: "Měsíční výdělek", group: "stat" },
  { id: "panel_analytics", label: "Přehled týmu (manažer)", group: "panel" },
  { id: "panel_urgent", label: "Urgentní úkoly", group: "panel" },
  { id: "panel_recent", label: "Seznam úkolů", group: "panel" },
  { id: "panel_done", label: "Hotové úkoly", group: "panel" },
  { id: "panel_categories", label: "Kategorie", group: "panel" },
];

const DEFAULTS: Record<WidgetId, boolean> = {
  stat_active: true, stat_todo: true, stat_progress: true, stat_done: true,
  stat_earning: true, panel_analytics: true, panel_urgent: true, panel_recent: true,
  panel_done: true, panel_categories: true,
};

export function DashboardBody(props: DashboardBodyProps) {
  const {
    manager, statActive, statTodo, statProgress, statDone, monthEarning,
    urgentAll, urgentMine, recent, myTasksList, doneList, doneTotal, categories,
    memberStats = [],
  } = props;

  // Visibility is per-device (localStorage) so no schema/migration is needed.
  // Defaults to everything on; we read the saved set after mount to avoid a
  // hydration mismatch.
  const [vis, setVis] = useState<Record<WidgetId, boolean>>(DEFAULTS);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setVis({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const persist = (next: Record<WidgetId, boolean>) => {
    setVis(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const toggle = (id: WidgetId) => persist({ ...vis, [id]: !vis[id] });
  const resetAll = () => persist({ ...DEFAULTS });

  const statCards = [
    vis.stat_active && (
      <StatsCard key="active" title={manager ? "Aktivní úkoly" : "Moje úkoly"} value={statActive} icon={CheckSquare} highlight />
    ),
    vis.stat_todo && (
      <StatsCard key="todo" title="K provedení" value={statTodo} icon={Clock} color="#6366f1" />
    ),
    vis.stat_progress && (
      <StatsCard key="progress" title="Probíhá" value={statProgress} icon={CheckCircle2} color="#eab308" />
    ),
    vis.stat_done && (
      <StatsCard key="done" title="Hotovo celkem" value={statDone} icon={CheckCheck} color="#22c55e" />
    ),
    vis.stat_earning && (
      <StatsCard key="earning" title={manager ? "Výdělek tým / měsíc" : "Můj výdělek / měsíc"}
        value={monthEarning > 0 ? `${monthEarning.toLocaleString("cs-CZ")} Kč` : "—"} icon={Wallet} color="#0ea5e9" />
    ),
  ].filter(Boolean);

  const mainPanels = [
    vis.panel_urgent && <UrgentTasks key="urgent" allUrgent={urgentAll} myUrgent={urgentMine} isManager={manager} />,
    vis.panel_recent && <RecentTasks key="recent" allTasks={recent} myTasks={myTasksList} isManager={manager} />,
  ].filter(Boolean);

  const showDonePanel = vis.panel_done && doneList.length > 0;
  const sidePanels = [
    showDonePanel && (
      <div key="donelist" className="rounded-3xl border" style={{ background: "var(--bg-card)", borderColor: "#22C55E20", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-[18px] h-[18px]" style={{ color: "#22C55E" }} />
            <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Hotové</h2>
            <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-md"
              style={{ background: "#22C55E15", color: "#22C55E" }}>{doneTotal}</span>
          </div>
          <Link href="/tasks?tab=done" className="text-[13px] font-semibold hover:opacity-80 transition-opacity"
            style={{ color: "var(--accent)" }}>
            Vše
          </Link>
        </div>
        <div className="px-4 pb-5 space-y-1">
          {doneList.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-black/[0.03]">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#22C55E" }} />
                <span className="text-[13px] font-medium line-clamp-1" style={{ color: "var(--text-1)" }}>
                  {task.title}
                </span>
              </div>
              {task.completedAt && (
                <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: "var(--text-3)" }}>
                  {formatRelative(task.completedAt)}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    ),
    vis.panel_categories && (
      <div key="categories" className="rounded-3xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Kategorie</h2>
          <Link href="/categories" className="text-[13px] font-semibold hover:opacity-80 transition-opacity"
            style={{ color: "var(--accent)" }}>
            Spravovat
          </Link>
        </div>
        <div className="px-4 pb-5 space-y-1">
          {categories.length === 0 && (
            <p className="text-[13px] px-2 py-3" style={{ color: "var(--text-3)" }}>Žádné kategorie</p>
          )}
          {categories.map((cat) => (
            <Link key={cat.id} href={`/tasks?categoryId=${cat.id}`}
              className="flex items-center justify-between px-3 py-3 rounded-xl transition-colors hover:bg-black/[0.03]"
              style={{ color: "var(--text-2)" }}>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[13.5px] font-medium" style={{ color: "var(--text-1)" }}>{cat.name}</span>
              </div>
              <span className="text-[12px] font-medium px-2 py-0.5 rounded-md"
                style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>{cat.count}</span>
            </Link>
          ))}
        </div>
      </div>
    ),
  ].filter(Boolean);

  const nothingVisible = statCards.length === 0 && mainPanels.length === 0 && sidePanels.length === 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-8">
      {/* Customize bar */}
      <div className="flex justify-end -mb-3">
        <button
          onClick={() => setCustomizeOpen(true)}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-xl border transition-all hover:bg-black/[0.03]"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Přizpůsobit
        </button>
      </div>

      {nothingVisible && (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <p className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>Všechny panely jsou skryté</p>
          <button onClick={() => setCustomizeOpen(true)}
            className="mt-3 text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
            Přizpůsobit přehled
          </button>
        </div>
      )}

      {/* Stats */}
      {statCards.length > 0 && (
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {statCards}
        </div>
      )}

      {/* Manager analytics panel */}
      {manager && vis.panel_analytics && memberStats.length > 0 && (
        <ManagerAnalytics members={memberStats} />
      )}

      {/* Panels */}
      {(mainPanels.length > 0 || sidePanels.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {mainPanels.length > 0 && (
            <div className="xl:col-span-2 space-y-7">{mainPanels}</div>
          )}
          {sidePanels.length > 0 && (
            <div className="space-y-6">{sidePanels}</div>
          )}
        </div>
      )}

      {/* Customize modal */}
      <Modal open={customizeOpen} onClose={() => setCustomizeOpen(false)} title="Přizpůsobit přehled">
        <p className="text-[13px] mb-4" style={{ color: "var(--text-3)" }}>
          Vyber, které panely chceš na přehledu vidět. Nastavení se ukládá v tomto prohlížeči.
        </p>

        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>Statistiky</p>
        <div className="space-y-1 mb-5">
          {WIDGET_LABELS.filter((w) => w.group === "stat").map((w) => (
            <ToggleRow key={w.id} label={w.label} on={vis[w.id]} onToggle={() => toggle(w.id)} />
          ))}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>Panely</p>
        <div className="space-y-1 mb-5">
          {WIDGET_LABELS.filter((w) => w.group === "panel").map((w) => (
            <ToggleRow key={w.id} label={w.label} on={vis[w.id]} onToggle={() => toggle(w.id)} />
          ))}
        </div>

        <button onClick={resetAll}
          className="flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: "var(--accent)" }}>
          <RotateCcw className="w-3.5 h-3.5" />
          Obnovit výchozí
        </button>
      </Modal>
    </div>
  );
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center justify-between py-2.5 cursor-pointer">
      <span className="text-[14px]" style={{ color: "var(--text-1)" }}>{label}</span>
      <div className="relative">
        <input type="checkbox" checked={on} onChange={onToggle} className="sr-only peer" />
        <div className="w-10 h-6 rounded-full transition-colors peer-checked:bg-[var(--accent)]"
          style={{ background: "var(--bg-subtle)" }} />
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
      </div>
    </label>
  );
}
