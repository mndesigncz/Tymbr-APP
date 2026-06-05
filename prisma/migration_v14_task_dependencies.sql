CREATE TABLE IF NOT EXISTS "TaskDependency" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "blockerId" TEXT NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
  "blockedId" TEXT NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
  UNIQUE ("blockerId", "blockedId")
);

CREATE INDEX IF NOT EXISTS "TaskDependency_blockedId_idx" ON "TaskDependency"("blockedId");
