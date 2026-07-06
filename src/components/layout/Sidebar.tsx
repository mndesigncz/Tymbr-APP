"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { TimeTracker } from "./TimeTracker";
import { TeamSwitcher } from "./TeamSwitcher";
import { useChatUnread } from "@/hooks/useChatUnread";
import { parsePermissions, canSeeTab, isManager } from "@/lib/roles";
import {
  LayoutDashboard, CheckSquare, Tag, LogOut, Settings,
  Clock, Users, MessageSquare, ChevronDown, Settings2, FolderOpen, Webhook,
  Calendar, Megaphone, BookOpen, Palmtree,
} from "lucide-react";

const topItems = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Přehled",    permKey: "dashboard"  },
  { href: "/tasks",      icon: CheckSquare,     label: "Úkoly",      permKey: "tasks"      },
  { href: "/calendar",   icon: Calendar,        label: "Kalendář",   permKey: "calendar"   },
  { href: "/vacation",   icon: Palmtree,        label: "Dovolená",   permKey: "vacation"   },
  { href: "/notes",      icon: BookOpen,        label: "Poznámky",   permKey: "notes"      },
  { href: "/categories", icon: Tag,             label: "Funkce",     permKey: "categories" },
  { href: "/time",       icon: Clock,           label: "Výkazy",     permKey: "time"       },
];

const teamItems = [
  { href: "/chat",    icon: MessageSquare, label: "Chat",         permKey: "chat"    },
  { href: "/files",   icon: FolderOpen,    label: "Soubory",      permKey: "files"   },
  { href: "/content", icon: Megaphone,     label: "Content plán", permKey: "content" },
];

// Settings items are manager-only (gated by role, not permissions)
const settingsItems = [
  { href: "/settings/team",     icon: Settings2, label: "Nastavení týmu" },
  { href: "/settings/webhooks", icon: Webhook,   label: "Integrace"      },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const chatUnread = useChatUnread();

  const userRole = (session?.user as any)?.teamRole as string | null;
  const perms = parsePermissions((session?.user as any)?.permissions);
  const isManagerUser = isManager(userRole as any);

  const visibleTopItems = topItems.filter(({ permKey }) => canSeeTab(permKey, userRole, perms));
  const visibleTeamItems = teamItems.filter(({ permKey }) => canSeeTab(permKey, userRole, perms));
  const visibleSettingsItems = isManagerUser ? settingsItems : [];

  const teamActive = visibleTeamItems.some(
    ({ href }) => pathname === href || pathname.startsWith(href)
  );
  const settingsActive = visibleSettingsItems.some(
    ({ href }) => pathname === href || pathname.startsWith(href)
  );
  const [teamOpen, setTeamOpen] = useState(teamActive);
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (teamActive) setTeamOpen(true);
  }, [teamActive]);

  useEffect(() => {
    if (settingsActive) setSettingsOpen(true);
  }, [settingsActive]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  const renderLink = (href: string, Icon: React.ElementType, label: string, indent = false, badge = false) => {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex items-center gap-3 py-2.5 rounded-2xl text-[14px] font-medium transition-all",
          indent ? "px-6" : "px-3.5",
          !active && "hover:bg-[var(--hover)]"
        )}
        style={active
          ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
          : { color: "var(--text-2)" }
        }
      >
        <div className="relative flex-shrink-0">
          <Icon className="w-[18px] h-[18px]"
            style={{ color: active ? "var(--accent)" : "var(--text-2)", strokeWidth: active ? 2.2 : 1.9 }} />
          {badge && !active && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </div>
        {label}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col w-[244px] h-screen sticky top-0 p-3"
      style={{ background: "var(--bg-page)" }}>

      {/* Logo */}
      <div className="px-3 h-16 flex items-center">
        <div className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/icon-192.png"
            alt="Noisium"
            width={32}
            height={32}
            className="w-8 h-8 rounded-xl shadow-sm flex-shrink-0"
            priority
          />
          <span className="text-[17px] font-bold tracking-tight truncate" style={{ color: "var(--text-1)" }}>
            Noisium
          </span>
        </div>
      </div>

      {/* Team switcher */}
      <TeamSwitcher />

      {/* Navigation */}
      <nav className="flex-1 mt-3 space-y-1">
        {visibleTopItems.map(({ href, icon, label }) => renderLink(href, icon, label))}

        {/* Collapsible Tým group — hidden when no team items visible */}
        {visibleTeamItems.length > 0 && (
          <div>
            <button
              onClick={() => setTeamOpen((o) => !o)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[14px] font-medium transition-all",
                !teamActive && "hover:bg-[var(--hover)]"
              )}
              style={teamActive
                ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                : { color: "var(--text-2)" }
              }
            >
              <Users className="w-[18px] h-[18px] flex-shrink-0"
                style={{ color: teamActive ? "var(--accent)" : "var(--text-2)" }} />
              <span className="flex-1 text-left">Tým</span>
              <ChevronDown
                className="w-[14px] h-[14px] transition-transform"
                style={{
                  color: teamActive ? "var(--accent)" : "var(--text-3)",
                  transform: teamOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
            {teamOpen && (
              <div className="mt-1 space-y-1">
                {visibleTeamItems.map(({ href, icon, label }) =>
                  renderLink(href, icon, label, true, href === "/chat" && chatUnread)
                )}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Nastavení group — manager only */}
        {visibleSettingsItems.length > 0 && (
          <div>
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[14px] font-medium transition-all",
                !settingsActive && "hover:bg-[var(--hover)]"
              )}
              style={settingsActive
                ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                : { color: "var(--text-2)" }
              }
            >
              <Settings className="w-[18px] h-[18px] flex-shrink-0"
                style={{ color: settingsActive ? "var(--accent)" : "var(--text-2)" }} />
              <span className="flex-1 text-left">Nastavení</span>
              <ChevronDown
                className="w-[14px] h-[14px] transition-transform"
                style={{
                  color: settingsActive ? "var(--accent)" : "var(--text-3)",
                  transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
            {settingsOpen && (
              <div className="mt-1 space-y-1">
                {visibleSettingsItems.map(({ href, icon, label }) =>
                  renderLink(href, icon, label, true)
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Time tracker widget */}
      <TimeTracker />

      {/* User card — clicking opens profile dropdown */}
      {session?.user && (
        <div ref={profileRef} className="mt-1 relative">
          {/* Dropdown opens upward */}
          {profileOpen && (
            <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl border z-50 overflow-hidden glass-strong animate-scale-in"
              style={{
                borderColor: "var(--border-md)",
                boxShadow: "var(--shadow-overlay)",
              }}>
              <div className="py-1.5">
                <Link href="/settings" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-[var(--hover)]"
                  style={{ color: "var(--text-1)" }}>
                  <Settings className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                  Nastavení účtu
                </Link>
                <Link href="/settings/team" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-[var(--hover)]"
                  style={{ color: "var(--text-1)" }}>
                  <Users className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                  Správa týmu
                </Link>
              </div>
              <div className="border-t pb-1.5" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-[var(--danger-soft)] text-left"
                  style={{ color: "var(--danger)" }}>
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  Odhlásit se
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-1 transition-all hover:opacity-80 text-left"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)" }}>
            <Avatar name={session.user.name || "?"} src={session.user.image} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                {session.user.name}
              </p>
              <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>
                {session.user.email}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
              style={{
                color: "var(--text-3)",
                transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
              }} />
          </button>
        </div>
      )}
    </aside>
  );
}
