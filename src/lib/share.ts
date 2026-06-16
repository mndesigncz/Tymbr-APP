import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export type ShareResourceType = "note" | "task" | "event";

export function isShareResourceType(v: unknown): v is ShareResourceType {
  return v === "note" || v === "task" || v === "event";
}

/** URL-safe random token for a public share link. */
export function generateShareToken(): string {
  return randomBytes(18).toString("base64url");
}

/**
 * Whether a user is allowed to create / manage a share link for a resource.
 * The rule is simply "can this user see the resource" — owners, collaborators,
 * assignees and team members of a team-visible resource all qualify.
 */
export async function canShareResource(
  type: ShareResourceType,
  resourceId: string,
  userId: string,
  teamId: string | undefined,
): Promise<boolean> {
  const tid = teamId ?? "";

  if (type === "note") {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT n.id FROM "Note" n
      LEFT JOIN "NoteCollaborator" nc ON nc."noteId" = n.id AND nc."userId" = ${userId}
      WHERE n.id = ${resourceId}
        AND (n."createdById" = ${userId} OR nc."userId" = ${userId}
             OR (n.visibility = 'team' AND n."teamId" = ${tid}))
      LIMIT 1`;
    return rows.length > 0;
  }

  if (type === "task") {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT t.id FROM "Task" t
      LEFT JOIN "TaskAssignee" ta ON ta."taskId" = t.id AND ta."userId" = ${userId}
      WHERE t.id = ${resourceId}
        AND (t."createdById" = ${userId} OR t."assigneeId" = ${userId}
             OR ta."userId" = ${userId} OR t."teamId" = ${tid})
      LIMIT 1`;
    return rows.length > 0;
  }

  // event
  const rows = await prisma.$queryRaw<any[]>`
    SELECT e.id FROM "Event" e
    LEFT JOIN "EventAssignee" ea ON ea."eventId" = e.id AND ea."userId" = ${userId}
    WHERE e.id = ${resourceId}
      AND (e."createdById" = ${userId} OR ea."userId" = ${userId}
           OR (e.visibility = 'team' AND e."teamId" = ${tid}))
    LIMIT 1`;
  return rows.length > 0;
}

export interface SharedPayload {
  type: ShareResourceType;
  sharedBy: { name: string; avatar: string | null };
  resource: any;
}

/** Load the read-only payload for a public token, or null if invalid/revoked/expired. */
export async function loadSharedByToken(token: string): Promise<SharedPayload | null> {
  const links = await prisma.$queryRaw<any[]>`
    SELECT s.*, u.name as "sharedByName", u.avatar as "sharedByAvatar"
    FROM "ShareLink" s
    JOIN "User" u ON u.id = s."createdById"
    WHERE s.token = ${token}
      AND s.revoked = false
      AND (s."expiresAt" IS NULL OR s."expiresAt" > NOW())
    LIMIT 1`;
  const link = links[0];
  if (!link) return null;

  const type = link.resourceType as ShareResourceType;
  const sharedBy = { name: link.sharedByName, avatar: link.sharedByAvatar ?? null };

  if (type === "note") {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, title, content, color, "updatedAt" FROM "Note" WHERE id = ${link.resourceId} LIMIT 1`;
    if (!rows[0]) return null;
    return { type, sharedBy, resource: rows[0] };
  }

  if (type === "task") {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT t.id, t.title, t.description, t.status, t.priority, t."dueDate",
             t."estimatedMinutes", t.expenses, t."hourlyRate", c.name as "categoryName", c.color as "categoryColor"
      FROM "Task" t
      LEFT JOIN "Category" c ON c.id = t."categoryId"
      WHERE t.id = ${link.resourceId} LIMIT 1`;
    if (!rows[0]) return null;
    const subs = await prisma.$queryRaw<any[]>`
      SELECT id, title, done FROM "SubTask" WHERE "taskId" = ${link.resourceId} ORDER BY "order" ASC, "createdAt" ASC`;
    return { type, sharedBy, resource: { ...rows[0], subtasks: subs } };
  }

  // event
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, title, description, "startAt", "endAt", "allDay", location, color
    FROM "Event" WHERE id = ${link.resourceId} LIMIT 1`;
  if (!rows[0]) return null;
  return { type, sharedBy, resource: rows[0] };
}

/**
 * Return the existing active link for a resource owned by this user, or create a
 * new one. Idempotent — the same user re-sharing the same resource reuses the link.
 */
export async function getOrCreateShareLink(
  type: ShareResourceType,
  resourceId: string,
  userId: string,
  teamId: string | undefined,
): Promise<{ token: string }> {
  const existing = await prisma.$queryRaw<any[]>`
    SELECT token FROM "ShareLink"
    WHERE "resourceType" = ${type} AND "resourceId" = ${resourceId}
      AND "createdById" = ${userId} AND revoked = false
    ORDER BY "createdAt" DESC LIMIT 1`;
  if (existing[0]) return { token: existing[0].token };

  const token = generateShareToken();
  await prisma.$executeRaw`
    INSERT INTO "ShareLink" (id, token, "resourceType", "resourceId", "createdById", "teamId", "createdAt")
    VALUES (gen_random_uuid()::text, ${token}, ${type}, ${resourceId}, ${userId}, ${teamId ?? null}, NOW())`;
  return { token };
}
