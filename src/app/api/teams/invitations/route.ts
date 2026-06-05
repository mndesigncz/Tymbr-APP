import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { sendInvitationEmail } from "@/lib/email";

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

  if (!isManager((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email je povinný" }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const isMember = await prisma.teamMember.findFirst({
      where: { teamId, userId: existingUser.id },
    });
    if (isMember) return NextResponse.json({ error: "Uživatel je již členem týmu" }, { status: 400 });
  }

  // Check if already invited
  const existingInvite = await prisma.teamInvitation.findFirst({
    where: { teamId, email: normalizedEmail, acceptedAt: null },
  });
  if (existingInvite) return NextResponse.json({ error: "Pozvánka na tento email již existuje" }, { status: 400 });

  try {
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO "TeamInvitation" (id, email, token, role, "createdAt", "expiresAt", "teamId")
      VALUES (
        gen_random_uuid()::text,
        ${normalizedEmail},
        gen_random_uuid()::text,
        ${role || "member"},
        NOW(),
        NOW() + INTERVAL '7 days',
        ${teamId}
      )
      RETURNING id, email, token, role, "createdAt", "expiresAt", "teamId"
    `;
    const invitation = rows[0];

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
    const emailSent = await sendInvitationEmail({
      to: normalizedEmail,
      token: invitation.token,
      teamName: team?.name ?? "tým",
      inviterName: session.user.name ?? "Správce",
    });

    return NextResponse.json({ ...invitation, emailSent }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}

// Resend invitation email for an existing pending invitation.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });
  if (!isManager((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID pozvánky je povinné" }, { status: 400 });

  const invitation = await prisma.teamInvitation.findFirst({
    where: { id, teamId, acceptedAt: null },
  });
  if (!invitation) return NextResponse.json({ error: "Pozvánka nenalezena" }, { status: 404 });

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
  const emailSent = await sendInvitationEmail({
    to: invitation.email,
    token: invitation.token,
    teamName: team?.name ?? "tým",
    inviterName: session.user.name ?? "Správce",
  });

  return NextResponse.json({ ok: true, emailSent });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });
  if (!isManager((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Nedostatečná oprávnění" }, { status: 403 });
  }

  const { id } = await req.json();
  await prisma.teamInvitation.deleteMany({ where: { id, teamId } });
  return NextResponse.json({ ok: true });
}
