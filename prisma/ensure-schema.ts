import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("[ensure-schema] DATABASE_URL not set — skipping migrations");
    return;
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    const dir = path.join(__dirname);
    const files = fs.readdirSync(dir)
      .filter((f) => /^migration_v\d+/.test(f) && f.endsWith(".sql"))
      .sort((a, b) => {
        const na = parseInt(a.match(/migration_v(\d+)/)?.[1] ?? "0", 10);
        const nb = parseInt(b.match(/migration_v(\d+)/)?.[1] ?? "0", 10);
        return na - nb;
      });

    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      console.log(`[ensure-schema] applying ${file}`);
      try {
        await pool.query(sql);
      } catch (e: any) {
        console.warn(`[ensure-schema] ${file} error (continuing): ${e?.message}`);
      }
    }

    // Ensure Task columns added outside the migration files
    const extraCols = [
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "teamId" TEXT REFERENCES "Team"(id) ON DELETE SET NULL`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3)`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "hourlyRate" DOUBLE PRECISION`,
      `CREATE INDEX IF NOT EXISTS "Task_teamId_idx" ON "Task"("teamId")`,
      `CREATE INDEX IF NOT EXISTS "Task_completedAt_idx" ON "Task"("completedAt")`,
      `CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status")`,
      `CREATE INDEX IF NOT EXISTS "Task_assigneeId_idx" ON "Task"("assigneeId")`,
      `CREATE INDEX IF NOT EXISTS "Task_categoryId_idx" ON "Task"("categoryId")`,
      `CREATE INDEX IF NOT EXISTS "Task_createdById_idx" ON "Task"("createdById")`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3)`,
    ];

    for (const stmt of extraCols) {
      try {
        await pool.query(stmt);
      } catch (e: any) {
        // ignore "already exists" and similar
      }
    }

    // Ensure TeamMember and TeamInvitation tables exist (needed for auth)
    const extraTables = `
      CREATE TABLE IF NOT EXISTS "TeamMember" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        role TEXT NOT NULL DEFAULT 'member',
        "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "teamId" TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        UNIQUE("teamId", "userId")
      );
      CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");
      CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId");

      CREATE TABLE IF NOT EXISTS "TeamInvitation" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'member',
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "teamId" TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
        "invitedById" TEXT NOT NULL REFERENCES "User"(id)
      );
      CREATE INDEX IF NOT EXISTS "TeamInvitation_teamId_idx" ON "TeamInvitation"("teamId");
      CREATE INDEX IF NOT EXISTS "TeamInvitation_token_idx" ON "TeamInvitation"("token");

      CREATE TABLE IF NOT EXISTS "SubTask" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        done BOOLEAN NOT NULL DEFAULT false,
        "order" INTEGER NOT NULL DEFAULT 0,
        "hourlyRate" DOUBLE PRECISION,
        "taskId" TEXT NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
        "assigneeId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "SubTask_taskId_idx" ON "SubTask"("taskId");

      CREATE TABLE IF NOT EXISTS "TimeEntry" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "stoppedAt" TIMESTAMPTZ,
        "durationMinutes" INTEGER,
        "taskId" TEXT REFERENCES "Task"(id) ON DELETE CASCADE,
        "subtaskId" TEXT REFERENCES "SubTask"(id) ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "TimeEntry_taskId_idx" ON "TimeEntry"("taskId");
      CREATE INDEX IF NOT EXISTS "TimeEntry_userId_idx" ON "TimeEntry"("userId");

      CREATE TABLE IF NOT EXISTS "TaskStatusHistory" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        status TEXT NOT NULL,
        "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "endedAt" TIMESTAMPTZ,
        minutes INTEGER,
        "taskId" TEXT NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "TaskStatusHistory_taskId_idx" ON "TaskStatusHistory"("taskId");

      CREATE TABLE IF NOT EXISTS "TaskDependency" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "blockedTaskId" TEXT NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
        "blockerTaskId" TEXT NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
        UNIQUE("blockedTaskId", "blockerTaskId")
      );

      CREATE TABLE IF NOT EXISTS "Team" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        color TEXT,
        logo TEXT,
        "joinCode" TEXT UNIQUE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "ownerId" TEXT NOT NULL REFERENCES "User"(id)
      );
      CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team"("ownerId");

      CREATE TABLE IF NOT EXISTS "ChatMessage" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        content TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "teamId" TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "recipientId" TEXT REFERENCES "User"(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "ChatMessage_teamId_idx" ON "ChatMessage"("teamId");
    `;

    try {
      await pool.query(extraTables);
    } catch (e: any) {
      console.warn("[ensure-schema] extra tables:", e?.message);
    }

    console.log("[ensure-schema] done");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[ensure-schema] fatal:", e?.message ?? e);
  process.exit(1);
});
