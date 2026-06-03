import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const BUILTIN_DEFAULTS = [
  { key: "todo",        label: "K provedení",   color: "#6B7280", order: 0, showInFocus: true,  isBuiltin: true },
  { key: "in_progress", label: "Probíhá",        color: "#3B82F6", order: 1, showInFocus: true,  isBuiltin: true },
  { key: "review",      label: "Ke schválení",   color: "#EAB308", order: 2, showInFocus: false, isBuiltin: true },
  { key: "done",        label: "Hotovo",          color: "#22C55E", order: 3, showInFocus: false, isBuiltin: true },
];

async function ensureDefaults(teamId: string) {
  const existing = await prisma.$queryRaw<{ key: string }[]>`
    SELECT key FROM "TaskStatusConfig" WHERE "teamId" = ${teamId}
  `;
  const existingKeys = new Set(existing.map((c) => c.key));
  for (const d of BUILTIN_DEFAULTS) {
    if (!existingKeys.has(d.key)) {
      await prisma.$executeRaw`
        INSERT INTO "TaskStatusConfig" (id, key, label, color, "order", "showInFocus", "isBuiltin", "teamId")
        VALUES (gen_random_uuid()::text, ${d.key}, ${d.label}, ${d.color}, ${d.order}, ${d.showInFocus}, ${d.isBuiltin}, ${teamId})
        ON CONFLICT DO NOTHING
      `;
    }
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json(BUILTIN_DEFAULTS.map((d, i) => ({ id: `builtin_${i}`, ...d, teamId: "" })));

  try {
    await ensureDefaults(teamId);
    const configs = await prisma.$queryRaw<any[]>`
      SELECT * FROM "TaskStatusConfig" WHERE "teamId" = ${teamId} ORDER BY "order" ASC
    `;
    return NextResponse.json(configs);
  } catch {
    return NextResponse.json(BUILTIN_DEFAULTS.map((d, i) => ({ id: `builtin_${i}`, ...d, teamId })));
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  const { label, color, showInFocus } = await req.json();
  if (!label?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const key = `custom_${Date.now()}`;
  const safeColor = color || "#8B5CF6";
  const safeFocus = showInFocus ?? true;

  try {
    const existing = await prisma.$queryRaw<{ order: number }[]>`
      SELECT "order" FROM "TaskStatusConfig" WHERE "teamId" = ${teamId} ORDER BY "order" DESC LIMIT 1
    `;
    const maxOrder = existing.length > 0 ? existing[0].order : 3;

    await prisma.$executeRaw`
      INSERT INTO "TaskStatusConfig" (id, key, label, color, "order", "showInFocus", "isBuiltin", "teamId")
      VALUES (gen_random_uuid()::text, ${key}, ${label.trim()}, ${safeColor}, ${maxOrder + 1}, ${safeFocus}, false, ${teamId})
    `;
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "TaskStatusConfig" WHERE "teamId" = ${teamId} AND key = ${key}
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch {
    return NextResponse.json({ error: "Chyba serveru — spusť SQL migraci migration_v2.sql" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  const { id, label, color, showInFocus, order } = await req.json();
  if (!id) return NextResponse.json({ error: "id je povinné" }, { status: 400 });

  try {
    if (label !== undefined) await prisma.$executeRaw`UPDATE "TaskStatusConfig" SET label = ${label} WHERE id = ${id} AND "teamId" = ${teamId}`;
    if (color !== undefined) await prisma.$executeRaw`UPDATE "TaskStatusConfig" SET color = ${color} WHERE id = ${id} AND "teamId" = ${teamId}`;
    if (showInFocus !== undefined) await prisma.$executeRaw`UPDATE "TaskStatusConfig" SET "showInFocus" = ${showInFocus} WHERE id = ${id} AND "teamId" = ${teamId}`;
    if (order !== undefined) await prisma.$executeRaw`UPDATE "TaskStatusConfig" SET "order" = ${order} WHERE id = ${id} AND "teamId" = ${teamId}`;

    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "TaskStatusConfig" WHERE id = ${id}`;
    return NextResponse.json(rows[0] ?? {});
  } catch {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id je povinné" }, { status: 400 });

  try {
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "TaskStatusConfig" WHERE id = ${id} AND "teamId" = ${teamId}`;
    if (rows.length === 0) return NextResponse.json({ error: "Stav nenalezen" }, { status: 404 });
    if (rows[0].isBuiltin) return NextResponse.json({ error: "Vestavěné stavy nelze smazat" }, { status: 400 });
    await prisma.$executeRaw`DELETE FROM "TaskStatusConfig" WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
