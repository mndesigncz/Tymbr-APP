-- Add custom approver directly on Task (used when category has no approval enabled)
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "customApproverId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Task_customApproverId_fkey'
  ) THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_customApproverId_fkey"
      FOREIGN KEY ("customApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Task_customApproverId_idx" ON "Task"("customApproverId");
