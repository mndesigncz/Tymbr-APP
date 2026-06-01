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
        <label className="text-sm font-medium text-gray-300">{label}</label>
      )}
      <textarea
        className={cn(
          "w-full bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 resize-none",
          "focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all",
          error && "border-red-500",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
