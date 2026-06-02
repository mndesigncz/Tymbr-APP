"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="flex items-end justify-between px-6 lg:px-8 pt-8 pb-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight" style={{ color: "var(--text-1)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] mt-1" style={{ color: "var(--text-2)" }}>{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </header>
  );
}
