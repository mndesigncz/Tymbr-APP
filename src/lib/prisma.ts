import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL || "file:dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaLibSql(
      authToken ? { url, authToken } : { url }
    ),
  } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
