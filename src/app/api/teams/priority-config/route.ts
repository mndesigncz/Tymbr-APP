import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Defaults seeded per team. The keys match the legacy hardcoded priorities so
// existing tasks keep resolving to a config row. "urgent" is the protected one.
const BUILTIN_DEFAULTS = [
  { key: "low",    label: "Nízká",    color: "#6B7280", order: 0, isUrgent: false, isBuiltin: false },
  { key: "medium", label: "Střední",  color: "#3B82F6", order: 1, isUrgent: false, isBuiltin: false },
  { key: "high",   label: "Vysoká",   color: "#F97316", order: 2, isUrgent: false, isBuiltin: false },
  { key: "urgent", label: "Urgentní", color: "#EF4444", order: 3, isUrgent: true,  isBuiltin: true  },
];

async function ensureDefaults(teamId: string) {
  const existing = await prisma.$queryRaw<{ key: string }[]>`
    SELECT key FROM "TaskPriorityConfig" WHERE "teamId" = ${teamId}
  `;
  const existingKeys = new Set(existing.map((c) => c.key));
  // If the team already has at least one priority, only guarantee the urgent one.
  const hasAny = existing.length > 0;
  for (const d of BUILTIN_DEFAULTS) {
    if (existingKeys.has(d.key)) continue;
    if (hasAny && !d.isUrgent) continue; // don't re-add removed defaults
    await prisma.$executeRaw`
      INSERT INTO "TaskPriorityConfig" (id, key, label, color, "order", "isUrgent", "isBuiltin", "teamId")
      VALUES (gen_random_uuid()::text, ${d.key}, ${d.label}, ${d.color}, ${d.order}, ${d.isUrgent}, ${d.isBuiltin}, ${teamId})
      ON CONFLICT DO NOTHING
    `;
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
      SELECT * FROM "TaskPriorityConfig" WHERE "teamId" = ${teamId} ORDER BY "order" ASC
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

  const { label, color } = await req.json();
  if (!label?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const key = `custom_${Date.now()}`;
  const safeColor = color || "#8B5CF6";

  try {
    const existing = await prisma.$queryRaw<{ order: number }[]>`
      SELECT "order" FROM "TaskPriorityConfig" WHERE "teamId" = ${teamId} ORDER BY "order" DESC LIMIT 1
    `;
    const maxOrder = existing.length > 0 ? existing[0].order : 0;

    await prisma.$executeRaw`
      INSERT INTO "TaskPriorityConfig" (id, key, label, color, "order", "isUrgent", "isBuiltin", "teamId")
      VALUES (gen_random_uuid()::text, ${key}, ${label.trim()}, ${safeColor}, ${maxOrder + 1}, false, false, ${teamId})
    `;
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "TaskPriorityConfig" WHERE "teamId" = ${teamId} AND key = ${key}
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch {
    return NextResponse.json({ error: "Chyba serveru — spusť SQL migraci migration_v4_priority.sql" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  const { id, label, color, order } = await req.json();
  if (!id) return NextResponse.json({ error: "id je povinné" }, { status: 400 });

  try {
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "TaskPriorityConfig" WHERE id = ${id} AND "teamId" = ${teamId}`;
    if (rows.length === 0) return NextResponse.json({ error: "Priorita nenalezena" }, { status: 404 });
    const isUrgent = rows[0].isUrgent;

    if (label !== undefined) await prisma.$executeRaw`UPDATE "TaskPriorityConfig" SET label = ${label} WHERE id = ${id} AND "teamId" = ${teamId}`;
    // The urgent priority stays red — only its label can change.
    if (color !== undefined && !isUrgent) await prisma.$executeRaw`UPDATE "TaskPriorityConfig" SET color = ${color} WHERE id = ${id} AND "teamId" = ${teamId}`;
    if (order !== undefined) await prisma.$executeRaw`UPDATE "TaskPriorityConfig" SET "order" = ${order} WHERE id = ${id} AND "teamId" = ${teamId}`;

    const updated = await prisma.$queryRaw<any[]>`SELECT * FROM "TaskPriorityConfig" WHERE id = ${id} AND "teamId" = ${teamId}`;
    return NextResponse.json(updated[0] ?? {});
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
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "TaskPriorityConfig" WHERE id = ${id} AND "teamId" = ${teamId}`;
    if (rows.length === 0) return NextResponse.json({ error: "Priorita nenalezena" }, { status: 404 });
    if (rows[0].isUrgent) return NextResponse.json({ error: "Urgentní prioritu nelze smazat" }, { status: 400 });
    await prisma.$executeRaw`DELETE FROM "TaskPriorityConfig" WHERE id = ${id} AND "teamId" = ${teamId}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
