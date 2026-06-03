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

  try {
    const userId = session.user.id;
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        ownerId: userId,
        members: { create: { userId, role: "owner" } },
      },
    });
    return NextResponse.json(team, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
