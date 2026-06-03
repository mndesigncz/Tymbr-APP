import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json(null);

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        orderBy: { joinedAt: "asc" },
      },
      invitations: {
        where: { acceptedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return NextResponse.json(team);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const team = await prisma.team.update({ where: { id: teamId }, data: { name: name.trim() } });
  return NextResponse.json(team);
}
