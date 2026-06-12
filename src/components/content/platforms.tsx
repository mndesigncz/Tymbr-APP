import { Camera, ThumbsUp, Music2, Briefcase, AtSign, Clapperboard, Mail, Globe, Lightbulb, PenLine, CalendarClock, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ContentPlatform, ContentStatus } from "@/types";

/* lucide v1 no longer ships brand icons, so each platform gets a thematic
   glyph + its brand colour, which carries most of the recognition. */
export const PLATFORMS: { key: ContentPlatform; label: string; icon: LucideIcon; color: string }[] = [
  { key: "instagram",  label: "Instagram",  icon: Camera,       color: "#e1306c" },
  { key: "facebook",   label: "Facebook",   icon: ThumbsUp,     color: "#1877f2" },
  { key: "tiktok",     label: "TikTok",     icon: Music2,       color: "#14b8a6" },
  { key: "linkedin",   label: "LinkedIn",   icon: Briefcase,    color: "#0a66c2" },
  { key: "x",          label: "X",          icon: AtSign,       color: "#71717a" },
  { key: "youtube",    label: "YouTube",    icon: Clapperboard, color: "#ff3333" },
  { key: "newsletter", label: "Newsletter", icon: Mail,         color: "#f59e0b" },
  { key: "other",      label: "Jiné",       icon: Globe,        color: "#6b7280" },
];

export const CONTENT_STATUSES: { key: ContentStatus; label: string; icon: LucideIcon; color: string }[] = [
  { key: "idea",      label: "Nápady",       icon: Lightbulb,     color: "#a855f7" },
  { key: "draft",     label: "Příprava",     icon: PenLine,       color: "var(--info)" },
  { key: "scheduled", label: "Naplánováno",  icon: CalendarClock, color: "var(--warning)" },
  { key: "published", label: "Publikováno",  icon: CheckCircle2,  color: "var(--success)" },
];

export const platformCfg = (key: string) => PLATFORMS.find((p) => p.key === key) ?? PLATFORMS[PLATFORMS.length - 1];
export const statusCfg = (key: string) => CONTENT_STATUSES.find((s) => s.key === key) ?? CONTENT_STATUSES[0];
