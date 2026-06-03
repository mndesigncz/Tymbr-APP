-- Migration v2: TeamJoinRequest, joinCode, TaskStatusConfig, ChatMessage DM support

-- 1. Add joinCode to Team
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "joinCode" TEXT;
UPDATE "Team" SET "joinCode" = left(md5("id"), 10) WHERE "joinCode" IS NULL;
ALTER TABLE "Team" ALTER COLUMN "joinCode" SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Team_joinCode_key') THEN
    CREATE UNIQUE INDEX "Team_joinCode_key" ON "Team"("joinCode");
  END IF;
END $$;

-- 2. TeamJoinRequest
CREATE TABLE IF NOT EXISTS "TeamJoinRequest" (
  "id"         TEXT NOT NULL DEFAULT left(md5(random()::text || clock_timestamp()::text), 25),
  "status"     TEXT NOT NULL DEFAULT 'pending',
  "message"    TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "teamId"     TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  CONSTRAINT "TeamJoinRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamJoinRequest_teamId_userId_key" UNIQUE ("teamId", "userId")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamJoinRequest_teamId_fkey') THEN
    ALTER TABLE "TeamJoinRequest" ADD CONSTRAINT "TeamJoinRequest_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamJoinRequest_userId_fkey') THEN
    ALTER TABLE "TeamJoinRequest" ADD CONSTRAINT "TeamJoinRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TeamJoinRequest_teamId_idx') THEN
    CREATE INDEX "TeamJoinRequest_teamId_idx" ON "TeamJoinRequest"("teamId");
  END IF;
END $$;

-- 3. TaskStatusConfig
CREATE TABLE IF NOT EXISTS "TaskStatusConfig" (
  "id"          TEXT NOT NULL DEFAULT left(md5(random()::text || clock_timestamp()::text), 25),
  "key"         TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "color"       TEXT NOT NULL DEFAULT '#9a9aa2',
  "order"       INTEGER NOT NULL DEFAULT 0,
  "showInFocus" BOOLEAN NOT NULL DEFAULT true,
  "isBuiltin"   BOOLEAN NOT NULL DEFAULT true,
  "teamId"      TEXT NOT NULL,
  CONSTRAINT "TaskStatusConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskStatusConfig_teamId_key_key" UNIQUE ("teamId", "key")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskStatusConfig_teamId_fkey') THEN
    ALTER TABLE "TaskStatusConfig" ADD CONSTRAINT "TaskStatusConfig_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TaskStatusConfig_teamId_idx') THEN
    CREATE INDEX "TaskStatusConfig_teamId_idx" ON "TaskStatusConfig"("teamId");
  END IF;
END $$;

-- 4. ChatMessage DM support
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_recipientId_fkey') THEN
    ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_recipientId_fkey"
      FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ChatMessage_recipientId_idx') THEN
    CREATE INDEX "ChatMessage_recipientId_idx" ON "ChatMessage"("recipientId");
  END IF;
END $$;

-- 5. Update ChatMessage user relation name (if needed - no-op if already correct)
-- The sender FK is already "ChatMessage_userId_fkey" referencing User, no change needed.
