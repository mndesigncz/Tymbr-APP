import { prisma } from "@/lib/prisma";

/** Relations attached to every event response. */
export const eventInclude = {
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  task: { select: { id: true, title: true, status: true, priority: true, dueDate: true } },
  assignees: {
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

/** Flatten the EventAssignee join rows into a plain User[] on `assignees`. */
export function serializeEvent<T extends { assignees?: { user: unknown }[] }>(event: T) {
  const { assignees, ...rest } = event;
  return { ...rest, assignees: Array.isArray(assignees) ? assignees.map((a) => a.user) : [] };
}

/**
 * Expand a recurring event into all occurrences that overlap [from, to].
 * Non-recurring events are returned as-is. Expansion is capped at 2 years.
 */
export function expandRecurring<T extends { startAt: Date | string; endAt: Date | string; recurring?: string | null; recurringUntil?: Date | string | null }>(
  event: T,
  from: Date,
  to: Date,
): T[] {
  const pattern = (event as any).recurring ?? "none";
  if (!pattern || pattern === "none") return [event];

  const baseStart = new Date(event.startAt);
  const duration = new Date(event.endAt).getTime() - baseStart.getTime();

  const hardCap = new Date(baseStart.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
  const seriesEnd = event.recurringUntil ? new Date(event.recurringUntil) : hardCap;
  const windowEnd = to < seriesEnd ? to : seriesEnd;

  const results: T[] = [];
  let cursor = new Date(baseStart);
  let safety = 0;

  while (cursor <= windowEnd && safety < 1500) {
    safety++;
    const occEnd = new Date(cursor.getTime() + duration);
    if (occEnd >= from) {
      results.push({ ...event, startAt: new Date(cursor), endAt: occEnd });
    }
    const next = new Date(cursor);
    if (pattern === "daily") next.setDate(next.getDate() + 1);
    else if (pattern === "weekly") next.setDate(next.getDate() + 7);
    else if (pattern === "monthly") next.setMonth(next.getMonth() + 1);
    else if (pattern === "yearly") next.setFullYear(next.getFullYear() + 1);
    else break;
    cursor = next;
  }

  return results;
}

/**
 * Replace an event's assignees with the given user ids. Uses raw SQL so the
 * Prisma 7 + pg adapter doesn't trip over id generation on the junction table.
 */
export async function syncEventAssignees(eventId: string, userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];

  if (unique.length > 0) {
    const placeholders = unique.map((_, i) => `$${i + 2}`).join(", ");
    await prisma.$executeRawUnsafe(
      `DELETE FROM "EventAssignee" WHERE "eventId" = $1 AND "userId" NOT IN (${placeholders})`,
      eventId,
      ...unique,
    );
  } else {
    await prisma.$executeRaw`DELETE FROM "EventAssignee" WHERE "eventId" = ${eventId}`;
  }

  for (const uid of unique) {
    await prisma.$executeRaw`
      INSERT INTO "EventAssignee" (id, "eventId", "userId", "createdAt")
      VALUES (gen_random_uuid()::text, ${eventId}, ${uid}, NOW())
      ON CONFLICT ("eventId", "userId") DO NOTHING
    `;
  }
}
