import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET  — the current user's note folders (bookmarks), with a note count each.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const folders = await prisma.noteFolder.findMany({
    where: { createdById: session.user.id as string },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { notes: true } } },
  });

  return NextResponse.json(
    folders.map((f) => ({ id: f.id, name: f.name, color: f.color, order: f.order, count: f._count.notes }))
  );
}

// POST { name, color? } — create a folder.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const max = await prisma.noteFolder.aggregate({
    where: { createdById: session.user.id as string },
    _max: { order: true },
  });

  const folder = await prisma.noteFolder.create({
    data: {
      name: name.slice(0, 60),
      color: body.color || null,
      order: (max._max.order ?? 0) + 1,
      createdById: session.user.id as string,
    },
  });

  return NextResponse.json({ id: folder.id, name: folder.name, color: folder.color, order: folder.order, count: 0 }, { status: 201 });
}
