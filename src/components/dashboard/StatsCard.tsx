import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  highlight?: boolean;
}

export function StatsCard({ title, value, icon: Icon, color = "#f7592f", highlight }: StatsCardProps) {
  if (highlight) {
    return (
      <div className="rounded-3xl p-6 flex flex-col gap-6 text-white"
        style={{ background: "linear-gradient(135deg, #fb6b3d, #f7592f)", boxShadow: "0 8px 24px rgba(247,89,47,0.28)" }}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/20">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[30px] font-bold tracking-tight leading-none">{value}</p>
          <p className="text-[13px] mt-2 text-white/85">{title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-6 flex flex-col gap-6 border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[30px] font-bold tracking-tight leading-none" style={{ color: "var(--text-1)" }}>{value}</p>
        <p className="text-[13px] mt-2" style={{ color: "var(--text-3)" }}>{title}</p>
      </div>
    </div>
  );
}
