"use client";

import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between px-6 h-14 border-b sticky top-0 z-20 backdrop-blur-sm"
      style={{ background: "rgba(9,9,11,0.85)", borderColor: "var(--border)" }}>
      <div>
        <h1 className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{title}</h1>
        {subtitle && (
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {session?.user && (
          <Avatar name={session.user.name || "?"} src={session.user.image} size="sm" className="ml-1" />
        )}
      </div>
    </header>
  );
}
