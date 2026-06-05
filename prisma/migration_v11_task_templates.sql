CREATE TABLE IF NOT EXISTS "TaskTemplate" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  "hourlyRate" DOUBLE PRECISION,
  subtasks JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "teamId" TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
  "categoryId" TEXT REFERENCES "Category"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "TaskTemplate_teamId_idx" ON "TaskTemplate"("teamId");
