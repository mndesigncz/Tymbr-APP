import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [blockedBy, blocking] = await Promise.all([
    prisma.taskDependency.findMany({
      where: { blockedId: id },
      include: { blocker: { select: { id: true, title: true, status: true, priority: true } } },
    }),
    prisma.taskDependency.findMany({
      where: { blockerId: id },
      include: { blocked: { select: { id: true, title: true, status: true, priority: true } } },
    }),
  ]);

  return NextResponse.json({ blockedBy, blocking });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { blockerId } = await req.json();
  if (!blockerId) return NextResponse.json({ error: "blockerId required" }, { status: 400 });
  if (blockerId === id) return NextResponse.json({ error: "Úkol nemůže blokovat sám sebe" }, { status: 400 });

  const dep = await prisma.taskDependency.create({
    data: { blockerId, blockedId: id },
    include: { blocker: { select: { id: true, title: true, status: true, priority: true } } },
  });
  return NextResponse.json(dep, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { depId } = await req.json();

  await prisma.taskDependency.deleteMany({
    where: { id: depId, OR: [{ blockedId: id }, { blockerId: id }] },
  });
  return NextResponse.json({ ok: true });
}
