"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useChatUnread } from "@/hooks/useChatUnread";
import {
  LayoutDashboard, CheckSquare, Clock, MessageSquare,
  MoreHorizontal, FolderOpen, Tag, Settings, Users, X, Webhook,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Přehled", chat: false },
  { href: "/tasks",     icon: CheckSquare,     label: "Úkoly",   chat: false },
  { href: "/chat",      icon: MessageSquare,   label: "Chat",    chat: true  },
  { href: "/time",      icon: Clock,           label: "Výkazy",  chat: false },
];

const moreItems = [
  { href: "/categories",         icon: Tag,        label: "Funkce"          },
  { href: "/files",              icon: FolderOpen, label: "Soubory"         },
  { href: "/settings/team",      icon: Users,      label: "Nastavení týmu"  },
  { href: "/settings/webhooks",  icon: Webhook,    label: "Webhooks"        },
  { href: "/settings",           icon: Settings,   label: "Nastavení účtu"  },
];

export function BottomNav() {
  const pathname = usePathname();
  const chatUnread = useChatUnread();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = moreItems.some(
    ({ href }) => pathname === href || pathname.startsWith(href)
  );

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl"
        style={{ background: "var(--nav-bg)", borderColor: "var(--border)" }}
      >
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

          {/* Více button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
            style={{ color: moreActive ? "var(--accent)" : "var(--text-3)" }}
          >
            <MoreHorizontal className={cn("w-[20px] h-[20px]", moreActive && "stroke-[2.4]")} />
            <span className="text-[9.5px] font-medium">Více</span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          onClick={() => setMoreOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl px-4 pt-4 pb-8"
            style={{ background: "var(--bg-card)", boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border-md, #e5e7eb)" }} />

            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>Další stránky</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ color: "var(--text-3)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {moreItems.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors"
                    style={{
                      background: active ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "var(--bg-subtle)",
                      color: active ? "var(--accent)" : "var(--text-1)",
                    }}
                  >
                    <Icon
                      className="w-[18px] h-[18px] flex-shrink-0"
                      style={{ color: active ? "var(--accent)" : "var(--text-2)" }}
                    />
                    <span className="text-[14px] font-medium">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
