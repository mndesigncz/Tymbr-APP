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
        <label className="text-sm font-medium text-gray-300">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600",
            "focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all",
            icon && "pl-10",
            error && "border-red-500",
            className
          )}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
