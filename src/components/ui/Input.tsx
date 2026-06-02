import { cn } from "@/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }}>
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full border rounded-xl px-3.5 py-2.5 text-[14px] transition-all",
            "placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]",
            icon && "pl-10",
            error && "border-red-400",
            className
          )}
          style={{
            background: "var(--bg-card)",
            borderColor: error ? undefined : "var(--border-md)",
            color: "var(--text-1)",
          }}
          {...props}
        />
      </div>
      {error && <span className="text-[12px] text-red-500">{error}</span>}
    </div>
  );
}
