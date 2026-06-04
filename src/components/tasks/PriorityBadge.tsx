"use client";

import { Badge } from "@/components/ui/Badge";
import { ArrowDown, ArrowRight, ArrowUp, AlertCircle } from "lucide-react";
import { usePriorityConfig, priorityLabel, priorityColor } from "@/hooks/usePriorityConfig";

const builtinIcons: Record<string, React.ElementType> = {
  low: ArrowDown,
  medium: ArrowRight,
  high: ArrowUp,
  urgent: AlertCircle,
};

export function PriorityBadge({ priority }: { priority: string }) {
  const priorities = usePriorityConfig();
  const cfg = priorities.find((p) => p.key === priority);
  const color = priorityColor(priorities, priority);
  const label = priorityLabel(priorities, priority);
  const Icon = builtinIcons[priority] ?? (cfg?.isUrgent ? AlertCircle : null);

  return (
    <Badge color={color}>
      {Icon ? <Icon className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      {label}
    </Badge>
  );
}
