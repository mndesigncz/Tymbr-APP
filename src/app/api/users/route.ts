import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  const where = teamId
    ? { teamMemberships: { some: { teamId } } }
    : { id: session.user.id };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, avatar: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}
