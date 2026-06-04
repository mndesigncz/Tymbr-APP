-- Team files: folders and uploaded files / external links
CREATE TABLE IF NOT EXISTS "TeamFolder" (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name      TEXT NOT NULL,
  "parentId" TEXT,
  "teamId"  TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("parentId") REFERENCES "TeamFolder"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "TeamFolder_teamId_idx" ON "TeamFolder" ("teamId");
CREATE INDEX IF NOT EXISTS "TeamFolder_parentId_idx" ON "TeamFolder" ("parentId");

CREATE TABLE IF NOT EXISTS "TeamFile" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  -- 'upload' or 'link'
  type        TEXT NOT NULL DEFAULT 'upload',
  -- Vercel Blob URL (upload) or external URL (link)
  url         TEXT NOT NULL,
  -- mime type for uploads, null for links
  "mimeType"  TEXT,
  -- bytes, null for links
  size        BIGINT,
  "folderId"  TEXT,
  "teamId"    TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("folderId") REFERENCES "TeamFolder"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "TeamFile_teamId_idx" ON "TeamFile" ("teamId");
CREATE INDEX IF NOT EXISTS "TeamFile_folderId_idx" ON "TeamFile" ("folderId");
