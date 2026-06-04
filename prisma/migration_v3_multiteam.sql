-- Multi-team support: a user can own more than one team.
-- Drops the one-owner-per-team unique constraint and replaces it with a plain index.
-- Safe to run multiple times.

ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key";
CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId");
