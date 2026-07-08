-- Google Calendar OAuth connection, one per user.
CREATE TABLE IF NOT EXISTS "GoogleCalendarAccount" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT NOT NULL UNIQUE,
  "email"         TEXT,
  "accessToken"   TEXT NOT NULL,
  "refreshToken"  TEXT NOT NULL,
  "expiresAt"     TIMESTAMP(3) NOT NULL,
  "calendarId"    TEXT NOT NULL DEFAULT 'primary',
  "syncEnabled"   BOOLEAN NOT NULL DEFAULT true,
  "connectedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoogleCalendarAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
