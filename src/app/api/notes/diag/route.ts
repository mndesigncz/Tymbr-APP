import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// TEMPORARY diagnostic endpoint to pin down the notes cross-team visibility
// issue. Manager-only, read-only. Remove before merging to main.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const userId = session.user.id;
  const sessionTeamId = (session.user as any).teamId ?? null;
  const teamRole = (session.user as any).teamRole ?? null;

  // memberships of the calling user
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true, role: true, team: { select: { name: true } } },
  });

  // every note the user can currently see, with its real team + creator info
  const visible = await prisma.$queryRaw<any[]>`
    SELECT n.id, n.title, n.visibility, n."teamId", n."createdById",
           t.name AS "teamName", u.name AS "creatorName"
    FROM "Note" n
    JOIN "User" u ON u.id = n."createdById"
    LEFT JOIN "Team" t ON t.id = n."teamId"
    LEFT JOIN "NoteCollaborator" nc ON nc."noteId" = n.id AND nc."userId" = ${userId}
    WHERE
      (n."createdById" = ${userId} AND (n.visibility <> 'team' OR n."teamId" IS NULL))
      OR nc."userId" = ${userId}
      OR (
        n.visibility = 'team'
        AND n."teamId" IS NOT NULL
        AND n."teamId" = ${sessionTeamId}
        AND EXISTS (
          SELECT 1 FROM "TeamMember" tm
          WHERE tm."userId" = ${userId} AND tm."teamId" = n."teamId"
        )
      )
    ORDER BY n."updatedAt" DESC
    LIMIT 50
  `;

  // raw count of ALL notes in the DB grouped by team, to see the data shape
  const byTeam = await prisma.$queryRaw<any[]>`
    SELECT n."teamId", t.name AS "teamName", n.visibility, COUNT(*)::int AS count
    FROM "Note" n
    LEFT JOIN "Team" t ON t.id = n."teamId"
    GROUP BY n."teamId", t.name, n.visibility
    ORDER BY count DESC
  `;

  return NextResponse.json({
    me: { userId, sessionTeamId, teamRole },
    memberships: memberships.map((m) => ({ teamId: m.teamId, teamName: m.team?.name, role: m.role })),
    visibleNotes: visible.map((n) => ({
      id: n.id,
      title: (n.title || "").slice(0, 40),
      visibility: n.visibility,
      noteTeamId: n.teamId,
      noteTeamName: n.teamName,
      belongsToMyActiveTeam: n.teamId === sessionTeamId,
      createdBy: n.creatorName,
      iAmCreator: n.createdById === userId,
    })),
    allNotesByTeam: byTeam,
  });
}
