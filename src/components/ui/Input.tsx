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
        <label className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }}>
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full border rounded-lg px-3 py-2 text-[13px] transition-colors",
            "placeholder:opacity-40",
            "focus:outline-none",
            icon && "pl-9",
            error && "border-red-500/60",
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
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
