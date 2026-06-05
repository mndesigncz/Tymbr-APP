/**
 * Idempotently applies all migration_v*.sql files at build time.
 * All migrations use IF NOT EXISTS so re-running is safe.
 */
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("[ensure-schema] DATABASE_URL not set, skipping");
    return;
  }

  const pool = new Pool({ connectionString });
  try {
    const dir = path.join(__dirname);
    const files = fs
      .readdirSync(dir)
      .filter((f) => /^migration_v\d+.*\.sql$/.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/migration_v(\d+)/)?.[1] ?? "0", 10);
        const numB = parseInt(b.match(/migration_v(\d+)/)?.[1] ?? "0", 10);
        return numA - numB;
      });

    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      try {
        await pool.query(sql);
        console.log(`[ensure-schema] applied ${file}`);
      } catch (e: any) {
        // Log but don't abort — some statements may fail on re-run if not idempotent
        console.warn(`[ensure-schema] warning in ${file}: ${e?.message}`);
      }
    }

    console.log("[ensure-schema] done");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[ensure-schema] fatal:", e?.message ?? e);
  process.exit(1);
});
