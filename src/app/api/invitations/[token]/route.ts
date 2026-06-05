import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
    include: { team: { select: { id: true, name: true } } },
  });
  if (!invitation) return NextResponse.json({ error: "Pozvánka nenalezena" }, { status: 404 });
  if (invitation.acceptedAt) return NextResponse.json({ error: "Pozvánka již byla použita" }, { status: 410 });
  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Platnost pozvánky vypršela" }, { status: 410 });
  }
  return NextResponse.json({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    team: invitation.team,
  });
}

// Accept an invitation for an already logged-in user whose email matches.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { token } = await params;
  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
    include: { team: { select: { id: true, name: true } } },
  });
  if (!invitation) return NextResponse.json({ error: "Pozvánka nenalezena" }, { status: 404 });
  if (invitation.acceptedAt) return NextResponse.json({ error: "Pozvánka již byla použita" }, { status: 410 });
  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Platnost pozvánky vypršela" }, { status: 410 });
  }
  if (invitation.email.toLowerCase() !== session.user.email!.toLowerCase()) {
    return NextResponse.json({ error: "Pozvánka patří jinému emailu" }, { status: 403 });
  }

  const existing = await prisma.teamMember.findFirst({
    where: { teamId: invitation.teamId, userId: session.user.id },
  });
  if (existing) return NextResponse.json({ error: "Již jsi členem tohoto týmu" }, { status: 400 });

  await prisma.$executeRaw`
    INSERT INTO "TeamMember" (id, role, "joinedAt", "teamId", "userId")
    VALUES (gen_random_uuid()::text, ${invitation.role}, NOW(), ${invitation.teamId}, ${session.user.id})
    ON CONFLICT ("teamId", "userId") DO NOTHING
  `;
  await prisma.teamInvitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ ok: true, teamName: invitation.team.name });
}
