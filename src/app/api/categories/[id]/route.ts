import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** Categories belong to the currently selected team — verify before mutating. */
async function categoryInCurrentTeam(id: string, session: { user: { teamId?: string | null } }): Promise<boolean> {
  const teamId = session.user.teamId ?? null;
  if (!teamId) return false;
  const cat = await prisma.category.findUnique({ where: { id }, select: { teamId: true } });
  return !!cat && cat.teamId === teamId;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  if (!(await categoryInCurrentTeam(id, session))) {
    return NextResponse.json({ error: "Kategorie nenalezena" }, { status: 404 });
  }
  const { name, color, icon } = await req.json();
  const cat = await prisma.category.update({ where: { id }, data: { name, color, icon } });
  return NextResponse.json(cat);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  if (!(await categoryInCurrentTeam(id, session))) {
    return NextResponse.json({ error: "Kategorie nenalezena" }, { status: 404 });
  }
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
