-- v21: per-member navigation permissions stored as JSON array of tab keys
ALTER TABLE "TeamMember" ADD COLUMN IF NOT EXISTS "permissions" TEXT;
