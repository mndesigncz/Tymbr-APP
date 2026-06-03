"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { TimeTracker } from "./TimeTracker";
import { LayoutDashboard, CheckSquare, Tag, Settings, LogOut, Clock, Users } from "lucide-react";

const navItems = [
  { href: "/dashboard",      icon: LayoutDashboard, label: "Přehled"   },
  { href: "/tasks",          icon: CheckSquare,     label: "Úkoly"     },
  { href: "/categories",     icon: Tag,             label: "Kategorie" },
  { href: "/time",           icon: Clock,           label: "Výkazy"    },
  { href: "/settings/team",  icon: Users,           label: "Tým"       },
  { href: "/settings",       icon: Settings,        label: "Nastavení" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

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
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-all",
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
        })}
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
