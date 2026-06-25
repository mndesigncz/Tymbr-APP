-- Add approval fields to Category
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "approvalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "approverId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Category_approverId_fkey'
  ) THEN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_approverId_fkey"
      FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Category_approverId_idx" ON "Category"("approverId");

-- Add approval fields to Task
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Task_approvedById_fkey'
  ) THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_approvedById_fkey"
      FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Task_approvedById_idx" ON "Task"("approvedById");
