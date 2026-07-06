import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId je povinný" }, { status: 400 });

  if (!isManager((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
  if (team?.ownerId === userId) {
    return NextResponse.json({ error: "Vlastníka týmu nelze odebrat" }, { status: 400 });
  }

  await prisma.teamMember.deleteMany({ where: { teamId, userId } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  if (!isManager((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, role, permissions } = body;
  if (!userId) return NextResponse.json({ error: "userId je povinný" }, { status: 400 });
  if (role !== undefined && !["admin", "member", "finance"].includes(role)) {
    return NextResponse.json({ error: "Neplatná role" }, { status: 400 });
  }
  if (role === undefined && permissions === undefined) {
    return NextResponse.json({ error: "role nebo permissions jsou povinné" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
  if (role !== undefined && team?.ownerId === userId) {
    return NextResponse.json({ error: "Roli vlastníka nelze měnit" }, { status: 400 });
  }

  const data: Record<string, any> = {};
  if (role !== undefined) data.role = role;
  if (permissions !== undefined) {
    data.permissions = Array.isArray(permissions) ? JSON.stringify(permissions) : null;
  }

  await prisma.teamMember.updateMany({ where: { teamId, userId }, data });
  return NextResponse.json({ ok: true });
}
