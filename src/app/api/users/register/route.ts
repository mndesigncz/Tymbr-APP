import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, teamName, inviteToken } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Vyplňte všechna pole" }, { status: 400 });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email již existuje" }, { status: 400 });
    }
    const hashed = await bcrypt.hash(password, 12);

    if (inviteToken) {
      // Joining via invitation link
      const invitation = await prisma.teamInvitation.findUnique({
        where: { token: inviteToken },
      });
      if (!invitation || invitation.acceptedAt) {
        return NextResponse.json({ error: "Pozvánka není platná nebo již byla použita" }, { status: 400 });
      }
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json({ error: "Email se neshoduje s pozvánkou" }, { status: 400 });
      }
      const user = await prisma.user.create({
        data: { name, email, password: hashed },
        select: { id: true, name: true, email: true, role: true },
      });
      await prisma.teamMember.create({
        data: { teamId: invitation.teamId, userId: user.id, role: invitation.role },
      });
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return NextResponse.json(user, { status: 201 });
    }

    // New registration → auto-create a personal team
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: "admin" },
      select: { id: true, name: true, email: true, role: true },
    });
    await prisma.team.create({
      data: {
        name: teamName?.trim() || `${name.split(" ")[0]}'s tým`,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "owner" } },
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
