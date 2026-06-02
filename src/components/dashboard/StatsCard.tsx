import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
}

export function StatsCard({ title, value, icon: Icon, color = "#F97316" }: StatsCardProps) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-1)" }}>{value}</p>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>{title}</p>
      </div>
    </div>
  );
}
