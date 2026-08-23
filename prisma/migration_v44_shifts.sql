-- Work shifts ("směny") + kiosk attendance + checklists, paired with the closing.
ALTER TABLE "TeamMember" ADD COLUMN IF NOT EXISTS "kioskPin" TEXT;
ALTER TABLE "CashClosing" ADD COLUMN IF NOT EXISTS "shiftId" TEXT;
DO $$ BEGIN
  ALTER TABLE "CashClosing" ADD CONSTRAINT "CashClosing_shiftId_key" UNIQUE ("shiftId");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Shift" (
  "id"             TEXT PRIMARY KEY,
  "status"         TEXT NOT NULL DEFAULT 'open',
  "openedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"       TIMESTAMP(3),
  "note"           TEXT,
  "checklistState" TEXT NOT NULL DEFAULT '{}',
  "cashClosingId"  TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "teamId"         TEXT NOT NULL,
  CONSTRAINT "Shift_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Shift_teamId_status_idx" ON "Shift"("teamId", "status");
CREATE INDEX IF NOT EXISTS "Shift_teamId_openedAt_idx" ON "Shift"("teamId", "openedAt");

CREATE TABLE IF NOT EXISTS "ShiftAttendance" (
  "id"         TEXT PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "clockInAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clockOutAt" TIMESTAMP(3),
  "shiftId"    TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  CONSTRAINT "ShiftAttendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE,
  CONSTRAINT "ShiftAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ShiftAttendance_shiftId_idx" ON "ShiftAttendance"("shiftId");
CREATE INDEX IF NOT EXISTS "ShiftAttendance_userId_idx" ON "ShiftAttendance"("userId");

CREATE TABLE IF NOT EXISTS "ShiftChecklist" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "kind"      TEXT NOT NULL DEFAULT 'open',
  "items"     TEXT NOT NULL DEFAULT '[]',
  "order"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "teamId"    TEXT NOT NULL,
  CONSTRAINT "ShiftChecklist_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ShiftChecklist_teamId_idx" ON "ShiftChecklist"("teamId");
