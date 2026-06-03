import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");

  const where: Record<string, any> = { teamId };
  if (since) where.createdAt = { gt: new Date(since) };

  const messages = await prisma.chatMessage.findMany({
    where,
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Nejsi v žádném týmu" }, { status: 400 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Prázdná zpráva" }, { status: 400 });

  const message = await prisma.chatMessage.create({
    data: { content: content.trim(), teamId, userId: session.user.id },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json(message, { status: 201 });
}
