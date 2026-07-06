-- v36: invoice payment automation — inbound token + reminder throttle
ALTER TABLE "TeamBilling" ADD COLUMN IF NOT EXISTS "inboundToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "TeamBilling_inboundToken_key" ON "TeamBilling"("inboundToken");
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);
