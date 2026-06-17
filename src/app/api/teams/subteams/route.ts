import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json([]);

  const rows = await prisma.$queryRaw<any[]>`
    SELECT t.id, t.name, t.color, t."createdAt",
           COUNT(tm.id)::int AS "memberCount"
    FROM "Team" t
    LEFT JOIN "TeamMember" tm ON tm."teamId" = t.id
    WHERE t."parentId" = ${teamId}
    GROUP BY t.id
    ORDER BY t."createdAt" ASC
  `;

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });

  if (!isManager((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const userId = session.user.id;

  // Create the subteam
  const rows = await prisma.$queryRaw<any[]>`
    INSERT INTO "Team" (id, name, "createdAt", "ownerId", "parentId", "joinCode")
    VALUES (
      gen_random_uuid()::text,
      ${name.trim()},
      NOW(),
      ${userId},
      ${teamId},
      left(md5(gen_random_uuid()::text), 10)
    )
    RETURNING id, name, "parentId", "createdAt"
  `;
  const subteam = rows[0];

  // Enroll creator as owner
  await prisma.$executeRaw`
    INSERT INTO "TeamMember" (id, role, "joinedAt", "teamId", "userId")
    VALUES (gen_random_uuid()::text, 'owner', NOW(), ${subteam.id}, ${userId})
    ON CONFLICT ("teamId", "userId") DO NOTHING
  `;

  // Auto-enroll all other managers of the parent team as admins of the subteam
  const managers = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT "userId" FROM "TeamMember"
    WHERE "teamId" = ${teamId}
      AND role IN ('owner', 'admin')
      AND "userId" != ${userId}
  `;
  for (const { userId: managerId } of managers) {
    await prisma.$executeRaw`
      INSERT INTO "TeamMember" (id, role, "joinedAt", "teamId", "userId")
      VALUES (gen_random_uuid()::text, 'admin', NOW(), ${subteam.id}, ${managerId})
      ON CONFLICT ("teamId", "userId") DO NOTHING
    `;
  }

  return NextResponse.json(subteam, { status: 201 });
}
