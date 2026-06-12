import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json([]);

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT r.id, r.status, r.message, r."createdAt",
             u.id as "userId", u.name, u.email, u.avatar
      FROM "TeamJoinRequest" r
      JOIN "User" u ON u.id = r."userId"
      WHERE r."teamId" = ${teamId} AND r.status = 'pending'
      ORDER BY r."createdAt" DESC
    `;
    return NextResponse.json(rows.map((r) => ({
      id: r.id, status: r.status, message: r.message, createdAt: r.createdAt,
      user: { id: r.userId, name: r.name, email: r.email, avatar: r.avatar },
    })));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const userId = session.user.id;

  const { joinCode, message } = await req.json();
  if (!joinCode?.trim()) return NextResponse.json({ error: "Kód týmu je povinný" }, { status: 400 });

  const code = joinCode.trim().toLowerCase();

  try {
    // The UI shows the last 10 chars of the team id as the code, but older
    // teams may share their stored joinCode column — accept both.
    const teams = await prisma.team.findMany({
      where: { OR: [{ id: { endsWith: code } }, { joinCode: { equals: code, mode: "insensitive" } }] },
      select: { id: true, name: true },
    });
    if (teams.length === 0) return NextResponse.json({ error: "Tým s tímto kódem neexistuje" }, { status: 404 });
    const team = teams[0];

    const existing = await prisma.teamMember.findFirst({ where: { teamId: team.id, userId } });
    if (existing) return NextResponse.json({ error: "Již jsi členem tohoto týmu" }, { status: 400 });

    // Upsert join request
    await prisma.$executeRaw`
      INSERT INTO "TeamJoinRequest" (id, "teamId", "userId", status, message, "createdAt")
      VALUES (gen_random_uuid()::text, ${team.id}, ${userId}, 'pending', ${message?.trim() || null}, NOW())
      ON CONFLICT ("teamId", "userId") DO UPDATE SET status = 'pending', message = EXCLUDED.message, "resolvedAt" = NULL
    `;
    return NextResponse.json({ ok: true, teamName: team.name }, { status: 201 });
  } catch (e: any) {
    if (e?.message?.includes("TeamJoinRequest")) {
      return NextResponse.json({ error: "Funkce žádostí o přidání není dostupná. Spusť SQL migraci migration_v2.sql." }, { status: 503 });
    }
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  if (!isManager((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { requestId, action } = await req.json();
  if (!requestId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Neplatná akce" }, { status: 400 });
  }

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "TeamJoinRequest" WHERE id = ${requestId} AND "teamId" = ${teamId}
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Žádost nenalezena" }, { status: 404 });
    const request = rows[0];

    await prisma.$executeRaw`
      UPDATE "TeamJoinRequest"
      SET status = ${action === "approve" ? "approved" : "rejected"}, "resolvedAt" = NOW()
      WHERE id = ${requestId}
    `;

    if (action === "approve") {
      // Raw SQL to bypass Prisma 7 adapter cuid() generation issue
      await prisma.$executeRaw`
        INSERT INTO "TeamMember" (id, role, "joinedAt", "teamId", "userId")
        VALUES (gen_random_uuid()::text, 'member', NOW(), ${teamId}, ${request.userId})
        ON CONFLICT ("teamId", "userId") DO NOTHING
      `;
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Chyba serveru — spusť SQL migraci migration_v2.sql" }, { status: 500 });
  }
}
