-- v23: sub-teams (self-referential parentId on Team)
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "parentId" TEXT REFERENCES "Team"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Team_parentId_idx" ON "Team" ("parentId");
