import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Přihlaste se nejdříve" }, { status: 401 });
  }

  const log: string[] = [];

  // Check pg_constraint (formal UNIQUE constraint)
  let isConstraint = false;
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::text AS cnt FROM pg_constraint WHERE conname = 'Team_ownerId_key'
    `;
    isConstraint = (rows as any)[0]?.cnt !== "0";
    log.push(`pg_constraint: ${isConstraint ? "EXISTS" : "not found"}`);
  } catch (e: any) {
    log.push(`pg_constraint check failed: ${e?.message?.split("\n")[0]}`);
  }

  // Check pg_indexes (UNIQUE INDEX — same name, different catalog)
  let isIndex = false;
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::text AS cnt FROM pg_indexes
      WHERE tablename = 'Team' AND indexname = 'Team_ownerId_key'
    `;
    isIndex = (rows as any)[0]?.cnt !== "0";
    log.push(`pg_indexes: ${isIndex ? "EXISTS ✗" : "not found"}`);
  } catch (e: any) {
    log.push(`pg_indexes check failed: ${e?.message?.split("\n")[0]}`);
  }

  if (!isConstraint && !isIndex) {
    log.push("Nothing to drop — unique index is already gone ✓");
    return NextResponse.json({ ok: true, gone: true, log });
  }

  // Drop whichever exists
  if (isConstraint) {
    try {
      await (prisma as any).$executeRawUnsafe(
        `ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key"`
      );
      log.push(`ALTER TABLE DROP CONSTRAINT: ✓`);
    } catch (e: any) {
      log.push(`DROP CONSTRAINT failed: ${e?.message?.split("\n")[0]}`);
    }
  }

  if (isIndex) {
    try {
      await (prisma as any).$executeRawUnsafe(
        `DROP INDEX IF EXISTS "Team_ownerId_key"`
      );
      log.push(`DROP INDEX: ✓`);
    } catch (e: any) {
      log.push(`DROP INDEX failed: ${e?.message?.split("\n")[0]}`);
    }
  }

  // Ensure non-unique index exists for query performance
  try {
    await (prisma as any).$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId")`
    );
    log.push(`CREATE INDEX Team_ownerId_idx: ✓`);
  } catch (e: any) {
    log.push(`CREATE INDEX failed: ${e?.message?.split("\n")[0]}`);
  }

  // Verify
  let stillExists = false;
  try {
    const [r1, r2] = await Promise.all([
      prisma.$queryRaw<any[]>`SELECT COUNT(*)::text AS cnt FROM pg_constraint WHERE conname = 'Team_ownerId_key'`,
      prisma.$queryRaw<any[]>`SELECT COUNT(*)::text AS cnt FROM pg_indexes WHERE tablename = 'Team' AND indexname = 'Team_ownerId_key'`,
    ]);
    stillExists = (r1 as any)[0]?.cnt !== "0" || (r2 as any)[0]?.cnt !== "0";
    log.push(stillExists ? "✗ Still exists after drop — team creation will still fail" : "✓ Verified gone — team creation should work now");
  } catch (e: any) {
    log.push(`Verify failed: ${e?.message?.split("\n")[0]}`);
  }

  return NextResponse.json({ ok: !stillExists, gone: !stillExists, log });
}
