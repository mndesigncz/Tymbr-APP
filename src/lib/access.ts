import { prisma } from "./prisma";
import type { Session } from "next-auth";

/** Loads a task's access-relevant fields and verifies the session user may
 *  touch it. A task is accessible when the user is a member of its team
 *  (any of their teams, not just the currently selected one) and, for
 *  private tasks, when they are the creator.
 *  Returns the task row, or null when it doesn't exist or isn't accessible
 *  — callers should respond with 404 so task ids can't be probed. */
export async function getAccessibleTask(taskId: string, session: Session) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, teamId: true, visibility: true, createdById: true, title: true },
  });
  if (!task) return null;

  const userId = session.user.id;
  if (task.visibility === "private" && task.createdById !== userId) return null;

  if (task.teamId) {
    const currentTeamId = session.user.teamId ?? null;
    if (task.teamId !== currentTeamId) {
      const member = await prisma.teamMember.findFirst({
        where: { userId, teamId: task.teamId },
        select: { id: true },
      });
      if (!member) return null;
    }
  } else if (task.createdById !== userId) {
    return null;
  }

  return task;
}
