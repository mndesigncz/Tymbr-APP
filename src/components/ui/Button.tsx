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
  style: propsStyle,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

  const variants: Record<string, string> = {
    primary:   "text-white shadow-sm hover:opacity-90",
    secondary: "border hover:bg-[var(--hover)]",
    ghost:     "hover:bg-[var(--hover)]",
    danger:    "text-red-500 hover:bg-red-50",
    outline:   "border hover:bg-[var(--hover)]",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary:   { background: "var(--accent)" },
    secondary: { background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" },
    ghost:     { color: "var(--text-2)" },
    danger:    {},
    outline:   { borderColor: "var(--border-md)", color: "var(--text-2)" },
  };

  const sizes = {
    sm: "px-3.5 py-2 text-[13px]",
    md: "px-4 py-2.5 text-[13.5px]",
    lg: "px-5 py-3 text-[14px]",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      style={{ ...(variant !== "danger" ? variantStyles[variant] : {}), ...propsStyle }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
