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
        <label className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>{label}</label>
      )}
      <textarea
        className={cn(
          "w-full border rounded-lg px-3 py-2 text-[13px] resize-none transition-colors placeholder:opacity-40 focus:outline-none",
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
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
