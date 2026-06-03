"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CheckSquare, Clock, MessageSquare, Users } from "lucide-react";

const navItems = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Přehled"  },
  { href: "/tasks",         icon: CheckSquare,     label: "Úkoly"    },
  { href: "/chat",          icon: MessageSquare,   label: "Chat"     },
  { href: "/time",          icon: Clock,           label: "Výkazy"   },
  { href: "/settings/team", icon: Users,           label: "Tým"      },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl"
      style={{ background: "rgba(255,255,255,0.85)", borderColor: "var(--border)" }}>
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
              <Icon className={cn("w-[20px] h-[20px]", active && "stroke-[2.4]")} />
              <span className="text-[9.5px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
