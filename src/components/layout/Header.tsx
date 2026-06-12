"use client";

import { ProfileMenu } from "./ProfileMenu";
import { NotificationBell } from "./NotificationBell";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="px-4 sm:px-6 lg:px-8 pt-6 pb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[21px] sm:text-[26px] font-bold tracking-tight leading-tight truncate" style={{ color: "var(--text-1)" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] sm:text-[13.5px] mt-0.5 truncate" style={{ color: "var(--text-2)" }}>{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Desktop: actions inline next to the title */}
          {actions && <div className="hidden lg:flex items-center gap-2">{actions}</div>}
          <NotificationBell />
          {/* Avatar profile button — mobile/tablet only; desktop uses the sidebar user card */}
          <div className="lg:hidden">
            <ProfileMenu />
          </div>
        </div>
      </div>

      {/* Mobile/tablet: compact scrollable action strip below the title */}
      {actions && (
        <div className="lg:hidden mt-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 w-max">
            {actions}
          </div>
        </div>
      )}
    </header>
  );
}
