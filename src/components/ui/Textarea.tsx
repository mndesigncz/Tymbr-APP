import { cn } from "@/lib/utils";
import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>{label}</label>
      )}
      <textarea
        className={cn(
          "w-full border rounded-xl px-3.5 py-2.5 text-[14px] resize-none transition-all",
          "placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]",
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
      {error && <span className="text-[12px] text-red-500">{error}</span>}
    </div>
  );
}
