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

  // Only managers (owner/admin) can remove members
  if (!isManager((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  // The team owner can never be removed.
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

  const { userId, role } = await req.json();
  if (!userId || !role) return NextResponse.json({ error: "userId a role jsou povinné" }, { status: 400 });
  if (!["admin", "member"].includes(role)) {
    return NextResponse.json({ error: "Neplatná role" }, { status: 400 });
  }

  // Managers (owner/admin) can promote members to admin (manager) or demote them.
  if (!isManager((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  // The owner's role is fixed — it can't be changed through this endpoint.
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
  if (team?.ownerId === userId) {
    return NextResponse.json({ error: "Roli vlastníka nelze měnit" }, { status: 400 });
  }

  await prisma.teamMember.updateMany({ where: { teamId, userId }, data: { role } });
  return NextResponse.json({ ok: true });
}
