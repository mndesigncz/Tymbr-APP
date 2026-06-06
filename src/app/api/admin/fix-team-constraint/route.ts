import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Pool } from "pg";

/**
 * One-time migration endpoint — drops the legacy Team_ownerId_key constraint.
 * Tries every known non-pooler env var so it works regardless of Vercel setup.
 * Protected by session — only authenticated users can call it.
 * Safe to call multiple times (IF EXISTS).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Přihlaste se nejdříve" }, { status: 401 });
  }

  // Try direct (non-pooler) URLs first — pooler (PgBouncer) cannot run DDL.
  // Vercel Neon integration provides POSTGRES_URL_NON_POOLING for this purpose.
  const candidates = [
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.DIRECT_URL,
    process.env.DATABASE_URL,  // last resort — may be pooler
  ].filter((u): u is string => !!u);

  const log: string[] = [];

  if (candidates.length === 0) {
    return NextResponse.json({ ok: false, log: ["No DATABASE_URL env vars found"] }, { status: 500 });
  }

  let migrationOk = false;

  for (const url of candidates) {
    const label = url.replace(/:[^:@]*@/, ":***@").split("?")[0];
    const pool = new Pool({ connectionString: url });
    try {
      await pool.query(`ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key"`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId")`);
      log.push(`✓ DDL OK via ${label}`);
      migrationOk = true;
      await pool.end();
      break;
    } catch (e: any) {
      log.push(`✗ ${label}: ${e?.message?.split("\n")[0]}`);
      await pool.end();
    }
  }

  // Verify constraint is actually gone using the first available URL
  const verifyPool = new Pool({ connectionString: candidates[0] });
  let constraintGone: boolean | string = false;
  try {
    const r = await verifyPool.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM pg_constraint WHERE conname = 'Team_ownerId_key'`
    );
    constraintGone = r.rows[0].cnt === "0";
    log.push(constraintGone ? "✓ Constraint is gone — team creation will work" : "✗ Constraint still exists in pg_constraint");
  } catch (e: any) {
    log.push(`✗ Verify failed: ${e?.message?.split("\n")[0]}`);
    constraintGone = "unknown";
  } finally {
    await verifyPool.end();
  }

  return NextResponse.json({ ok: migrationOk && constraintGone === true, migrationOk, constraintGone, log });
}
