-- v36: custom roles (named permission presets)
CREATE TABLE IF NOT EXISTS "CustomRole" (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT,
  finance     BOOLEAN NOT NULL DEFAULT false,
  permissions TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "teamId"    TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "CustomRole_teamId_idx" ON "CustomRole"("teamId");

ALTER TABLE "TeamMember" ADD COLUMN IF NOT EXISTS "customRoleId" TEXT REFERENCES "CustomRole"(id) ON DELETE SET NULL;
