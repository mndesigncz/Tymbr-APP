import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Pool } from "pg";

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

  // Drop the legacy one-owner-per-team unique constraint before inserting.
  // Strategy: try via the Prisma client first (identical connection to the INSERT,
  // so it is guaranteed to hit the same database). If that throws for any reason,
  // fall back to a separate direct pg connection derived from DATABASE_URL.
  let ddlErr: string | null = null;

  try {
    // $executeRawUnsafe uses the simple query protocol (no prepared statements),
    // which works through PgBouncer transaction-mode pooling.
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key"`
    );
    await (prisma as any).$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId")`
    );
  } catch (e1: any) {
    ddlErr = `prisma: ${e1?.message?.split("\n")[0]}`;
    // Fallback: direct pg connection (bypasses PgBouncer entirely)
    const directUrl = toDirectUrl(process.env.DATABASE_URL ?? "");
    if (directUrl) {
      const pool = new Pool({ connectionString: directUrl, connectionTimeoutMillis: 15000 });
      try {
        await pool.query(`ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key"`);
        await pool.query(`CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId")`);
        ddlErr = null; // fallback succeeded
      } catch (e2: any) {
        ddlErr += ` | pg-direct: ${e2?.message?.split("\n")[0]}`;
      } finally {
        try { await pool.end(); } catch { /* ignore */ }
      }
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
    // Include ddlErr in response so we can see exactly why the migration didn't run
    return NextResponse.json(
      { error: e?.message || "Chyba serveru", _ddl: ddlErr },
      { status: 500 }
    );
  }
}
