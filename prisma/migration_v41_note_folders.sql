-- Note "bookmarks" / folders, and a note's optional folder assignment.
CREATE TABLE IF NOT EXISTS "NoteFolder" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "color"       TEXT,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "NoteFolder_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "NoteFolder_createdById_idx" ON "NoteFolder"("createdById");

ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "folderId" TEXT;
CREATE INDEX IF NOT EXISTS "Note_folderId_idx" ON "Note"("folderId");
-- Best-effort FK (ignored if it already exists).
DO $$ BEGIN
  ALTER TABLE "Note" ADD CONSTRAINT "Note_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "NoteFolder"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
