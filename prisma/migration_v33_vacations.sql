-- v33: vacations / absence tracking
CREATE TABLE IF NOT EXISTS "Vacation" (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL DEFAULT 'vacation',   -- vacation | sick | personal
  "startDate"      TIMESTAMP(3) NOT NULL,
  "endDate"        TIMESTAMP(3) NOT NULL,
  note             TEXT,
  "approvalStatus" TEXT NOT NULL DEFAULT 'pending',    -- pending | approved | rejected
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "userId"         TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "teamId"         TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
  "approvedById"   TEXT REFERENCES "User"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "Vacation_teamId_idx"    ON "Vacation"("teamId");
CREATE INDEX IF NOT EXISTS "Vacation_userId_idx"    ON "Vacation"("userId");
CREATE INDEX IF NOT EXISTS "Vacation_startDate_idx" ON "Vacation"("startDate");
