-- Push subscription storage for Web Push API (VAPID)
CREATE TABLE IF NOT EXISTS "PushSubscription" (
  id        TEXT PRIMARY KEY,
  endpoint  TEXT NOT NULL UNIQUE,
  p256dh    TEXT NOT NULL,
  auth      TEXT NOT NULL,
  "userId"  TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription" ("userId");
