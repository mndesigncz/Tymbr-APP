import { Badge } from "@/components/ui/Badge";
import { PRIORITY_COLORS, PRIORITY_LABELS, type TaskPriority } from "@/types";
import { ArrowDown, ArrowRight, ArrowUp, AlertCircle } from "lucide-react";

const icons = {
  low: ArrowDown,
  medium: ArrowRight,
  high: ArrowUp,
  urgent: AlertCircle,
};

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority as TaskPriority;
  const Icon = icons[p] || ArrowRight;
  return (
    <Badge color={PRIORITY_COLORS[p] || "#6B7280"}>
      <Icon className="w-3 h-3" />
      {PRIORITY_LABELS[p] || priority}
    </Badge>
  );
}
