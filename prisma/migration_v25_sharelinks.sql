-- Public share links: a token that exposes a single read-only resource
-- (note / task / event) to anyone who has the link, even without an account.
CREATE TABLE IF NOT EXISTS "ShareLink" (
  id            TEXT PRIMARY KEY,
  token         TEXT NOT NULL UNIQUE,
  "resourceType" TEXT NOT NULL,          -- 'note' | 'task' | 'event'
  "resourceId"  TEXT NOT NULL,
  "createdById" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "teamId"      TEXT,
  revoked       BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt"   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "ShareLink_token_idx" ON "ShareLink" (token);
CREATE INDEX IF NOT EXISTS "ShareLink_resource_idx" ON "ShareLink" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "ShareLink_createdById_idx" ON "ShareLink" ("createdById");
