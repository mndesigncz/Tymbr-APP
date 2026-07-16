-- Personal API tokens (Bearer) for external clients (e.g. macOS app).
CREATE TABLE IF NOT EXISTS "PersonalToken" (
  "id"         TEXT PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "tokenHash"  TEXT NOT NULL UNIQUE,
  "prefix"     TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"     TEXT NOT NULL,
  CONSTRAINT "PersonalToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "PersonalToken_userId_idx" ON "PersonalToken"("userId");
