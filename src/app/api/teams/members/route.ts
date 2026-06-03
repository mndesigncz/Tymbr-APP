import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId je povinný" }, { status: 400 });

  // Only owner or admin can remove members
  const actingMember = await prisma.teamMember.findFirst({
    where: { teamId, userId: session.user.id },
  });
  if (!actingMember || (actingMember.role !== "owner" && actingMember.role !== "admin")) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
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

  // Only owner can change roles
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (team?.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const member = await prisma.teamMember.updateMany({
    where: { teamId, userId },
    data: { role },
  });
  return NextResponse.json(member);
}
