import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  const { id } = await params;

  const template = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!template || template.teamId !== teamId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.taskTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
