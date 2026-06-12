CREATE TABLE IF NOT EXISTS "ContentPost" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram',
  status TEXT NOT NULL DEFAULT 'idea',
  "scheduledAt" TIMESTAMPTZ,
  "publishedAt" TIMESTAMPTZ,
  link TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "teamId" TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "User"(id),
  "assigneeId" TEXT REFERENCES "User"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ContentPost_teamId_idx" ON "ContentPost"("teamId");
CREATE INDEX IF NOT EXISTS "ContentPost_teamId_status_idx" ON "ContentPost"("teamId", status);
CREATE INDEX IF NOT EXISTS "ContentPost_scheduledAt_idx" ON "ContentPost"("scheduledAt");
