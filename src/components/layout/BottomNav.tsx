"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useChatUnread } from "@/hooks/useChatUnread";
import { LayoutDashboard, CheckSquare, Clock, MessageSquare, Users } from "lucide-react";

const navItems = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Přehled", chat: false },
  { href: "/tasks",         icon: CheckSquare,     label: "Úkoly",   chat: false },
  { href: "/chat",          icon: MessageSquare,   label: "Chat",    chat: true  },
  { href: "/time",          icon: Clock,           label: "Výkazy",  chat: false },
  { href: "/settings/team", icon: Users,           label: "Tým",     chat: false },
];

export function BottomNav() {
  const pathname = usePathname();
  const chatUnread = useChatUnread();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl"
      style={{ background: "rgba(255,255,255,0.85)", borderColor: "var(--border)" }}>
      <div className="flex items-center pb-safe">
        {navItems.map(({ href, icon: Icon, label, chat }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          const showBadge = chat && chatUnread && !active;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
              style={{ color: active ? "var(--accent)" : "var(--text-3)" }}
            >
              <div className="relative">
                <Icon className={cn("w-[20px] h-[20px]", active && "stroke-[2.4]")} />
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
                )}
              </div>
              <span className="text-[9.5px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
