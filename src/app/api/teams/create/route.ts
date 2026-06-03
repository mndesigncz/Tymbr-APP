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
    // Create team and owner membership as two separate operations to avoid
    // nested-create issues with Prisma 7 adapter-based client
    const team = await prisma.team.create({
      data: { name: name.trim(), ownerId: userId },
    });

    await prisma.teamMember.create({
      data: { teamId: team.id, userId, role: "owner" },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
