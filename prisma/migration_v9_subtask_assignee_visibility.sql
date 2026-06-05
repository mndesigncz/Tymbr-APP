-- v9: subtask assignees + task visibility
ALTER TABLE "SubTask" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT REFERENCES "User"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "SubTask_assigneeId_idx" ON "SubTask"("assigneeId");

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'team';
CREATE INDEX IF NOT EXISTS "Task_visibility_idx" ON "Task"("visibility");
