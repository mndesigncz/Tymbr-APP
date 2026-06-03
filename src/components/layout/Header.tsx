"use client";

import { ProfileMenu } from "./ProfileMenu";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-4 lg:px-8 pt-6 pb-5">
      <div className="min-w-0">
        <h1 className="text-[24px] sm:text-[26px] font-bold tracking-tight leading-tight truncate" style={{ color: "var(--text-1)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13.5px] mt-0.5 truncate" style={{ color: "var(--text-2)" }}>{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {actions}
        {/* Avatar profile button — desktop only; desktop uses sidebar user card */}
        <div className="lg:hidden">
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
