import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const userId = session.user.id;
  if (!userId) return NextResponse.json({ error: "Relace vypršela — odhlaste se a přihlaste znovu" }, { status: 401 });

  const trimmed = name.trim();

  // Drop the legacy unique index/constraint that blocks a user from owning multiple teams.
  // The object is a UNIQUE INDEX (not a formal constraint), so DROP INDEX is required.
  // $executeRawUnsafe uses the simple query protocol — works through PgBouncer.
  try {
    await (prisma as any).$executeRawUnsafe(
      `DROP INDEX IF EXISTS "Team_ownerId_key"`
    );
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key"`
    );
    await (prisma as any).$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId")`
    );
  } catch { /* ignore — index may already be gone */ }

  try {
    await prisma.$executeRaw`
      INSERT INTO "Team" (id, name, "createdAt", "ownerId", "joinCode")
      VALUES (
        gen_random_uuid()::text,
        ${trimmed},
        NOW(),
        ${userId},
        left(md5(gen_random_uuid()::text), 10)
      )
    `;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "Team" WHERE "ownerId" = ${userId} ORDER BY "createdAt" DESC LIMIT 1
    `;
    const team = rows[0];

    await prisma.$executeRaw`
      INSERT INTO "TeamMember" (id, role, "joinedAt", "teamId", "userId")
      VALUES (gen_random_uuid()::text, 'owner', NOW(), ${team.id}, ${userId})
      ON CONFLICT ("teamId", "userId") DO NOTHING
    `;

    return NextResponse.json(team, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Chyba serveru" }, { status: 500 });
  }
}
