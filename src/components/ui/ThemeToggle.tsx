"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "noisium:theme";

export function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try { localStorage.setItem(KEY, dark ? "dark" : "light"); } catch {}
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next);
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center justify-between w-full py-2.5 cursor-pointer transition-colors ${className ?? ""}`}
      aria-label={dark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
    >
      <span className="text-[14px]" style={{ color: "var(--text-1)" }}>
        {dark ? "Tmavý režim" : "Tmavý režim"}
      </span>
      <div className="flex items-center gap-2">
        {dark ? (
          <Moon className="w-4 h-4" style={{ color: "var(--accent)" }} />
        ) : (
          <Sun className="w-4 h-4" style={{ color: "var(--text-3)" }} />
        )}
        <div className="relative">
          <div className="w-10 h-6 rounded-full transition-colors"
            style={{ background: dark ? "var(--accent)" : "var(--bg-subtle)" }} />
          <div
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
            style={{ transform: dark ? "translateX(16px)" : "translateX(0)" }}
          />
        </div>
      </div>
    </button>
  );
}
