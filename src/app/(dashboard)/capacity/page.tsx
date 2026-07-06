"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Gauge, Palmtree, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { canSeeFinance } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import type { VacationType } from "@/types";

interface CapacityRow {
  user: { id: string; name: string; avatar?: string | null };
  role: string;
  openTasks: number;
  estimatedMinutes: number;
  overdue: number;
  urgent: number;
  trackedMinutesWeek: number;
  onLeaveNow: boolean;
  nextLeave: { type: VacationType; startDate: string; endDate: string } | null;
}

interface Bucket { id: string; name: string; color?: string | null; minutes: number; revenue: number; expenses: number }
interface Analytics {
  totals: { minutes: number; revenue: number; expenses: number };
  projects: Bucket[];
  clients: Bucket[];
  members: { user: { id: string; name: string; avatar?: string | null }; minutes: number; revenue: number }[];
}

const hrs = (min: number) => `${(min / 60).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} h`;
const money = (n: number) => `${n.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} Kč`;

// 30 h of open estimated work ≈ a full plate — drives the workload bar color.
const FULL_LOAD_MINUTES = 30 * 60;

export default function CapacityPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.teamRole as string | null;
  const hasAccess = canSeeFinance(role as any);

  const [tab, setTab] = useState<"capacity" | "analytics">("capacity");
  const [rows, setRows] = useState<CapacityRow[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const loadCapacity = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/capacity");
    setRows(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/analytics?from=${from}&to=${to}`);
    setAnalytics(res.ok ? await res.json() : null);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    if (!hasAccess) return;
    if (tab === "capacity") loadCapacity();
    else loadAnalytics();
  }, [hasAccess, tab, loadCapacity, loadAnalytics]);

  if (!hasAccess) {
    return (
      <div>
        <Header title="Vytížení" />
        <div className="flex flex-col items-center justify-center py-32 px-6 text-center" style={{ color: "var(--text-3)" }}>
          <Gauge className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>Přístup jen pro manažery</p>
          <p className="text-[13px] mt-1">Vytížení týmu vidí vlastník, admin a finanční manažer.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Vytížení" subtitle="Kapacita týmu a výkonnost projektů" />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-5">
        <div className="flex items-center gap-1 p-1 rounded-xl border w-fit"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
          {([["capacity", "Vytížení týmu"], ["analytics", "Analytika"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className="px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={tab === k ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : tab === "capacity" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((r) => {
              const load = Math.min(1, r.estimatedMinutes / FULL_LOAD_MINUTES);
              const loadColor = r.onLeaveNow ? "#6B7280" : load > 0.85 ? "#EF4444" : load > 0.55 ? "#F59E0B" : "#22C55E";
              return (
                <div key={r.user.id} className="rounded-2xl border p-4"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)", opacity: r.onLeaveNow ? 0.75 : 1 }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <Avatar name={r.user.name} src={r.user.avatar} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{r.user.name}</p>
                      <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                        {r.role === "owner" ? "Vlastník" : r.role === "admin" ? "Admin" : r.role === "finance" ? "Finanční manažer" : "Člen"}
                      </p>
                    </div>
                    {r.onLeaveNow && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg flex-shrink-0"
                        style={{ color: "#0EA5E9", background: "#0EA5E918" }}>
                        <Palmtree className="w-3 h-3" /> Na dovolené
                      </span>
                    )}
                  </div>

                  {/* Workload bar */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${load * 100}%`, background: loadColor }} />
                    </div>
                    <span className="text-[11.5px] font-semibold tabular-nums flex-shrink-0" style={{ color: loadColor }}>
                      {hrs(r.estimatedMinutes)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl py-2" style={{ background: "var(--bg-subtle)" }}>
                      <p className="text-[15px] font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{r.openTasks}</p>
                      <p className="text-[10.5px] font-medium" style={{ color: "var(--text-3)" }}>úkolů</p>
                    </div>
                    <div className="rounded-xl py-2" style={{ background: "var(--bg-subtle)" }}>
                      <p className="text-[15px] font-bold tabular-nums" style={{ color: r.overdue > 0 ? "var(--danger)" : "var(--text-1)" }}>{r.overdue}</p>
                      <p className="text-[10.5px] font-medium" style={{ color: "var(--text-3)" }}>po termínu</p>
                    </div>
                    <div className="rounded-xl py-2" style={{ background: "var(--bg-subtle)" }}>
                      <p className="text-[15px] font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{hrs(r.trackedMinutesWeek)}</p>
                      <p className="text-[10.5px] font-medium" style={{ color: "var(--text-3)" }}>tento týden</p>
                    </div>
                  </div>

                  {(r.urgent > 0 || r.nextLeave) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                      {r.urgent > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--danger)" }}>
                          <AlertTriangle className="w-3 h-3" /> {r.urgent} urgentní
                        </span>
                      )}
                      {r.nextLeave && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                          <Palmtree className="w-3 h-3" style={{ color: "#0EA5E9" }} />
                          {formatDate(r.nextLeave.startDate)} – {formatDate(r.nextLeave.endDate)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Period */}
            <div className="flex flex-wrap items-end gap-2 max-w-md">
              <Input label="Od" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 min-w-[130px]" />
              <Input label="Do" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 min-w-[130px]" />
            </div>

            {analytics && (
              <>
                {/* Totals */}
                <div className="grid grid-cols-3 gap-3 max-w-xl">
                  {[
                    { label: "Odpracováno", value: hrs(analytics.totals.minutes), icon: Clock, color: "var(--accent)" },
                    { label: "Výdělek", value: money(analytics.totals.revenue), icon: TrendingUp, color: "#22C55E" },
                    { label: "Náklady", value: money(analytics.totals.expenses), icon: AlertTriangle, color: "#F59E0B" },
                  ].map((t) => (
                    <div key={t.label} className="rounded-2xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>{t.label}</p>
                      <p className="text-[17px] font-bold tabular-nums" style={{ color: t.color }}>{t.value}</p>
                    </div>
                  ))}
                </div>

                {/* Buckets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {([["Projekty", analytics.projects], ["Klienti", analytics.clients]] as const).map(([title, buckets]) => {
                    const maxRev = Math.max(1, ...buckets.map((b) => b.revenue));
                    return (
                      <div key={title} className="rounded-2xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                        <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: "var(--text-1)" }}>{title}</h3>
                        {buckets.length === 0 ? (
                          <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Žádná data za období</p>
                        ) : (
                          <div className="space-y-3">
                            {buckets.map((b) => (
                              <div key={b.id}>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="flex items-center gap-1.5 text-[12.5px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                                    {b.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.color }} />}
                                    {b.name}
                                  </span>
                                  <span className="text-[12px] tabular-nums flex-shrink-0" style={{ color: "var(--text-2)" }}>
                                    {hrs(b.minutes)} · <strong>{money(b.revenue)}</strong>
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${(b.revenue / maxRev) * 100}%`, background: b.color ?? "var(--accent)" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Members */}
                <div className="rounded-2xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: "var(--text-1)" }}>Členové</h3>
                  <div className="space-y-2.5">
                    {analytics.members.map((m) => (
                      <div key={m.user.id} className="flex items-center gap-3">
                        <Avatar name={m.user.name} src={m.user.avatar} size="sm" />
                        <span className="flex-1 text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>{m.user.name}</span>
                        <span className="text-[12.5px] tabular-nums" style={{ color: "var(--text-2)" }}>
                          {hrs(m.minutes)} · <strong>{money(m.revenue)}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
