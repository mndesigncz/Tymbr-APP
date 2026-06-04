-- Multi-assignee support: TaskAssignee junction table
CREATE TABLE IF NOT EXISTS "TaskAssignee" (
  id TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"(id) ON DELETE CASCADE,
  CONSTRAINT "TaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE ("taskId", "userId")
);
CREATE INDEX IF NOT EXISTS "TaskAssignee_taskId_idx" ON "TaskAssignee" ("taskId");
CREATE INDEX IF NOT EXISTS "TaskAssignee_userId_idx" ON "TaskAssignee" ("userId");

-- Migrate existing single assignees into the new table
INSERT INTO "TaskAssignee" (id, "taskId", "userId")
SELECT gen_random_uuid()::text, id, "assigneeId"
FROM "Task"
WHERE "assigneeId" IS NOT NULL
ON CONFLICT DO NOTHING;
