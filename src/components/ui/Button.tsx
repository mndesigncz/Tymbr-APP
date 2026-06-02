"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

  const variants: Record<string, string> = {
    primary:   "bg-orange-500 hover:bg-orange-600 text-white",
    secondary: "hover:text-white border",
    ghost:     "hover:text-white",
    danger:    "text-red-400 hover:text-red-300",
    outline:   "border hover:text-white",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    secondary: { background: "var(--bg-hover)", borderColor: "var(--border)", color: "var(--text-2)" },
    ghost:     { color: "var(--text-2)" },
    danger:    {},
    outline:   { borderColor: "var(--border-md)", color: "var(--text-2)" },
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[13px]",
    md: "px-4 py-2 text-[13px]",
    lg: "px-5 py-2.5 text-[14px]",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      style={variant !== "primary" && variant !== "danger" ? variantStyles[variant] : undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}
