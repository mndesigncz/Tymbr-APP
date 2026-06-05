import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendCommentEmail } from "@/lib/email";
import { createNotifications } from "@/lib/notify";

function extractMentionedNames(text: string): string[] {
  const matches = text.match(/@([\w][\w\s]*?)(?=\s|$|[^\w\s])/g) ?? [];
  return matches.map((m) => m.slice(1).trim());
}

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

  // Fire-and-forget notifications + emails
  void (async () => {
    try {
      const task = await prisma.task.findUnique({
        where: { id },
        select: { title: true, assigneeId: true, assignee: { select: { id: true, name: true, email: true } } },
      });
      if (!task) return;

      const extraAssignees = await prisma.$queryRaw<{ userId: string; name: string; email: string }[]>`
        SELECT u.id as "userId", u.name, u.email
        FROM "TaskAssignee" ta JOIN "User" u ON u.id = ta."userId"
        WHERE ta."taskId" = ${id}
      `;

      const assigneeMap = new Map<string, { name: string; email: string }>();
      for (const a of extraAssignees) assigneeMap.set(a.userId, { name: a.name, email: a.email });
      if (task.assignee && !assigneeMap.has(task.assignee.id)) {
        assigneeMap.set(task.assignee.id, { name: task.assignee.name ?? "", email: task.assignee.email });
      }

      const preview = content.slice(0, 200) + (content.length > 200 ? "…" : "");
      const commenterName = session.user.name ?? "Někdo";

      // Notify assignees (email + in-app)
      const assigneeNotifs = [];
      for (const [uid, user] of assigneeMap) {
        if (uid === session.user.id) continue;
        sendCommentEmail({ to: user.email, recipientName: user.name, taskTitle: task.title, taskId: id, commenterName, commentPreview: preview });
        assigneeNotifs.push({ userId: uid, type: "comment" as const, title: `Nový komentář: ${task.title}`, body: `${commenterName}: ${preview}`, url: `/tasks/${id}` });
      }
      await createNotifications(assigneeNotifs);

      // Notify @mentioned users (in-app + email if not already notified above)
      const mentionedNames = extractMentionedNames(content);
      if (mentionedNames.length > 0) {
        const teamId = await prisma.task.findUnique({ where: { id }, select: { teamId: true } }).then((t) => t?.teamId);
        if (teamId) {
          const mentionedUsers = await prisma.user.findMany({
            where: { name: { in: mentionedNames }, teamMemberships: { some: { teamId } } },
            select: { id: true, name: true, email: true },
          });
          const mentionNotifs = [];
          for (const u of mentionedUsers) {
            if (u.id === session.user.id) continue;
            if (!assigneeMap.has(u.id)) {
              sendCommentEmail({ to: u.email, recipientName: u.name, taskTitle: task.title, taskId: id, commenterName, commentPreview: preview });
            }
            mentionNotifs.push({ userId: u.id, type: "mention" as const, title: `${commenterName} vás zmínil/a`, body: `V úkolu „${task.title}": ${preview}`, url: `/tasks/${id}` });
          }
          await createNotifications(mentionNotifs);
        }
      }
    } catch (err) {
      console.error("[comments] notification error:", err);
    }
  })();

  return NextResponse.json(comment, { status: 201 });
}
