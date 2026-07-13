-- Track the last client check-in of a running timer so a forgotten timer
-- (laptop closed / asleep) can be stopped at the last real activity.
ALTER TABLE "TimeEntry" ADD COLUMN IF NOT EXISTS "lastHeartbeatAt" TIMESTAMP(3);
