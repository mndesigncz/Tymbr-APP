"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface ScrollFadeXProps {
  children: React.ReactNode;
  /** Classes applied to the inner scrollable element. */
  className?: string;
  /** Colour the edges fade into — defaults to the page background. */
  fadeColor?: string;
  /** Width of the fade overlays. */
  fadeWidth?: number;
}

// Wraps a horizontally scrollable row and shows a soft fade on whichever
// side still has hidden content — making it obvious the row can be scrolled.
export function ScrollFadeX({
  children,
  className,
  fadeColor = "var(--bg-page)",
  fadeWidth = 32,
}: ScrollFadeXProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setAtStart(scrollLeft <= 1);
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  return (
    <div className="relative">
      <div ref={ref} className={`overflow-x-auto no-scrollbar ${className ?? ""}`}>
        {children}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 transition-opacity duration-200"
        style={{
          width: fadeWidth,
          background: `linear-gradient(to right, ${fadeColor}, transparent)`,
          opacity: atStart ? 0 : 1,
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 transition-opacity duration-200"
        style={{
          width: fadeWidth,
          background: `linear-gradient(to left, ${fadeColor}, transparent)`,
          opacity: atEnd ? 0 : 1,
        }}
      />
    </div>
  );
}
