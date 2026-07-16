"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { TimeTracker } from "./TimeTracker";
import { TeamSwitcher } from "./TeamSwitcher";
import { useChatUnread } from "@/hooks/useChatUnread";
import { parsePermissions, canSeeTab, isManager, canSeeFinance } from "@/lib/roles";
import {
  LayoutDashboard, CheckSquare, Tag, LogOut, Settings,
  Users, MessageSquare, ChevronDown, Settings2, FolderOpen, Webhook, KeyRound,
  Calendar, Megaphone, BookOpen, Palmtree, Briefcase, Contact, FileText, Gauge,
  Boxes, Wrench,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  permKey?: string;
  financeOnly?: boolean;
  managerOnly?: boolean;
  badge?: "chat";
}

interface NavGroup {
  key: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

// Daily drivers — always flat at the top.
const primaryItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Přehled",  permKey: "dashboard" },
  { href: "/tasks",     icon: CheckSquare,     label: "Úkoly",    permKey: "tasks" },
  { href: "/calendar",  icon: Calendar,        label: "Kalendář", permKey: "calendar" },
  { href: "/notes",     icon: BookOpen,        label: "Poznámky", permKey: "notes" },
  { href: "/chat",      icon: MessageSquare,   label: "Chat",     permKey: "chat", badge: "chat" },
];

// Everything else lives in collapsible groups so the sidebar stays scannable.
const navGroups: NavGroup[] = [
  {
    key: "tools", label: "Nástroje", icon: Wrench,
    items: [
      { href: "/files",    icon: FolderOpen, label: "Soubory",      permKey: "files" },
      { href: "/content",  icon: Megaphone,  label: "Content plán", permKey: "content" },
      { href: "/vacation", icon: Palmtree,   label: "Dovolená",     permKey: "vacation" },
    ],
  },
  {
    key: "business", label: "Zakázky", icon: Boxes,
    items: [
      { href: "/projects", icon: Briefcase, label: "Projekty",  permKey: "projects" },
      { href: "/clients",  icon: Contact,   label: "Klienti",   permKey: "clients" },
      { href: "/invoices", icon: FileText,  label: "Fakturace", permKey: "invoices", financeOnly: true },
      { href: "/capacity", icon: Gauge,     label: "Vytížení",  permKey: "capacity", financeOnly: true },
    ],
  },
  {
    key: "settings", label: "Nastavení", icon: Settings,
    items: [
      { href: "/categories",        icon: Tag,       label: "Funkce",         permKey: "categories" },
      { href: "/settings/team",     icon: Settings2, label: "Nastavení týmu", managerOnly: true },
      { href: "/settings/webhooks", icon: Webhook,   label: "Integrace",      managerOnly: true },
      { href: "/settings/tokens",   icon: KeyRound,  label: "API tokeny" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const chatUnread = useChatUnread();

  const userRole = (session?.user as any)?.teamRole as string | null;
  const perms = parsePermissions((session?.user as any)?.permissions);
  const isManagerUser = isManager(userRole as any);

  const canSeeItem = (item: NavItem) =>
    item.managerOnly ? isManagerUser
    : item.financeOnly ? canSeeFinance(userRole as any)
    : canSeeTab(item.permKey ?? "", userRole, perms);

  const visiblePrimary = primaryItems.filter(canSeeItem);

  // Only keep groups that have at least one visible item for this user/role.
  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter(canSeeItem) }))
    .filter((g) => g.items.length > 0);

  const isGroupActive = (g: NavGroup) =>
    g.items.some(({ href }) => pathname === href || pathname.startsWith(href));

  // Collapsed/expanded state persists per-device; a group auto-opens when the
  // current route lives inside it.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("noisium:navGroups") ?? "{}");
      if (saved && typeof saved === "object") setOpenGroups(saved);
    } catch { /* ignore */ }
  }, []);
  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: !(prev[key] ?? false) };
      try { localStorage.setItem("noisium:navGroups", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  const renderLink = (href: string, Icon: React.ElementType, label: string, indent = false, badge = false) => {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex items-center gap-3 py-2.5 rounded-2xl text-[14px] font-medium transition-all",
          indent ? "px-6" : "px-3.5",
          !active && "hover:bg-[var(--hover)]"
        )}
        style={active
          ? { background: "var(--bg-card)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
          : { color: "var(--text-2)" }
        }
      >
        <div className="relative flex-shrink-0">
          <Icon className="w-[18px] h-[18px]"
            style={{ color: active ? "var(--accent)" : "var(--text-2)", strokeWidth: active ? 2.2 : 1.9 }} />
          {badge && !active && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </div>
        {label}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col w-[244px] h-screen sticky top-0 p-3"
      style={{ background: "var(--bg-page)" }}>

      {/* Logo */}
      <div className="px-3 h-16 flex items-center">
        <div className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/icon-192.png"
            alt="Noisium"
            width={32}
            height={32}
            className="w-8 h-8 rounded-xl shadow-sm flex-shrink-0"
            priority
          />
          <span className="text-[17px] font-bold tracking-tight truncate" style={{ color: "var(--text-1)" }}>
            Noisium
          </span>
        </div>
      </div>

      {/* Team switcher */}
      <TeamSwitcher />

      {/* Navigation — scrolls independently when it overflows */}
      <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar mt-3 space-y-1">
        {visiblePrimary.map((item) =>
          renderLink(item.href, item.icon, item.label, false, item.badge === "chat" && chatUnread)
        )}

        {visibleGroups.map((group) => {
          const active = isGroupActive(group);
          // A group is open when explicitly toggled, or (untouched) when it holds the active route.
          const open = openGroups[group.key] ?? active;
          const GroupIcon = group.icon;
          return (
            <div key={group.key} className="pt-1">
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-2xl transition-all hover:bg-[var(--hover)]"
              >
                <GroupIcon className="w-[15px] h-[15px] flex-shrink-0"
                  style={{ color: active ? "var(--accent)" : "var(--text-3)" }} />
                <span className="flex-1 text-left text-[11.5px] font-semibold uppercase tracking-wider"
                  style={{ color: active ? "var(--accent)" : "var(--text-3)" }}>
                  {group.label}
                </span>
                {!open && group.items.some((i) => i.badge === "chat" && chatUnread) && (
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                )}
                <ChevronDown
                  className="w-[14px] h-[14px] transition-transform"
                  style={{ color: "var(--text-3)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              {open && (
                <div className="mt-1 space-y-1">
                  {group.items.map((item) =>
                    renderLink(item.href, item.icon, item.label, true, item.badge === "chat" && chatUnread)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Time tracker widget */}
      <TimeTracker />

      {/* User card — clicking opens profile dropdown */}
      {session?.user && (
        <div ref={profileRef} className="mt-1 relative">
          {/* Dropdown opens upward */}
          {profileOpen && (
            <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl border z-50 overflow-hidden glass-strong animate-scale-in"
              style={{
                borderColor: "var(--border-md)",
                boxShadow: "var(--shadow-overlay)",
              }}>
              <div className="py-1.5">
                <Link href="/settings" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-[var(--hover)]"
                  style={{ color: "var(--text-1)" }}>
                  <Settings className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                  Nastavení účtu
                </Link>
                <Link href="/settings/team" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-[var(--hover)]"
                  style={{ color: "var(--text-1)" }}>
                  <Users className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                  Správa týmu
                </Link>
              </div>
              <div className="border-t pb-1.5" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-[var(--danger-soft)] text-left"
                  style={{ color: "var(--danger)" }}>
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  Odhlásit se
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-1 transition-all hover:opacity-80 text-left"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)" }}>
            <Avatar name={session.user.name || "?"} src={session.user.image} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                {session.user.name}
              </p>
              <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>
                {session.user.email}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
              style={{
                color: "var(--text-3)",
                transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
              }} />
          </button>
        </div>
      )}
    </aside>
  );
}
