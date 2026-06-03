"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { TimeTracker } from "./TimeTracker";
import {
  LayoutDashboard, CheckSquare, Tag, LogOut,
  Clock, Users, MessageSquare, ChevronDown, Settings2,
} from "lucide-react";

const topItems = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Přehled"   },
  { href: "/tasks",      icon: CheckSquare,     label: "Úkoly"     },
  { href: "/categories", icon: Tag,             label: "Kategorie" },
  { href: "/time",       icon: Clock,           label: "Výkazy"    },
];

const teamItems = [
  { href: "/chat",          icon: MessageSquare, label: "Chat"           },
  { href: "/settings/team", icon: Settings2,     label: "Nastavení týmu" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const teamActive = teamItems.some(
    ({ href }) => pathname === href || pathname.startsWith(href)
  );
  const [teamOpen, setTeamOpen] = useState(teamActive);

  useEffect(() => {
    if (teamActive) setTeamOpen(true);
  }, [teamActive]);

  const renderLink = (href: string, Icon: React.ElementType, label: string, indent = false) => {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex items-center gap-3 py-2.5 rounded-xl text-[14px] font-medium transition-all",
          indent ? "px-6" : "px-3.5",
          !active && "hover:bg-black/[0.035]"
        )}
        style={active
          ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
          : { color: "var(--text-2)" }
        }
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0"
          style={{ color: active ? "var(--accent)" : "var(--text-2)" }} />
        {label}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col w-[244px] h-screen sticky top-0 p-3"
      style={{ background: "var(--bg-page)" }}>

      {/* Logo */}
      <div className="px-3 h-16 flex items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: "var(--accent)" }}>
            <CheckSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-[17px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
            Tymbr
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-2 space-y-1">
        {topItems.map(({ href, icon, label }) => renderLink(href, icon, label))}

        {/* Collapsible Tým group */}
        <div>
          <button
            onClick={() => setTeamOpen((o) => !o)}
            className={cn(
              "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-all",
              !teamActive && "hover:bg-black/[0.035]"
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
              {teamItems.map(({ href, icon, label }) => renderLink(href, icon, label, true))}
            </div>
          )}
        </div>
      </nav>

      {/* Time tracker widget */}
      <TimeTracker />

      {/* User card */}
      <div className="mt-1">
        {session?.user && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl mb-1"
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
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-lg transition-colors hover:bg-black/[0.04]"
              style={{ color: "var(--text-3)" }}
              title="Odhlásit se"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
