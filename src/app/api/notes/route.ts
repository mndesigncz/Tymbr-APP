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
  //   1. It's a NON-team note (private, or orphaned with no teamId) and the user
  //      is its creator OR an explicit collaborator — these follow the person and
  //      are visible from any active team.
  //   2. It's a team note whose team is the user's ACTIVE team, and the user is
  //      either a real member of that team OR an explicit collaborator on the
  //      note. Team notes follow the team: a shared team note only appears while
  //      the user is active in that team (private shares stay always-visible via
  //      rule 1). The membership/collaborator + active-team check makes cross-team
  //      visibility impossible even with a stale/spoofed session teamId.
  const notes = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT n.id, n.title, n.content, n.color, n.pinned, n.visibility,
                    n."createdAt", n."updatedAt", n."teamId", n."createdById",
                    u.name as "creatorName", u.avatar as "creatorAvatar"
    FROM "Note" n
    JOIN "User" u ON u.id = n."createdById"
    LEFT JOIN "NoteCollaborator" nc ON nc."noteId" = n.id AND nc."userId" = ${userId}
    WHERE
      (
        (n."createdById" = ${userId} OR nc."userId" = ${userId})
        AND (n.visibility <> 'team' OR n."teamId" IS NULL)
      )
      OR (
        n.visibility = 'team'
        AND n."teamId" IS NOT NULL
        AND n."teamId" = ${teamId ?? null}
        AND (
          nc."userId" = ${userId}
          OR EXISTS (
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
