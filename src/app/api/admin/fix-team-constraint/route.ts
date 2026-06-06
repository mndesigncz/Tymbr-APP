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

  // ── Diagnostic: identify which database Prisma is actually connected to ──
  let dbName: string | null = null;
  let serverAddr: string | null = null;
  try {
    const info = await prisma.$queryRaw<any[]>`
      SELECT
        current_database() AS db,
        current_schema() AS schema,
        inet_server_addr()::text AS addr,
        inet_server_port() AS port
    `;
    dbName = info[0]?.db ?? null;
    serverAddr = `${info[0]?.addr ?? "?"}:${info[0]?.port ?? "?"}`;
    log.push(`Connected to DB "${dbName}" at ${serverAddr} (schema: ${info[0]?.schema})`);
  } catch (e: any) {
    log.push(`Diag failed: ${e?.message?.split("\n")[0]}`);
  }

  // Also show the DATABASE_URL host (masked) so user can match it in Neon console
  const dbUrlHint = (process.env.DATABASE_URL ?? "")
    .replace(/:[^:@]*@/, ":***@")
    .replace(/\?.*/, "")
    .split("@")[1] ?? "unknown";
  log.push(`DATABASE_URL host: ${dbUrlHint}`);

  // ── Step 1: Check if constraint exists ──
  let constraintExists: boolean | null = null;
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::text AS cnt FROM pg_constraint WHERE conname = 'Team_ownerId_key'
    `;
    constraintExists = (rows as any)[0]?.cnt !== "0";
    log.push(`Constraint "Team_ownerId_key": ${constraintExists ? "EXISTS ✗" : "already gone ✓"}`);
  } catch (e: any) {
    log.push(`Constraint check failed: ${e?.message?.split("\n")[0]}`);
  }

  if (constraintExists === false) {
    log.push("Nothing to do — but if team creation still fails, DDL hit a different DB than the INSERT.");
    return NextResponse.json({ ok: true, constraintGone: true, dbName, serverAddr, log });
  }

  // ── Step 2: Drop constraint via prisma.$executeRawUnsafe ──
  // This uses the exact same connection path as every other Prisma query in this app.
  let ddlOk = false;
  try {
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key"`
    );
    await (prisma as any).$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId")`
    );
    ddlOk = true;
    log.push("DDL via prisma.$executeRawUnsafe: ✓");
  } catch (e: any) {
    log.push(`DDL via prisma failed: ${e?.message?.split("\n")[0]}`);
  }

  // ── Step 3: Verify ──
  let constraintGone: boolean | null = null;
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::text AS cnt FROM pg_constraint WHERE conname = 'Team_ownerId_key'
    `;
    constraintGone = (rows as any)[0]?.cnt === "0";
    log.push(`After DDL — constraint ${constraintGone ? "gone ✓" : "STILL EXISTS ✗ — DDL ran on wrong DB or was blocked"}`);
  } catch (e: any) {
    log.push(`Verify failed: ${e?.message?.split("\n")[0]}`);
  }

  return NextResponse.json({
    ok: ddlOk && constraintGone === true,
    ddlOk,
    constraintGone,
    dbName,
    serverAddr,
    log,
  });
}
