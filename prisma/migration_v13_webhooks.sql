CREATE TABLE IF NOT EXISTS "Webhook" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT NOT NULL DEFAULT 'task.created,task.updated,task.completed',
  active BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "teamId" TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Webhook_teamId_idx" ON "Webhook"("teamId");
