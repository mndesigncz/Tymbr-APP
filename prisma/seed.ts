import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbUrl = path.resolve(process.cwd(), "dev.db");
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbUrl }),
} as any);

async function main() {
  const password = await bcrypt.hash("demo1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@tymbr.cz" },
    update: {},
    create: { name: "Jan Novák", email: "admin@tymbr.cz", password, role: "admin" },
  });

  const member = await prisma.user.upsert({
    where: { email: "jana@tymbr.cz" },
    update: {},
    create: { name: "Jana Dvořáková", email: "jana@tymbr.cz", password, role: "member" },
  });

  const dev = await prisma.category.upsert({
    where: { id: "cat-dev" },
    update: {},
    create: { id: "cat-dev", name: "Vývoj", color: "#3B82F6", icon: "code" },
  });

  const marketing = await prisma.category.upsert({
    where: { id: "cat-mkt" },
    update: {},
    create: { id: "cat-mkt", name: "Marketing", color: "#F97316", icon: "megaphone" },
  });

  const design = await prisma.category.upsert({
    where: { id: "cat-des" },
    update: {},
    create: { id: "cat-des", name: "Design", color: "#8B5CF6", icon: "palette" },
  });

  const tasks = [
    {
      title: "Redesign hlavní stránky",
      description: "Kompletní přepracování vizuálu hlavní stránky webu. Nový layout, moderní design, responsivita.",
      status: "in_progress",
      priority: "high",
      categoryId: design.id,
      assigneeId: member.id,
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
    {
      title: "Implementace platební brány",
      description: "Integrace Stripe pro zpracování plateb. Testovací prostředí + produkce.",
      status: "todo",
      priority: "urgent",
      categoryId: dev.id,
      assigneeId: admin.id,
      dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
    },
    {
      title: "Příprava marketingové kampaně",
      description: "Plán kampaně na sociálních sítích pro launch nové verze produktu.",
      status: "todo",
      priority: "medium",
      categoryId: marketing.id,
      dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
    },
    {
      title: "Oprava chyby v přihlašování",
      description: "Uživatelé hlásí problémy s přihlášením přes mobilní zařízení.",
      status: "done",
      priority: "urgent",
      categoryId: dev.id,
      assigneeId: admin.id,
    },
    {
      title: "Newsletter pro zákazníky",
      description: "Měsíční newsletter s novinkami produktu a tipy pro uživatele.",
      status: "review",
      priority: "low",
      categoryId: marketing.id,
      assigneeId: member.id,
      dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
    },
    {
      title: "Vytvoření design systému",
      description: "Dokumentace a komponenty pro konzistentní UI napříč produkty.",
      status: "in_progress",
      priority: "medium",
      categoryId: design.id,
      assigneeId: member.id,
    },
  ];

  for (const t of tasks) {
    await prisma.task.create({
      data: { ...t, createdById: admin.id },
    });
  }

  console.log("Seed done! Login: admin@tymbr.cz / demo1234");
}

main().finally(() => prisma.$disconnect());
