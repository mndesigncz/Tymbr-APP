-- Per-team configurable task priorities.
-- One priority per team is the "urgent" one (red, rename-only, never deletable);
-- all others are freely added/edited/removed with custom name + colour.
-- The API seeds defaults (low/medium/high/urgent) on first read so existing
-- tasks (which store priority as a key string) keep mapping to a config row.

CREATE TABLE IF NOT EXISTS "TaskPriorityConfig" (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL,
  label       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#3B82F6',
  "order"     INTEGER NOT NULL DEFAULT 0,
  "isUrgent"  BOOLEAN NOT NULL DEFAULT false,
  "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
  "teamId"    TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "TaskPriorityConfig_team_key" ON "TaskPriorityConfig" ("teamId", key);
CREATE INDEX IF NOT EXISTS "TaskPriorityConfig_teamId_idx" ON "TaskPriorityConfig" ("teamId");
