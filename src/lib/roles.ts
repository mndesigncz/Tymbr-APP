export type TeamRole = "owner" | "admin" | "member" | null | undefined;

export function isManager(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

export function isOwner(role: TeamRole): boolean {
  return role === "owner";
}
