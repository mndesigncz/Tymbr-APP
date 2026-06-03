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
