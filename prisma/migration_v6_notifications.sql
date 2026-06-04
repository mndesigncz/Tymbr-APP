-- Per-user notification preferences stored as JSON text.
-- Keys: taskAssigned, comments, dueDates, statusChanges
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "notificationPrefs" TEXT;
