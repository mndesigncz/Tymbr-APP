"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import {
  LayoutDashboard, CheckSquare, Tag, Settings, LogOut, ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Přehled" },
  { href: "/tasks", icon: CheckSquare, label: "Úkoly" },
  { href: "/categories", icon: Tag, label: "Kategorie" },
  { href: "/settings", icon: Settings, label: "Nastavení" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#111111] border-r border-[#1e1e1e] h-screen sticky top-0">
      <div className="p-6 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
            <CheckSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Tymbr</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                active
                  ? "bg-orange-500/10 text-orange-400"
                  : "text-gray-400 hover:bg-[#1e1e1e] hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-orange-400" : "")} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-4 h-4 text-orange-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#1e1e1e]">
        {session?.user && (
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#1e1e1e] transition-colors group mb-2">
            <Avatar name={session.user.name || "?"} src={session.user.image} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Odhlásit se
        </button>
      </div>
    </aside>
  );
}
