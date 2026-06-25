-- Add approval fields to Category
ALTER TABLE "Category" ADD COLUMN "approvalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN "approverId" TEXT;
ALTER TABLE "Category" ADD CONSTRAINT "Category_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Category_approverId_idx" ON "Category"("approverId");

-- Add approval fields to Task
ALTER TABLE "Task" ADD COLUMN "approvalStatus" TEXT;
ALTER TABLE "Task" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "Task" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD CONSTRAINT "Task_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Task_approvedById_idx" ON "Task"("approvedById");
