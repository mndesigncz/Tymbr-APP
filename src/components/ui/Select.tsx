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
        <label className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>{label}</label>
      )}
      <div className="relative">
        <select
          className={cn(
            "w-full border rounded-lg px-3 py-2 text-[13px] appearance-none pr-8 transition-colors",
            "focus:outline-none",
            error && "border-red-500/60",
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
            <option key={o.value} value={o.value} style={{ background: "#18181b" }}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
          style={{ color: "var(--text-3)" }} />
      </div>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
