import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const existingTeamId = (session.user as any).teamId;
  if (existingTeamId) return NextResponse.json({ error: "Již jsi součástí týmu" }, { status: 400 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const userId = session.user.id;
  if (!userId) return NextResponse.json({ error: "Relace vypršela — odhlaste se a přihlaste znovu" }, { status: 401 });

  try {
    // Use raw SQL to bypass Prisma 7 adapter cuid() generation issue
    await prisma.$executeRaw`
      INSERT INTO "Team" (id, name, "createdAt", "ownerId")
      VALUES (gen_random_uuid()::text, ${name.trim()}, NOW(), ${userId})
    `;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "Team" WHERE "ownerId" = ${userId} ORDER BY "createdAt" DESC LIMIT 1
    `;
    const team = rows[0];

    await prisma.$executeRaw`
      INSERT INTO "TeamMember" (id, role, "joinedAt", "teamId", "userId")
      VALUES (gen_random_uuid()::text, 'owner', NOW(), ${team.id}, ${userId})
      ON CONFLICT ("teamId", "userId") DO NOTHING
    `;

    return NextResponse.json(team, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
