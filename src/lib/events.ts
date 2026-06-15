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
