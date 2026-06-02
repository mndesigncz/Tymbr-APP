import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>{label}</label>
      )}
      <div className="relative">
        <select
          className={cn(
            "w-full border rounded-xl px-3.5 py-2.5 text-[14px] appearance-none pr-9 transition-all cursor-pointer",
            "focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]",
            error && "border-red-400",
            className
          )}
          style={{
            background: "var(--bg-card)",
            borderColor: error ? undefined : "var(--border-md)",
            color: "var(--text-1)",
          }}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--text-3)" }} />
      </div>
      {error && <span className="text-[12px] text-red-500">{error}</span>}
    </div>
  );
}
