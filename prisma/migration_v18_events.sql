CREATE TABLE IF NOT EXISTS "Event" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  "startAt" TIMESTAMPTZ NOT NULL,
  "endAt" TIMESTAMPTZ NOT NULL,
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  color TEXT,
  visibility TEXT NOT NULL DEFAULT 'personal',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "teamId" TEXT REFERENCES "Team"(id) ON DELETE SET NULL,
  "createdById" TEXT NOT NULL REFERENCES "User"(id)
);

CREATE INDEX IF NOT EXISTS "Event_teamId_idx" ON "Event"("teamId");
CREATE INDEX IF NOT EXISTS "Event_createdById_idx" ON "Event"("createdById");
CREATE INDEX IF NOT EXISTS "Event_startAt_idx" ON "Event"("startAt");
CREATE INDEX IF NOT EXISTS "Event_teamId_startAt_idx" ON "Event"("teamId", "startAt");
