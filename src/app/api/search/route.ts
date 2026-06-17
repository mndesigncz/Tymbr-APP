import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const EMPTY = { tasks: [], comments: [], members: [], notes: [], events: [], files: [] };

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  const userId = (session.user as any).id;
  if (!teamId) return NextResponse.json(EMPTY);

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json(EMPTY);

  const contains = { contains: q, mode: "insensitive" as const };

  const [tasks, comments, members, notes, events, files] = await Promise.all([
    prisma.task.findMany({
      where: {
        teamId,
        OR: [{ title: contains }, { description: contains }],
      },
      select: {
        id: true, title: true, status: true, priority: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.comment.findMany({
      where: { task: { teamId }, content: contains },
      select: {
        id: true, content: true,
        task: { select: { id: true, title: true } },
        user: { select: { name: true, avatar: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.teamMember.findMany({
      where: { teamId, user: { name: contains } },
      select: { user: { select: { id: true, name: true, email: true, avatar: true } }, role: true },
      take: 4,
    }),
    // Notes — private notes only to creator/collaborators
    prisma.note.findMany({
      where: {
        teamId,
        AND: [
          { OR: [{ title: contains }, { content: contains }] },
          {
            OR: [
              { visibility: { not: "private" } },
              { createdById: userId },
              { collaborators: { some: { userId } } },
            ],
          },
        ],
      },
      select: { id: true, title: true, content: true, color: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    // Events — personal events only to creator/assignees
    prisma.event.findMany({
      where: {
        teamId,
        AND: [
          { OR: [{ title: contains }, { description: contains }, { location: contains }] },
          {
            OR: [
              { visibility: { not: "personal" } },
              { createdById: userId },
              { assignees: { some: { userId } } },
            ],
          },
        ],
      },
      select: { id: true, title: true, startAt: true, allDay: true, location: true, color: true },
      orderBy: { startAt: "desc" },
      take: 5,
    }),
    // Files — private files only to creator
    prisma.teamFile.findMany({
      where: {
        teamId,
        name: contains,
        OR: [{ visibility: { not: "private" } }, { createdById: userId }],
      },
      select: { id: true, name: true, type: true, url: true, mimeType: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({ tasks, comments, members, notes, events, files });
}
