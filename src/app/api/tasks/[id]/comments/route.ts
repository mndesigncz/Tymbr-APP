import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendCommentEmail } from "@/lib/email";

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

  // Notify task assignees (fire-and-forget, never block the response)
  void (async () => {
    try {
      const task = await prisma.task.findUnique({
        where: { id },
        select: { title: true, assigneeId: true, assignee: { select: { id: true, name: true, email: true } } },
      });
      if (!task) return;

      const extraAssignees = await prisma.$queryRaw<{ userId: string; name: string; email: string }[]>`
        SELECT u.id as "userId", u.name, u.email
        FROM "TaskAssignee" ta
        JOIN "User" u ON u.id = ta."userId"
        WHERE ta."taskId" = ${id}
      `;

      const assigneeMap = new Map<string, { name: string; email: string }>();
      for (const a of extraAssignees) {
        assigneeMap.set(a.userId, { name: a.name, email: a.email });
      }
      if (task.assignee && !assigneeMap.has(task.assignee.id)) {
        assigneeMap.set(task.assignee.id, { name: task.assignee.name ?? "", email: task.assignee.email });
      }

      const preview = content.slice(0, 200) + (content.length > 200 ? "…" : "");
      for (const [uid, user] of assigneeMap) {
        if (uid !== session.user.id && user.email) {
          await sendCommentEmail({
            to: user.email,
            recipientName: user.name,
            taskTitle: task.title,
            taskId: id,
            commenterName: session.user.name ?? "Někdo",
            commentPreview: preview,
          });
        }
      }
    } catch (err) {
      console.error("[comments] notification error:", err);
    }
  })();

  return NextResponse.json(comment, { status: 201 });
}
