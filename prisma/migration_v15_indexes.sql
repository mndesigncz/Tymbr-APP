-- Performance indexes — Sprint 5 optimization
-- Run on Neon before or after deploy (all CREATE INDEX CONCURRENTLY-safe / IF NOT EXISTS)

-- TeamMember: missing indexes on FK columns
CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId");

-- TeamInvitation: missing index on teamId FK
CREATE INDEX IF NOT EXISTS "TeamInvitation_teamId_idx" ON "TeamInvitation"("teamId");
CREATE INDEX IF NOT EXISTS "TeamInvitation_email_idx"  ON "TeamInvitation"("email");

-- Task: missing indexes on FK columns + useful filter/sort columns
CREATE INDEX IF NOT EXISTS "Task_categoryId_idx"       ON "Task"("categoryId");
CREATE INDEX IF NOT EXISTS "Task_createdById_idx"      ON "Task"("createdById");
CREATE INDEX IF NOT EXISTS "Task_completedAt_idx"      ON "Task"("completedAt");
CREATE INDEX IF NOT EXISTS "Task_teamId_status_idx"    ON "Task"("teamId", "status");
CREATE INDEX IF NOT EXISTS "Task_teamId_completedAt_idx" ON "Task"("teamId", "completedAt");

-- TaskDependency: blockerId was missing (blockedId already existed)
CREATE INDEX IF NOT EXISTS "TaskDependency_blockerId_idx" ON "TaskDependency"("blockerId");

-- SubTask: taskId FK missing index
CREATE INDEX IF NOT EXISTS "SubTask_taskId_idx" ON "SubTask"("taskId");

-- TaskStatusHistory: taskId FK missing index
CREATE INDEX IF NOT EXISTS "TaskStatusHistory_taskId_idx" ON "TaskStatusHistory"("taskId");

-- Comment: both FK columns missing indexes
CREATE INDEX IF NOT EXISTS "Comment_taskId_idx" ON "Comment"("taskId");
CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId");

-- TimeEntry: additional useful indexes
CREATE INDEX IF NOT EXISTS "TimeEntry_subtaskId_idx"       ON "TimeEntry"("subtaskId");
CREATE INDEX IF NOT EXISTS "TimeEntry_startedAt_idx"       ON "TimeEntry"("startedAt");
CREATE INDEX IF NOT EXISTS "TimeEntry_userId_stoppedAt_idx" ON "TimeEntry"("userId", "stoppedAt");
