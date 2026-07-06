-- v35: invoicing — team billing settings, invoices, invoice items
CREATE TABLE IF NOT EXISTS "TeamBilling" (
  id              TEXT PRIMARY KEY,
  "supplierName"  TEXT NOT NULL DEFAULT '',
  address         TEXT,
  ico             TEXT,
  dic             TEXT,
  "bankAccount"   TEXT,
  "vatPayer"      BOOLEAN NOT NULL DEFAULT false,
  "vatRate"       DOUBLE PRECISION NOT NULL DEFAULT 21,
  "invoicePrefix" TEXT NOT NULL DEFAULT '',
  "nextNumber"    INTEGER NOT NULL DEFAULT 1,
  "dueDays"       INTEGER NOT NULL DEFAULT 14,
  "footerNote"    TEXT,
  "teamId"        TEXT NOT NULL UNIQUE REFERENCES "Team"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Invoice" (
  id               TEXT PRIMARY KEY,
  number           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft', -- draft | issued | paid
  "issueDate"      TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "dueDate"        TIMESTAMP(3) NOT NULL,
  "paidAt"         TIMESTAMP(3),
  subtotal         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vatRate"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vatAmount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  total            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "variableSymbol" TEXT,
  note             TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "teamId"         TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
  "clientId"       TEXT NOT NULL REFERENCES "Client"(id),
  "createdById"    TEXT NOT NULL REFERENCES "User"(id)
);
CREATE INDEX IF NOT EXISTS "Invoice_teamId_idx"   ON "Invoice"("teamId");
CREATE INDEX IF NOT EXISTS "Invoice_clientId_idx" ON "Invoice"("clientId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx"   ON "Invoice"(status);

CREATE TABLE IF NOT EXISTS "InvoiceItem" (
  id          TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  quantity    DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit        TEXT NOT NULL DEFAULT 'ks',
  "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "invoiceId" TEXT NOT NULL REFERENCES "Invoice"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
