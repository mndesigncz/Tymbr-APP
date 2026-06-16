import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id: noteId } = await params;
  const userId = session.user.id;

  const owns = await prisma.$queryRaw<any[]>`SELECT id FROM "Note" WHERE id = ${noteId} AND "createdById" = ${userId} LIMIT 1`;
  if (!owns.length) return NextResponse.json({ error: "Nemáš oprávnění" }, { status: 403 });

  const { userId: targetId } = await req.json();
  if (!targetId) return NextResponse.json({ error: "userId je povinný" }, { status: 400 });

  await prisma.$executeRaw`
    INSERT INTO "NoteCollaborator" (id, "noteId", "userId", "createdAt")
    VALUES (gen_random_uuid()::text, ${noteId}, ${targetId}, NOW())
    ON CONFLICT DO NOTHING
  `;

  const rows = await prisma.$queryRaw<any[]>`
    SELECT u.id, u.name, u.email, u.avatar
    FROM "NoteCollaborator" nc
    JOIN "User" u ON u.id = nc."userId"
    WHERE nc."noteId" = ${noteId}
    ORDER BY nc."createdAt"
  `;
  return NextResponse.json(rows);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id: noteId } = await params;
  const userId = session.user.id;

  const owns = await prisma.$queryRaw<any[]>`SELECT id FROM "Note" WHERE id = ${noteId} AND "createdById" = ${userId} LIMIT 1`;
  if (!owns.length) return NextResponse.json({ error: "Nemáš oprávnění" }, { status: 403 });

  const { userId: targetId } = await req.json();
  await prisma.$executeRaw`DELETE FROM "NoteCollaborator" WHERE "noteId" = ${noteId} AND "userId" = ${targetId}`;

  return NextResponse.json({ ok: true });
}
