import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

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
      const inviteTeam = await prisma.team.findUnique({ where: { id: invitation.teamId }, select: { name: true } });
      const userRows = await prisma.$queryRaw<any[]>`
        INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${name}, ${email}, ${hashed}, 'member', NOW(), NOW())
        RETURNING id, name, email, role
      `;
      const user = userRows[0];
      await prisma.$executeRaw`
        INSERT INTO "TeamMember" (id, role, "joinedAt", "teamId", "userId")
        VALUES (gen_random_uuid()::text, ${invitation.role}, NOW(), ${invitation.teamId}, ${user.id})
        ON CONFLICT ("teamId", "userId") DO NOTHING
      `;
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      sendWelcomeEmail({ to: email, name, teamName: inviteTeam?.name ?? "tým" });
      return NextResponse.json(user, { status: 201 });
    }

    // New registration → auto-create a personal team using raw SQL (Prisma 7 adapter cuid() bug)
    const userRows = await prisma.$queryRaw<any[]>`
      INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${name}, ${email}, ${hashed}, 'admin', NOW(), NOW())
      RETURNING id, name, email, role
    `;
    const user = userRows[0];
    await prisma.$executeRaw`
      INSERT INTO "Team" (id, name, "createdAt", "ownerId", "joinCode")
      VALUES (
        gen_random_uuid()::text,
        ${teamName?.trim() || `${name.split(" ")[0]}'s tým`},
        NOW(),
        ${user.id},
        left(md5(gen_random_uuid()::text), 10)
      )
    `;
    const teamRows = await prisma.$queryRaw<any[]>`
      SELECT id FROM "Team" WHERE "ownerId" = ${user.id} LIMIT 1
    `;
    await prisma.$executeRaw`
      INSERT INTO "TeamMember" (id, role, "joinedAt", "teamId", "userId")
      VALUES (gen_random_uuid()::text, 'owner', NOW(), ${teamRows[0].id}, ${user.id})
      ON CONFLICT ("teamId", "userId") DO NOTHING
    `;
    const finalTeamName = teamName?.trim() || `${name.split(" ")[0]}'s tým`;
    sendWelcomeEmail({ to: email, name, teamName: finalTeamName });
    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
