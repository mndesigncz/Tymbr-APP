"use client";

import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e] bg-[#0f0f0f]/80 backdrop-blur-sm sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button className="relative p-2 rounded-xl hover:bg-[#1e1e1e] text-gray-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
        </button>
        {session?.user && (
          <Avatar name={session.user.name || "?"} src={session.user.image} size="md" />
        )}
      </div>
    </header>
  );
}
