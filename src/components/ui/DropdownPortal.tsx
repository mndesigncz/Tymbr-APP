"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Pos {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/**
 * Renders dropdown content as a fixed portal on document.body,
 * bypassing all overflow/clip ancestor containers.
 *
 * @param triggerRef - ref attached to the button that opens the dropdown
 * @param open       - whether the dropdown is visible
 * @param onClose    - called when the backdrop is clicked
 * @param align      - "left" aligns dropdown to trigger's left edge; "right" to its right edge
 * @param anchor     - "bottom" opens below the trigger; "top" opens above it
 */
export function DropdownPortal({
  triggerRef,
  open,
  onClose,
  align = "left",
  anchor = "bottom",
  children,
  className,
  style,
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
  anchor?: "bottom" | "top";
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const r = triggerRef.current.getBoundingClientRect();
    const p: Pos = {};
    if (anchor === "bottom") p.top = r.bottom + 4;
    else p.bottom = window.innerHeight - r.top + 4;
    if (align === "left") p.left = r.left;
    else p.right = window.innerWidth - r.right;
    setPos(p);
  }, [open, triggerRef, align, anchor]);

  if (!mounted || !open || !pos) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9990]" onClick={onClose} />
      <div
        className={className}
        style={{ position: "fixed", zIndex: 9999, ...pos, ...style }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
