import { prisma } from "./prisma";

// The current open shift for a team (no side effects).
export async function getActiveShift(teamId: string) {
  return prisma.shift.findFirst({ where: { teamId, status: "open" }, orderBy: { openedAt: "desc" } });
}

// The open shift, opening a new one if none is running (auto-open on first arrival).
export async function getOrOpenActiveShift(teamId: string) {
  const existing = await getActiveShift(teamId);
  if (existing) return existing;
  return prisma.shift.create({ data: { teamId } });
}
