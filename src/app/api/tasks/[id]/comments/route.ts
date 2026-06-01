import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Obsah je povinný" }, { status: 400 });

  const comment = await prisma.comment.create({
    data: { content, taskId: id, userId: session.user.id },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json(comment, { status: 201 });
}
