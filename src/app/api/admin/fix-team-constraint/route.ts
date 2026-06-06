import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

/** Derives a direct (non-pooler) URL from a Neon pooler URL.
 *  Neon pooler hostnames contain "-pooler"; removing it gives the direct endpoint.
 *  If already direct, returns as-is. */
function toDirectUrl(url: string): string {
  return url.replace(/-pooler\./, ".");
}

async function checkConstraintExists(pool: Pool): Promise<boolean> {
  const r = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM pg_constraint WHERE conname = 'Team_ownerId_key'`
  );
  return r.rows[0].cnt !== "0";
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Přihlaste se nejdříve" }, { status: 401 });
  }

  const log: string[] = [];
  const dbUrl = process.env.DATABASE_URL ?? "";

  // ── Step 1: Check if constraint exists in the SAME DB the app uses (via Prisma) ──
  let appDbConstraintExists: boolean | string = "unknown";
  try {
    const rows = await prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*)::text AS cnt FROM pg_constraint WHERE conname = 'Team_ownerId_key'
    `;
    appDbConstraintExists = (rows as any)[0]?.cnt !== "0";
    log.push(`App DB (DATABASE_URL): constraint ${appDbConstraintExists ? "EXISTS ✗" : "gone ✓"}`);
  } catch (e: any) {
    log.push(`App DB check failed: ${e?.message?.split("\n")[0]}`);
  }

  if (appDbConstraintExists === false) {
    return NextResponse.json({ ok: true, constraintGone: true, log });
  }

  // ── Step 2: Build candidate direct URLs (pooler cannot run DDL) ──
  // Priority: derive direct URL from DATABASE_URL itself, then known env vars
  const candidates = [
    dbUrl ? toDirectUrl(dbUrl) : "",           // derived direct from app's DB URL
    process.env.POSTGRES_URL_NON_POOLING ?? "", // Vercel Neon integration
    process.env.DATABASE_URL_UNPOOLED ?? "",
    process.env.DIRECT_URL ?? "",
    dbUrl,                                      // last resort — may be pooler, will fail DDL
  ].filter((u, i, arr) => u && arr.indexOf(u) === i); // unique, non-empty

  log.push(`Trying ${candidates.length} connection(s) for DDL…`);

  let migrationOk = false;

  for (const url of candidates) {
    const label = url.replace(/:[^:@]*@/, ":***@").split("?")[0];
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 8000 });
    try {
      await pool.query(`ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key"`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId")`);
      log.push(`✓ DDL OK via ${label}`);
      migrationOk = true;
      await pool.end();
      break;
    } catch (e: any) {
      log.push(`✗ ${label}: ${e?.message?.split("\n")[0]}`);
      try { await pool.end(); } catch { /* ignore */ }
    }
  }

  // ── Step 3: Verify via Prisma (= app's actual DATABASE_URL) ──
  let constraintGone: boolean | string = "unknown";
  try {
    const rows = await prisma.$queryRaw<{ cnt: string }[]>`
      SELECT COUNT(*)::text AS cnt FROM pg_constraint WHERE conname = 'Team_ownerId_key'
    `;
    constraintGone = (rows as any)[0]?.cnt === "0";
    log.push(constraintGone
      ? "✓ Verified via app DB — constraint is gone, team creation will work"
      : "✗ Constraint STILL exists in app DB — DDL ran on wrong database");
  } catch (e: any) {
    log.push(`Verify via Prisma failed: ${e?.message?.split("\n")[0]}`);
  }

  return NextResponse.json({
    ok: migrationOk && constraintGone === true,
    migrationOk,
    constraintGone,
    log,
  });
}
