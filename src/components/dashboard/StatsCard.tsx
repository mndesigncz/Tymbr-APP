import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  trend?: { value: number; label: string };
}

export function StatsCard({ title, value, icon: Icon, color = "#F97316", trend }: StatsCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-5 hover:border-[#3d3d3d] transition-all">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-1 rounded-lg",
              trend.value >= 0
                ? "text-green-400 bg-green-500/10"
                : "text-red-400 bg-red-500/10"
            )}
          >
            {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}
