-- v32: bind every note to a team.
-- Notes are now scoped to the team they were created in (private and team
-- notes alike). Legacy notes created before this change may have a NULL
-- "teamId" (private notes never stored one). Backfill those to the creator's
-- first-joined team so they remain visible and become properly team-scoped.
-- Notes whose creator has no team membership stay NULL (still visible to the
-- creator via the app's NULL fallback).
UPDATE "Note" n
SET "teamId" = sub."teamId"
FROM (
  SELECT DISTINCT ON (tm."userId") tm."userId", tm."teamId"
  FROM "TeamMember" tm
  ORDER BY tm."userId", tm."joinedAt" ASC
) sub
WHERE n."teamId" IS NULL
  AND n."createdById" = sub."userId";
