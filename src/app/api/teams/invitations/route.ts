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
    // Raw SQL to bypass Prisma 7 adapter cuid() generation issue
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

    // Send invitation email (fire-and-forget — failure must not break the response)
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
    sendInvitationEmail({
      to: normalizedEmail,
      token: invitation.token,
      teamName: team?.name ?? "tým",
      inviterName: session.user.name ?? "Správce",
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
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
  // Only delete invitations that belong to the caller's team.
  await prisma.teamInvitation.deleteMany({ where: { id, teamId } });
  return NextResponse.json({ ok: true });
}
