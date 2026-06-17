import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const teamId = (session.user as any).teamId;
    if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

    if (!isManager((session.user as any).teamRole)) {
      return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
    }

    const { name, email, password, role, permissions } = await req.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Vyplňte všechna povinná pole" }, { status: 400 });
    }
    if (!["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Neplatná role" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (exists) return NextResponse.json({ error: "Email již existuje" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 12);
    const permissionsJson: string | null = Array.isArray(permissions) && role === "member"
      ? JSON.stringify(permissions)
      : null;

    const userRows = await prisma.$queryRaw<any[]>`
      INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${name.trim()}, ${email.trim().toLowerCase()}, ${hashed}, 'member', NOW(), NOW())
      RETURNING id, name, email, role
    `;
    const user = userRows[0];

    await prisma.$executeRaw`
      INSERT INTO "TeamMember" (id, role, permissions, "joinedAt", "teamId", "userId")
      VALUES (gen_random_uuid()::text, ${role}, ${permissionsJson}, NOW(), ${teamId}, ${user.id})
      ON CONFLICT ("teamId", "userId") DO NOTHING
    `;

    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/teams/members/create]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
