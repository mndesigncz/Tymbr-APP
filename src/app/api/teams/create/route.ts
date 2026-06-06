import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Pool } from "pg";

/**
 * Drops the legacy one-owner-per-team unique constraint via a direct pg.Pool
 * connection — the same pattern used in ensure-schema.ts. Both statements are
 * idempotent (IF EXISTS / IF NOT EXISTS) so this is safe on every call.
 */
async function dropOwnerConstraint() {
  if (!process.env.DATABASE_URL) return;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key"`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId")`);
  } catch {
    // Non-fatal — if DDL fails we fall through and the INSERT will surface any real error.
  } finally {
    await pool.end();
  }
}

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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const userId = session.user.id;
  if (!userId) return NextResponse.json({ error: "Relace vypršela — odhlaste se a přihlaste znovu" }, { status: 401 });

  const trimmed = name.trim();

  // Remove legacy constraint BEFORE inserting — guarantees multi-team works
  // without any catch/retry dance. Idempotent, so safe on every request.
  await dropOwnerConstraint();

  try {
    const team = await insertTeam(trimmed, userId);
    return NextResponse.json(team, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Chyba serveru" }, { status: 500 });
  }
}
