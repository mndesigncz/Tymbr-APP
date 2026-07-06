"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useChatUnread } from "@/hooks/useChatUnread";
import { parsePermissions, canSeeTab, isManager, canSeeFinance } from "@/lib/roles";
import {
  LayoutDashboard, CheckSquare, Calendar, MessageSquare,
  CircleEllipsis, FolderOpen, Clock, Settings, Users, Webhook, Megaphone, X, BookOpen, Palmtree,
  Briefcase, Contact, FileText, Gauge,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Přehled",  chat: false, permKey: "dashboard" },
  { href: "/tasks",     icon: CheckSquare,     label: "Úkoly",    chat: false, permKey: "tasks"     },
  { href: "/calendar",  icon: Calendar,        label: "Kalendář", chat: false, permKey: "calendar"  },
  { href: "/chat",      icon: MessageSquare,   label: "Chat",     chat: true,  permKey: "chat"      },
];

const moreSections = [
  {
    label: "Práce",
    items: [
      { href: "/projects", icon: Briefcase,  label: "Projekty",     permKey: "projects",   managerOnly: false },
      { href: "/clients",  icon: Contact,    label: "Klienti",      permKey: "clients",    managerOnly: false },
      { href: "/notes",    icon: BookOpen,   label: "Poznámky",     permKey: "notes",      managerOnly: false },
      { href: "/content",  icon: Megaphone,  label: "Content plán", permKey: "content",    managerOnly: false },
      { href: "/files",    icon: FolderOpen, label: "Soubory",      permKey: "files",      managerOnly: false },
    ],
  },
  {
    label: "Tým",
    items: [
      { href: "/vacation",          icon: Palmtree, label: "Dovolená",       permKey: "vacation", managerOnly: false },
      { href: "/invoices",          icon: FileText, label: "Fakturace",      permKey: null,       managerOnly: false, financeOnly: true },
      { href: "/capacity",          icon: Gauge,    label: "Vytížení",       permKey: null,       managerOnly: false, financeOnly: true },
      { href: "/settings/team",     icon: Users,    label: "Nastavení týmu", permKey: null,       managerOnly: true  },
      { href: "/settings/webhooks", icon: Webhook,  label: "Integrace",      permKey: null,       managerOnly: true  },
    ],
  },
  {
    label: "Účet",
    items: [
      { href: "/settings", icon: Settings, label: "Nastavení", permKey: null, managerOnly: false },
    ],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const chatUnread = useChatUnread();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: session } = useSession();

  const userRole = (session?.user as any)?.teamRole as string | null;
  const perms = parsePermissions((session?.user as any)?.permissions);

  const visibleNavItems = navItems.filter(({ permKey }) =>
    canSeeTab(permKey, userRole, perms)
  );

  const visibleMoreSections = moreSections
    .map((section) => ({
      ...section,
      items: section.items.filter(({ permKey, managerOnly, financeOnly }: any) => {
        if (financeOnly) return canSeeFinance(userRole as any);
        if (managerOnly) return isManager(userRole as any);
        if (permKey) return canSeeTab(permKey, userRole, perms);
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const allMoreItems = visibleMoreSections.flatMap((s) => s.items);

  const moreActive = allMoreItems.some(
    ({ href }) => pathname === href || pathname.startsWith(href + "/")
  );

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-2xl backdrop-saturate-150"
        style={{ background: "var(--nav-bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-end pb-safe">
          {visibleNavItems.map(({ href, icon: Icon, label, chat }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
            const showBadge = chat && chatUnread && !active;
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-2 transition-colors"
                style={{ color: active ? "var(--accent)" : "var(--text-3)" }}
              >
                <div className={cn(
                  "w-12 h-8 flex items-center justify-center rounded-full transition-all duration-200",
                  active && "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                )}>
                  <div className="relative">
                    <Icon
                      className="transition-all duration-200"
                      style={{
                        width: 22, height: 22,
                        strokeWidth: active ? 2.3 : 1.9,
                      }}
                    />
                    {showBadge && (
                      <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 border-2"
                        style={{ borderColor: "var(--nav-bg)" }} />
                    )}
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] transition-all duration-200",
                  active ? "font-semibold" : "font-medium"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Více tab — only show when there are items in the sheet */}
          {visibleMoreSections.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-2 transition-colors"
              style={{ color: moreActive ? "var(--accent)" : "var(--text-3)" }}
            >
              <div className={cn(
                "w-12 h-8 flex items-center justify-center rounded-full transition-all duration-200",
                moreActive && "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
              )}>
                <CircleEllipsis
                  className="transition-all duration-200"
                  style={{ width: 22, height: 22, strokeWidth: moreActive ? 2.3 : 1.9 }}
                />
              </div>
              <span className={cn(
                "text-[10px] transition-all duration-200",
                moreActive ? "font-semibold" : "font-medium"
              )}>
                Více
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Bottom sheet overlay */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 animate-overlay-in"
          onClick={() => setMoreOpen(false)}
        >
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[3px]" />

          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-[28px] px-4 pt-3 pb-8 animate-sheet-in glass-strong"
            style={{ boxShadow: "0 -2px 40px rgba(0,0,0,0.14)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-9 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border-md)" }} />

            {/* Header row */}
            <div className="flex items-center justify-between mb-4 px-0.5">
              <h3 className="text-[17px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
                Přehled
              </h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "color-mix(in srgb, var(--text-1) 6%, transparent)", color: "var(--text-2)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sections */}
            <div className="space-y-5">
              {visibleMoreSections.map((section) => (
                <div key={section.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-0.5"
                    style={{ color: "var(--text-3)" }}>
                    {section.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {section.items.map(({ href, icon: Icon, label }) => {
                      const active = pathname === href || pathname.startsWith(href + "/");
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMoreOpen(false)}
                          className="flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
                          style={{
                            background: active
                              ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                              : "color-mix(in srgb, var(--text-1) 5%, transparent)",
                          }}
                        >
                          <Icon
                            className="w-[22px] h-[22px]"
                            style={{ color: active ? "var(--accent)" : "var(--text-2)", strokeWidth: 1.9 }}
                          />
                          <span
                            className="text-[11.5px] font-medium text-center leading-tight"
                            style={{ color: active ? "var(--accent)" : "var(--text-1)" }}
                          >
                            {label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
