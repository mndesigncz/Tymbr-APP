import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ tasks: [], comments: [], members: [] });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ tasks: [], comments: [], members: [] });

  const [tasks, comments, members] = await Promise.all([
    prisma.task.findMany({
      where: {
        teamId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true, title: true, status: true, priority: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.comment.findMany({
      where: {
        task: { teamId },
        content: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true, content: true,
        task: { select: { id: true, title: true } },
        user: { select: { name: true, avatar: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.teamMember.findMany({
      where: {
        teamId,
        user: { name: { contains: q, mode: "insensitive" } },
      },
      select: { user: { select: { id: true, name: true, email: true, avatar: true } }, role: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ tasks, comments, members });
}
