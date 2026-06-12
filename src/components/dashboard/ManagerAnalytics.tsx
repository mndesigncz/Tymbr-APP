"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { CheckSquare, AlertTriangle, CheckCheck, Clock } from "lucide-react";

export interface MemberStat {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  openTasks: number;
  overdueTasks: number;
  completedThisMonth: number;
  hoursThisMonth: number;
}

export function ManagerAnalytics({ members }: { members: MemberStat[] }) {
  if (members.length === 0) {
    return (
      <div className="rounded-3xl border px-6 py-10 text-center"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <p className="text-[14px]" style={{ color: "var(--text-3)" }}>Žádní členové týmu</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border overflow-hidden"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Přehled týmu</h2>
          <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-3)" }}>Výkon členů za tento měsíc</p>
        </div>
        <Link href="/tasks" className="text-[13px] font-semibold hover:opacity-80 transition-opacity"
          style={{ color: "var(--accent)" }}>
          Všechny úkoly
        </Link>
      </div>

      {/* Header row — desktop only */}
      <div className="hidden sm:grid px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-3)", gridTemplateColumns: "1fr repeat(4, minmax(0, 1fr))" }}>
        <span>Člen</span>
        <span className="text-center">Otevřené</span>
        <span className="text-center">Po termínu</span>
        <span className="text-center">Hotovo / měsíc</span>
        <span className="text-center">Hod. / měsíc</span>
      </div>

      <div className="space-y-2 px-4 pb-4">
        {members.map((m) => (
          <MemberRow key={m.userId} m={m} />
        ))}
      </div>
    </div>
  );
}

function StatCell({ value, color, label }: { value: number | string; color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[18px] font-bold tabular-nums leading-tight" style={{ color }}>{value}</span>
      <span className="text-[10.5px] sm:hidden" style={{ color: "var(--text-3)" }}>{label}</span>
    </div>
  );
}

function MemberRow({ m }: { m: MemberStat }) {
  const overdueColor = m.overdueTasks > 0 ? "var(--danger)" : "var(--text-3)";

  return (
    <Link
      href={`/tasks?assigneeId=${m.userId}`}
      className="flex flex-col sm:grid gap-4 sm:gap-2 px-5 py-4 rounded-2xl border transition-colors hover:bg-[var(--hover)]"
      style={{ gridTemplateColumns: "1fr repeat(4, minmax(0, 1fr))", borderColor: "var(--border)", background: "var(--bg-subtle)" }}>

      {/* Member info */}
      <div className="flex items-center gap-3">
        <Avatar name={m.name} src={m.avatar} size="md" />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{m.name}</p>
          <p className="text-[11.5px] truncate" style={{ color: "var(--text-3)" }}>{m.email}</p>
        </div>
      </div>

      {/* Mobile: stats in a row */}
      <div className="grid grid-cols-4 gap-2 sm:contents">
        {/* Open tasks */}
        <div className="sm:flex sm:justify-center sm:items-center">
          <StatCell value={m.openTasks} color="var(--accent)" label="Otevřené" />
        </div>

        {/* Overdue */}
        <div className="sm:flex sm:justify-center sm:items-center">
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              {m.overdueTasks > 0 && <AlertTriangle className="w-3 h-3" style={{ color: overdueColor }} />}
              <span className="text-[18px] font-bold tabular-nums leading-tight" style={{ color: overdueColor }}>
                {m.overdueTasks}
              </span>
            </div>
            <span className="text-[10.5px] sm:hidden" style={{ color: "var(--text-3)" }}>Po termínu</span>
          </div>
        </div>

        {/* Completed this month */}
        <div className="sm:flex sm:justify-center sm:items-center">
          <StatCell value={m.completedThisMonth} color="var(--success)" label="Hotovo" />
        </div>

        {/* Hours this month */}
        <div className="sm:flex sm:justify-center sm:items-center">
          <StatCell value={m.hoursThisMonth} color="var(--info)" label="Hodiny" />
        </div>
      </div>
    </Link>
  );
}
