import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json([]);

  const invitations = await prisma.teamInvitation.findMany({
    where: { teamId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invitations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  const { email, role } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email je povinný" }, { status: 400 });

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existingUser) {
    const isMember = await prisma.teamMember.findFirst({
      where: { teamId, userId: existingUser.id },
    });
    if (isMember) return NextResponse.json({ error: "Uživatel je již členem týmu" }, { status: 400 });
  }

  // Check if already invited
  const existingInvite = await prisma.teamInvitation.findFirst({
    where: { teamId, email: email.trim(), acceptedAt: null },
  });
  if (existingInvite) return NextResponse.json({ error: "Pozvánka na tento email již existuje" }, { status: 400 });

  const invitation = await prisma.teamInvitation.create({
    data: {
      teamId,
      email: email.trim().toLowerCase(),
      role: role || "member",
    },
  });
  return NextResponse.json(invitation, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await req.json();
  await prisma.teamInvitation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
