import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotifications } from "@/lib/notify";

/** Extract unique user IDs from [[user:id]] markers in a message. */
function parseMentionedUserIds(content: string): string[] {
  const matches = content.matchAll(/\[\[user:([^\]]+)\]\]/g);
  return [...new Set([...matches].map((m) => m[1]))];
}
async function hasDMSupport(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT "recipientId" FROM "ChatMessage" LIMIT 0`;
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");
  const recipientId = searchParams.get("recipientId");
  const myId = session.user.id;

  const dmSupport = await hasDMSupport();

  if (dmSupport && recipientId) {
    // DM messages between me and recipient
    const sinceClause = since ? new Date(since) : new Date(0);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT m.*,
        json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar) as user,
        json_build_object('id', r.id, 'name', r.name, 'avatar', r.avatar) as recipient
      FROM "ChatMessage" m
      JOIN "User" u ON u.id = m."userId"
      LEFT JOIN "User" r ON r.id = m."recipientId"
      WHERE m."teamId" = ${teamId}
        AND m."createdAt" > ${sinceClause}
        AND (
          (m."userId" = ${myId} AND m."recipientId" = ${recipientId})
          OR (m."userId" = ${recipientId} AND m."recipientId" = ${myId})
        )
      ORDER BY m."createdAt" ASC
      LIMIT 200
    `;
    return NextResponse.json(rows);
  }

  if (dmSupport) {
    // Team chat: messages with no recipient
    const sinceClause = since ? new Date(since) : new Date(0);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT m.*,
        json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar) as user
      FROM "ChatMessage" m
      JOIN "User" u ON u.id = m."userId"
      WHERE m."teamId" = ${teamId}
        AND m."recipientId" IS NULL
        AND m."createdAt" > ${sinceClause}
      ORDER BY m."createdAt" ASC
      LIMIT 200
    `;
    return NextResponse.json(rows);
  }

  // Fallback: no DM support yet
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

  const { content, recipientId } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Prázdná zpráva" }, { status: 400 });

  const dmSupport = await hasDMSupport();

  if (dmSupport && recipientId) {
    // DMs may only target members of the current team
    const member = await prisma.teamMember.findFirst({
      where: { teamId, userId: recipientId },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Příjemce není členem týmu" }, { status: 400 });

    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO "ChatMessage" (id, content, "teamId", "userId", "recipientId", "createdAt")
      VALUES (gen_random_uuid()::text, ${content.trim()}, ${teamId}, ${session.user.id}, ${recipientId}, NOW())
      RETURNING *
    `;
    const msg = rows[0];
    const userRows = await prisma.$queryRaw<any[]>`SELECT id, name, avatar FROM "User" WHERE id = ${session.user.id}`;
    const recRows = await prisma.$queryRaw<any[]>`SELECT id, name, avatar FROM "User" WHERE id = ${recipientId}`;

    // Notify DM recipient
    const senderName = userRows[0]?.name ?? "Někdo";
    void createNotifications([{
      userId: recipientId,
      type: "mention",
      title: `${senderName} ti napsal(a) přímou zprávu`,
      body: content.trim().slice(0, 100),
      url: "/chat",
    }]);

    return NextResponse.json({ ...msg, user: userRows[0], recipient: recRows[0] }, { status: 201 });
  }

  const message = await prisma.chatMessage.create({
    data: { content: content.trim(), teamId, userId: session.user.id },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  // Notify @mentioned users in team chat (skip self)
  const mentionedIds = parseMentionedUserIds(content.trim()).filter((id) => id !== session.user.id);
  if (mentionedIds.length > 0) {
    const senderName = (message.user as any)?.name ?? "Někdo";
    void createNotifications(mentionedIds.map((uid) => ({
      userId: uid,
      type: "mention" as const,
      title: `${senderName} tě zmínil(a) v chatu`,
      body: content.trim().slice(0, 100),
      url: "/chat",
    })));
  }

  return NextResponse.json(message, { status: 201 });
}
