-- Multi-team support: a user can own more than one team.
-- The uniqueness restriction is a UNIQUE INDEX (not a formal constraint),
-- so DROP INDEX is required. DROP CONSTRAINT is also attempted for safety.
-- Safe to run multiple times (all statements use IF EXISTS / IF NOT EXISTS).

DROP INDEX IF EXISTS "Team_ownerId_key";
ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ownerId_key";
CREATE INDEX IF NOT EXISTS "Team_ownerId_idx" ON "Team" ("ownerId");
