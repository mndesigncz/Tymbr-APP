"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { LayoutDashboard, CheckSquare, Tag, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Přehled" },
  { href: "/tasks",     icon: CheckSquare,     label: "Úkoly"   },
  { href: "/categories",icon: Tag,             label: "Kategorie"},
  { href: "/settings",  icon: Settings,        label: "Nastavení"},
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 border-r"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>

      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}>
            <CheckSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
            Tymbr
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors",
                active
                  ? "text-white"
                  : "hover:text-white transition-colors"
              )}
              style={active
                ? { background: "var(--bg-hover)", color: "var(--text-1)" }
                : { color: "var(--text-2)" }
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t space-y-0.5" style={{ borderColor: "var(--border)" }}>
        {session?.user && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
            style={{ color: "var(--text-2)" }}>
            <Avatar name={session.user.name || "?"} src={session.user.image} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                {session.user.name}
              </p>
              <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>
                {session.user.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors hover:text-red-400"
          style={{ color: "var(--text-2)" }}
        >
          <LogOut className="w-4 h-4" />
          Odhlásit se
        </button>
      </div>
    </aside>
  );
}
