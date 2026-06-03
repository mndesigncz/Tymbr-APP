-- Cleanup demo / legacy data so Tymbr is a clean multi-tenant app.
-- Run this ONCE in the Neon SQL editor (production database).
-- Safe to run multiple times.

-- 1. Delete legacy tasks that belong to no team (the old seeded demo tasks)
DELETE FROM "Task" WHERE "teamId" IS NULL;

-- 2. Delete legacy categories that belong to no team (the old global categories)
DELETE FROM "Category" WHERE "teamId" IS NULL;

-- 3. Delete the demo accounts that came from the old seed script.
--    This also cascades their team memberships, owned teams, tasks, etc.
DELETE FROM "User" WHERE "email" IN ('admin@tymbr.cz', 'jana@tymbr.cz');
