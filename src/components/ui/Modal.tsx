"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        className={cn("relative w-full rounded-3xl z-10 flex flex-col max-h-[90vh] sm:max-h-[88vh] animate-scale-in", sizes[size])}
        style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-overlay)" }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
            <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zavřít"
              className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ color: "var(--text-3)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="px-6 pb-6 pt-2 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
