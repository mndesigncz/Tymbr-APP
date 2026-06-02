"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CheckSquare, Tag, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Přehled"   },
  { href: "/tasks",      icon: CheckSquare,     label: "Úkoly"     },
  { href: "/categories", icon: Tag,             label: "Kategorie" },
  { href: "/settings",   icon: Settings,        label: "Nastavení" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-sm"
      style={{ background: "rgba(17,17,19,0.95)", borderColor: "var(--border)" }}>
      <div className="flex items-center pb-safe">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
              style={{ color: active ? "var(--accent)" : "var(--text-3)" }}
            >
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
