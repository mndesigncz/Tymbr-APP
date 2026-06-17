-- v24: notes + collaborators
CREATE TABLE IF NOT EXISTS "Note" (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  color       TEXT,
  pinned      BOOLEAN NOT NULL DEFAULT false,
  visibility  TEXT NOT NULL DEFAULT 'private',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "teamId"    TEXT REFERENCES "Team"(id) ON DELETE SET NULL,
  "createdById" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Note_teamId_idx"      ON "Note"("teamId");
CREATE INDEX IF NOT EXISTS "Note_createdById_idx" ON "Note"("createdById");

CREATE TABLE IF NOT EXISTS "NoteCollaborator" (
  id          TEXT PRIMARY KEY,
  "noteId"    TEXT NOT NULL REFERENCES "Note"(id) ON DELETE CASCADE,
  "userId"    TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("noteId", "userId")
);
