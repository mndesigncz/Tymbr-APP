-- v34: clients (CRM base) + projects layer
CREATE TABLE IF NOT EXISTS "Client" (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  "contactName" TEXT,
  email         TEXT,
  phone         TEXT,
  website       TEXT,
  address       TEXT,
  ico           TEXT,
  dic           TEXT,
  note          TEXT,
  stage         TEXT NOT NULL DEFAULT 'lead', -- lead | negotiation | active | inactive | lost
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "teamId"      TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "User"(id)
);
CREATE INDEX IF NOT EXISTS "Client_teamId_idx" ON "Client"("teamId");
CREATE INDEX IF NOT EXISTS "Client_stage_idx"  ON "Client"(stage);

CREATE TABLE IF NOT EXISTS "Project" (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'active', -- active | on_hold | done | archived
  color         TEXT,
  budget        DOUBLE PRECISION,
  "startDate"   TIMESTAMP(3),
  deadline      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "teamId"      TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
  "clientId"    TEXT REFERENCES "Client"(id) ON DELETE SET NULL,
  "createdById" TEXT NOT NULL REFERENCES "User"(id)
);
CREATE INDEX IF NOT EXISTS "Project_teamId_idx"   ON "Project"("teamId");
CREATE INDEX IF NOT EXISTS "Project_clientId_idx" ON "Project"("clientId");

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "projectId" TEXT REFERENCES "Project"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Task_projectId_idx" ON "Task"("projectId");
