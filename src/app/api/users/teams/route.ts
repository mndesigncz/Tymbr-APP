import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const userId = session.user.id;
  if (!userId) return NextResponse.json([]);

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: {
      role: true,
      team: {
        select: {
          id: true,
          name: true,
          logo: true,
          parentId: true,
          parent: { select: { name: true } },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const teams = memberships.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    logo: m.team.logo ?? null,
    role: m.role,
    memberCount: m.team._count.members,
    parentId: m.team.parentId ?? null,
    parentName: m.team.parent?.name ?? null,
  }));

  return NextResponse.json(teams);
}
