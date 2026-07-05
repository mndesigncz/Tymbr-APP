import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const userId = session.user.id;
  const teamId = (session.user as any).teamId as string | null | undefined;

  // Every note is bound to the team it was created in. A note is visible only
  // when it belongs to the user's ACTIVE team (or is a legacy note with no team
  // — kept visible to its creator/collaborators so nothing is orphaned), AND the
  // user has a right to it there:
  //   - they created it, or
  //   - they are an explicit collaborator, or
  //   - it's team-visible and they are a real member of that team.
  // Because the team gate applies to private and shared notes alike, a note made
  // in team A never appears while the user is active in team B.
  const notes = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT n.id, n.title, n.content, n.color, n.pinned, n.visibility,
                    n."createdAt", n."updatedAt", n."teamId", n."createdById",
                    u.name as "creatorName", u.avatar as "creatorAvatar"
    FROM "Note" n
    JOIN "User" u ON u.id = n."createdById"
    LEFT JOIN "NoteCollaborator" nc ON nc."noteId" = n.id AND nc."userId" = ${userId}
    WHERE
      (n."teamId" = ${teamId ?? null} OR n."teamId" IS NULL)
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
    ORDER BY n.pinned DESC, n."updatedAt" DESC
  `;

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const userId = session.user.id;
  const teamId = (session.user as any).teamId as string | undefined;
  const body = await req.json();
  const { title = "", content = "", color, visibility = "private" } = body;

  // Every note is bound to the team it was created in — even private ones.
  // This scopes the note (and any collaborators) to that team's context: a
  // private note made in team A is only ever visible while active in team A.
  const rows = await prisma.$queryRaw<any[]>`
    INSERT INTO "Note" (id, title, content, color, pinned, visibility, "createdAt", "updatedAt", "teamId", "createdById")
    VALUES (
      gen_random_uuid()::text,
      ${title},
      ${content},
      ${color ?? null},
      false,
      ${visibility},
      NOW(), NOW(),
      ${teamId ?? null},
      ${userId}
    )
    RETURNING *
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
