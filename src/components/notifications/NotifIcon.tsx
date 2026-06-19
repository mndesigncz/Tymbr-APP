import {
  ClipboardCheck, MessageSquareText, RefreshCw, AlarmClock, Sparkles,
  CalendarClock, AtSign, Send, UserPlus, Users, Megaphone, Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Brand-styled notification glyphs. Replaces the old emoji set with the app's
 * own Lucide line-icon language — each type gets an icon + an accent hue, shown
 * inside a soft tinted rounded-square chip to match the rest of the UI.
 */
export const NOTIF_ICON_MAP: Record<string, { Icon: LucideIcon; color: string }> = {
  task_assigned:        { Icon: ClipboardCheck,    color: "#f7592f" },
  task_comment:         { Icon: MessageSquareText, color: "#2f7df7" },
  task_status:          { Icon: RefreshCw,         color: "#8b5cf6" },
  task_due_soon:        { Icon: AlarmClock,        color: "#f59e0b" },
  task_created_in_team: { Icon: Sparkles,          color: "#f7592f" },
  event_assigned:       { Icon: CalendarClock,     color: "#0ea5e9" },
  mention:              { Icon: AtSign,            color: "#f7592f" },
  direct_message:       { Icon: Send,              color: "#2f7df7" },
  invitation:           { Icon: UserPlus,          color: "#22c55e" },
  member_joined:        { Icon: Users,             color: "#22c55e" },
  content_assigned:     { Icon: Megaphone,         color: "#f7592f" },
  // legacy aliases
  comment:              { Icon: MessageSquareText, color: "#2f7df7" },
  status_change:        { Icon: RefreshCw,         color: "#8b5cf6" },
};

export function NotifIcon({ type, size = 18 }: { type: string; size?: number }) {
  const { Icon, color } = NOTIF_ICON_MAP[type] ?? { Icon: Bell, color: "var(--accent)" };
  const box = size + 18;
  return (
    <span
      className="flex items-center justify-center rounded-xl flex-shrink-0"
      style={{
        width: box,
        height: box,
        background: `color-mix(in srgb, ${color} 13%, transparent)`,
        color,
      }}
    >
      <Icon style={{ width: size, height: size }} strokeWidth={2} />
    </span>
  );
}
