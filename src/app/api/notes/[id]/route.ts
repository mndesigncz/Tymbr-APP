import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function canAccess(noteId: string, userId: string, teamId: string | null | undefined) {
  // Mirrors the list query: a note is bound to the team it was created in, so it
  // is reachable only when it belongs to the user's active team (or is a legacy
  // note with no team) AND the user created it, is an explicit collaborator, or
  // is a real member of that team for a team-visible note.
  const rows = await prisma.$queryRaw<any[]>`
    SELECT n.id, n."createdById", n.visibility, n."teamId"
    FROM "Note" n
    LEFT JOIN "NoteCollaborator" nc ON nc."noteId" = n.id AND nc."userId" = ${userId}
    WHERE n.id = ${noteId}
      AND (n."teamId" = ${teamId ?? null} OR n."teamId" IS NULL)
      AND (
        n."createdById" = ${userId}
        OR nc."userId" = ${userId}
        OR (
          n.visibility = 'team'
          AND n."teamId" IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM "TeamMember" tm
            WHERE tm."userId" = ${userId} AND tm."teamId" = n."teamId"
          )
        )
      )
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function isOwner(noteId: string, userId: string) {
  const row = await prisma.$queryRaw<any[]>`SELECT id FROM "Note" WHERE id = ${noteId} AND "createdById" = ${userId} LIMIT 1`;
  return row.length > 0;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;
  const teamId = (session.user as any).teamId as string | undefined;

  const note = await canAccess(id, userId, teamId);
  if (!note) return NextResponse.json({ error: "Poznámka nenalezena" }, { status: 404 });

  const rows = await prisma.$queryRaw<any[]>`
    SELECT n.*, u.name as "creatorName", u.avatar as "creatorAvatar"
    FROM "Note" n
    JOIN "User" u ON u.id = n."createdById"
    WHERE n.id = ${id}
  `;
  const full = rows[0];

  const collabRows = await prisma.$queryRaw<any[]>`
    SELECT u.id, u.name, u.email, u.avatar
    FROM "NoteCollaborator" nc
    JOIN "User" u ON u.id = nc."userId"
    WHERE nc."noteId" = ${id}
    ORDER BY nc."createdAt"
  `;
  full.collaborators = collabRows;
  full.isOwner = full.createdById === userId;

  return NextResponse.json(full);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;
  const teamId = (session.user as any).teamId as string | undefined;

  if (!(await canAccess(id, userId, teamId))) {
    return NextResponse.json({ error: "Poznámka nenalezena" }, { status: 404 });
  }

  const body = await req.json();
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if ("title" in body)      { updates.push(`title = $${idx++}`);      values.push(body.title); }
  if ("content" in body)    { updates.push(`content = $${idx++}`);    values.push(body.content); }
  if ("color" in body)      { updates.push(`color = $${idx++}`);      values.push(body.color ?? null); }
  if ("pinned" in body)     { updates.push(`pinned = $${idx++}`);     values.push(!!body.pinned); }
  if ("visibility" in body) {
    // A note stays bound to the team it was created in — toggling private/team
    // only changes who inside that team can see it, never the owning team. A
    // legacy note with no team adopts the editor's active team on first change
    // so it becomes properly scoped going forward.
    updates.push(`visibility = $${idx++}`);
    values.push(body.visibility);
    if (teamId) {
      updates.push(`"teamId" = COALESCE("teamId", $${idx++})`);
      values.push(teamId);
    }
  }

  if (updates.length === 0) return NextResponse.json({ error: "Nic ke změně" }, { status: 400 });

  updates.push(`"updatedAt" = NOW()`);
  values.push(id);

  await prisma.$executeRawUnsafe(
    `UPDATE "Note" SET ${updates.join(", ")} WHERE id = $${idx}`,
    ...values
  );

  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "Note" WHERE id = ${id}`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  if (!(await isOwner(id, userId))) {
    return NextResponse.json({ error: "Nemáš oprávnění smazat tuto poznámku" }, { status: 403 });
  }

  await prisma.$executeRaw`DELETE FROM "Note" WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
