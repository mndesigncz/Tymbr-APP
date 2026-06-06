import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Pool } from "pg";

/** Strip -pooler from Neon hostname to get a direct connection that supports DDL. */
function toDirectUrl(url: string): string {
  return url.replace(/-pooler\./, ".");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const userId = session.user.id;
  if (!userId) return NextResponse.json({ error: "Relace vypršela — odhlaste se a přihlaste znovu" }, { status: 401 });

  const trimmed = name.trim();

  // Drop the legacy one-owner-per-team unique constraint if it still exists.
  // Must use a direct (non-pooler) connection — PgBouncer transaction mode blocks DDL.
  // Running this inline guarantees it hits the exact same database as the INSERT below.
  const directUrl = toDirectUrl(process.env.DATABASE_URL ?? "");
  if (directUrl) {
    const pool = new Pool({ connectionString: directUrl, connectionTimeoutMillis: 6000 });
    try {
      await pool.query(`ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key"`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId")`);
    } catch {
      // DDL may fail on first-run pooler URL — INSERT error will surface the real problem
    } finally {
      try { await pool.end(); } catch { /* ignore */ }
    }
  }

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
