-- Link events to tasks + multi-assignee participants on events.

-- 1) Event → Task link (nullable; clears if the task is deleted)
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "taskId" TEXT REFERENCES "Task"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Event_taskId_idx" ON "Event"("taskId");

-- 2) Event participants (junction table, mirrors TaskAssignee)
CREATE TABLE IF NOT EXISTS "EventAssignee" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "eventId"   TEXT NOT NULL REFERENCES "Event"(id) ON DELETE CASCADE,
  "userId"    TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventAssignee_eventId_userId_key" ON "EventAssignee"("eventId", "userId");
CREATE INDEX IF NOT EXISTS "EventAssignee_eventId_idx" ON "EventAssignee"("eventId");
CREATE INDEX IF NOT EXISTS "EventAssignee_userId_idx" ON "EventAssignee"("userId");
