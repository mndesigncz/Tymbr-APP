import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManager } from "@/lib/roles";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  const teamRole = (session.user as any).teamRole;
  if (!isManager(teamRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const hook = await prisma.webhook.findUnique({ where: { id } });
  if (!hook || hook.teamId !== teamId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { active } = await req.json();
  const updated = await prisma.webhook.update({ where: { id }, data: { active } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  const teamRole = (session.user as any).teamRole;
  if (!isManager(teamRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const hook = await prisma.webhook.findUnique({ where: { id } });
  if (!hook || hook.teamId !== teamId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.webhook.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
