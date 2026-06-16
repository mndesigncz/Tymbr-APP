// Central place for team-role logic so UI and API agree on who is a "manager".
// Managers (owner / admin) can see other members' stats and use admin features;
// regular members are limited to their own data.

export type TeamRole = "owner" | "admin" | "member" | null | undefined;

export function isManager(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

export function isOwner(role: TeamRole): boolean {
  return role === "owner";
}

// All nav sections that can be granted/revoked for regular members.
// Managers always see everything regardless of this list.
export const MEMBER_NAV_TABS = [
  { key: "dashboard",  label: "Přehled",      href: "/dashboard"  },
  { key: "tasks",      label: "Úkoly",        href: "/tasks"      },
  { key: "calendar",   label: "Kalendář",     href: "/calendar"   },
  { key: "chat",       label: "Chat",         href: "/chat"       },
  { key: "categories", label: "Funkce",       href: "/categories" },
  { key: "time",       label: "Výkazy",       href: "/time"       },
  { key: "files",      label: "Soubory",      href: "/files"      },
  { key: "content",    label: "Content plán", href: "/content"    },
  { key: "notes",      label: "Poznámky",     href: "/notes"      },
] as const;

export type NavTabKey = (typeof MEMBER_NAV_TABS)[number]["key"];

/** Parse the raw JSON permissions string stored in TeamMember / JWT. Returns null when no restrictions. */
export function parsePermissions(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return null;
  }
}

/**
 * Returns true when the user is allowed to see a given tab.
 * Managers (owner/admin) always return true.
 * For members: null permissions = unrestricted (all tabs visible);
 * a string array = only those keys are visible.
 */
export function canSeeTab(
  key: string,
  role: string | null | undefined,
  permissions: string[] | null,
): boolean {
  if (isManager(role as TeamRole)) return true;
  if (!permissions) return true;
  return permissions.includes(key);
}
