-- v22: task & subtask time estimates + task expenses for budget/price estimation
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "estimatedMinutes" INTEGER;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "expenses" DOUBLE PRECISION;
ALTER TABLE "SubTask" ADD COLUMN IF NOT EXISTS "estimatedMinutes" INTEGER;
