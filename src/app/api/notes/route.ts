import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const userId = session.user.id;
  const teamId = (session.user as any).teamId as string | null | undefined;

  // A note is visible to the user only when ONE of these holds:
  //   1. It's their own NON-team note (private, or an orphaned team note with
  //      no teamId). Crucially, a team note is NOT shown to its creator just
  //      because they made it — team notes follow the team, not authorship, so
  //      a note created for team A never appears while the user is in team B.
  //   2. They are an explicit collaborator on the note.
  //   3. It's a team note whose team is the user's ACTIVE team and the user is
  //      genuinely a member of that team (EXISTS against TeamMember — defends
  //      against a stale/spoofed session teamId).
  const notes = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT n.id, n.title, n.content, n.color, n.pinned, n.visibility,
                    n."createdAt", n."updatedAt", n."teamId", n."createdById",
                    u.name as "creatorName", u.avatar as "creatorAvatar"
    FROM "Note" n
    JOIN "User" u ON u.id = n."createdById"
    LEFT JOIN "NoteCollaborator" nc ON nc."noteId" = n.id AND nc."userId" = ${userId}
    WHERE
      (n."createdById" = ${userId} AND (n.visibility <> 'team' OR n."teamId" IS NULL))
      OR nc."userId" = ${userId}
      OR (
        n.visibility = 'team'
        AND n."teamId" IS NOT NULL
        AND n."teamId" = ${teamId ?? null}
        AND EXISTS (
          SELECT 1 FROM "TeamMember" tm
          WHERE tm."userId" = ${userId} AND tm."teamId" = n."teamId"
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
      ${visibility === "team" && teamId ? teamId : null},
      ${userId}
    )
    RETURNING *
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
