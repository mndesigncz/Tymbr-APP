"use client";

import { Badge } from "@/components/ui/Badge";
import { useStatusConfig, statusLabel, statusColor } from "@/hooks/useStatusConfig";

export function StatusBadge({ status }: { status: string }) {
  const statuses = useStatusConfig();
  return (
    <Badge color={statusColor(statuses, status)} dot>
      {statusLabel(statuses, status)}
    </Badge>
  );
}
