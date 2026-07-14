import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH { name?, color? } — rename / recolour a folder.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const folder = await prisma.noteFolder.findFirst({
    where: { id, createdById: session.user.id as string },
    select: { id: true },
  });
  if (!folder) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, any> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 60);
  if ("color" in body) data.color = body.color || null;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nic ke změně" }, { status: 400 });

  const updated = await prisma.noteFolder.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id, name: updated.name, color: updated.color, order: updated.order });
}

// DELETE — remove the folder; its notes fall back to "unfiled" (folderId null).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const folder = await prisma.noteFolder.findFirst({
    where: { id, createdById: session.user.id as string },
    select: { id: true },
  });
  if (!folder) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });

  await prisma.noteFolder.delete({ where: { id } }); // Note.folderId set null via FK
  return NextResponse.json({ ok: true });
}
