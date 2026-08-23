import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

export const dynamic = "force-dynamic";

async function guard(id: string, session: any) {
  const teamId = session?.user ? (session.user as any).teamId : null;
  if (!session || !teamId || !isManager((session.user as any).teamRole)) return null;
  const cl = await prisma.shiftChecklist.findFirst({ where: { id, teamId }, select: { id: true } });
  return cl ? teamId : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  if (!(await guard(id, session))) return NextResponse.json({ error: "Přístup odepřen" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, any> = {};
  if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim().slice(0, 80);
  if (b.kind === "open" || b.kind === "close") data.kind = b.kind;
  if (Array.isArray(b.items)) data.items = JSON.stringify(b.items.map((s: any) => String(s).slice(0, 200)).filter(Boolean));
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nic ke změně" }, { status: 400 });

  const updated = await prisma.shiftChecklist.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id, name: updated.name, kind: updated.kind, items: JSON.parse(updated.items || "[]") });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  if (!(await guard(id, session))) return NextResponse.json({ error: "Přístup odepřen" }, { status: 403 });
  await prisma.shiftChecklist.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
