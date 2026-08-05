-- Link a Tymbr event to its mirrored copy in the creator's Google Calendar.
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
