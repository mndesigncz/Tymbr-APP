import { Badge } from "@/components/ui/Badge";
import { STATUS_COLORS, STATUS_LABELS, type TaskStatus } from "@/types";

export function StatusBadge({ status }: { status: string }) {
  const s = status as TaskStatus;
  return (
    <Badge color={STATUS_COLORS[s] || "#6B7280"} dot>
      {STATUS_LABELS[s] || status}
    </Badge>
  );
}
