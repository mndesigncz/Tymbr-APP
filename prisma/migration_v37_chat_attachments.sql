-- v37: chat message attachments
ALTER TABLE "ChatMessage" ALTER COLUMN "content" SET DEFAULT '';
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentUrl"  TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentName" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentType" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentSize" INTEGER;
