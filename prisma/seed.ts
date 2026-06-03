import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as any);

// Tymbr is a clean multi-tenant app: every user registers their own account and
// gets their own team with no shared/demo data. We intentionally do NOT seed any
// demo users, categories or tasks here.
async function main() {
  console.log("No demo data seeded — Tymbr runs as a clean multi-tenant app.");
}

main().finally(() => prisma.$disconnect());
