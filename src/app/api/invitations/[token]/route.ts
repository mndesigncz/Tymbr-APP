import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
    include: { team: { select: { id: true, name: true } } },
  });
  if (!invitation) return NextResponse.json({ error: "Pozvánka nenalezena" }, { status: 404 });
  if (invitation.acceptedAt) return NextResponse.json({ error: "Pozvánka již byla použita" }, { status: 410 });
  return NextResponse.json({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    team: invitation.team,
  });
}
