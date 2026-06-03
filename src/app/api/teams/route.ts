import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function computeJoinCode(teamId: string): string {
  return teamId.slice(-10).toLowerCase();
}

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

  let joinRequests: any[] = [];
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT r.id, r.status, r.message, r."createdAt",
             u.id as "userId", u.name, u.email, u.avatar
      FROM "TeamJoinRequest" r
      JOIN "User" u ON u.id = r."userId"
      WHERE r."teamId" = ${teamId} AND r.status = 'pending'
      ORDER BY r."createdAt" DESC
    `;
    joinRequests = rows.map((r) => ({
      id: r.id,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      user: { id: r.userId, name: r.name, email: r.email, avatar: r.avatar },
    }));
  } catch {}

  return NextResponse.json({
    ...team,
    joinCode: computeJoinCode(teamId),
    joinRequests,
  });
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
