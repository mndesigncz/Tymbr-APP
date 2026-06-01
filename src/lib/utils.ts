import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";
import { cs } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "–";
  const d = new Date(date);
  if (isToday(d)) return "Dnes";
  if (isTomorrow(d)) return "Zítra";
  return format(d, "d. M. yyyy", { locale: cs });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "–";
  return format(new Date(date), "d. M. yyyy HH:mm", { locale: cs });
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "–";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: cs });
}

export function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  return isPast(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
