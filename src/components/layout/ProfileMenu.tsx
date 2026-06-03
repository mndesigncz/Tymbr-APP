"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Settings, LogOut, Users } from "lucide-react";

export function ProfileMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!session?.user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center rounded-full transition-opacity hover:opacity-80 focus:outline-none"
        aria-label="Profil"
      >
        <Avatar name={session.user.name || "?"} src={session.user.image} size="sm" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[220px] rounded-2xl border z-50 overflow-hidden"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-md)",
            boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,0.12))",
          }}
        >
          {/* User info */}
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
              {session.user.name}
            </p>
            <p className="text-[11.5px] truncate mt-0.5" style={{ color: "var(--text-3)" }}>
              {session.user.email}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-black/[0.035]"
              style={{ color: "var(--text-1)" }}
            >
              <Settings className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
              Nastavení účtu
            </Link>
            <Link
              href="/settings/team"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-black/[0.035]"
              style={{ color: "var(--text-1)" }}
            >
              <Users className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
              Správa týmu
            </Link>
          </div>

          <div className="border-t pb-1.5" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-red-50 text-left"
              style={{ color: "#EF4444" }}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Odhlásit se
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
