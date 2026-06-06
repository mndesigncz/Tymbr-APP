import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** Inserts a new team owned by userId and returns the created row. */
async function insertTeam(name: string, userId: string) {
  // Use raw SQL to bypass Prisma 7 adapter cuid() generation issue.
  // joinCode was added via migration_v2.sql and is NOT in Prisma schema.
  await prisma.$executeRaw`
    INSERT INTO "Team" (id, name, "createdAt", "ownerId", "joinCode")
    VALUES (
      gen_random_uuid()::text,
      ${name},
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

  return team;
}

/** True when the error is the legacy one-owner-per-team unique constraint. */
function isOwnerConstraintError(msg: string) {
  return msg.includes("Team_ownerId_key") || (msg.includes("ownerId") && msg.includes("unique"));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const userId = session.user.id;
  if (!userId) return NextResponse.json({ error: "Relace vypršela — odhlaste se a přihlaste znovu" }, { status: 401 });

  const trimmed = name.trim();

  try {
    const team = await insertTeam(trimmed, userId);
    return NextResponse.json(team, { status: 201 });
  } catch (e: any) {
    const msg = e?.message ?? "";

    // The legacy one-owner-per-team unique constraint blocks a second team.
    // Self-heal by applying migration_v3_multiteam.sql inline, then retry once.
    // Idempotent (IF EXISTS / IF NOT EXISTS) so it is safe on every call.
    if (isOwnerConstraintError(msg)) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key"`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId")`);
        const team = await insertTeam(trimmed, userId);
        return NextResponse.json(team, { status: 201 });
      } catch (retryErr: any) {
        return NextResponse.json(
          { error: retryErr?.message || "Tým se nepodařilo vytvořit" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ error: msg || "Chyba serveru" }, { status: 500 });
  }
}
