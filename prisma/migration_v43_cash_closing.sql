-- Daily cash-register closing ("uzávěrka") + configurable standard cash float.
ALTER TABLE "TeamBilling" ADD COLUMN IF NOT EXISTS "cashStandard" DOUBLE PRECISION NOT NULL DEFAULT 6900;

CREATE TABLE IF NOT EXISTS "CashClosing" (
  "id"            TEXT PRIMARY KEY,
  "date"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cashStart"     DOUBLE PRECISION NOT NULL,
  "standard"      DOUBLE PRECISION NOT NULL DEFAULT 6900,
  "salesCash"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "salesCard"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cashWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "movements"     TEXT NOT NULL DEFAULT '[]',
  "payouts"       TEXT NOT NULL DEFAULT '[]',
  "toSafe"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cashEnd"       DOUBLE PRECISION NOT NULL,
  "safeStart"     DOUBLE PRECISION NOT NULL,
  "safeEnd"       DOUBLE PRECISION NOT NULL,
  "note"          TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "teamId"        TEXT NOT NULL,
  "createdById"   TEXT NOT NULL,
  CONSTRAINT "CashClosing_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE,
  CONSTRAINT "CashClosing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id")
);
CREATE INDEX IF NOT EXISTS "CashClosing_teamId_date_idx" ON "CashClosing"("teamId", "date");
