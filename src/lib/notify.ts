import { prisma } from "@/lib/prisma";

interface NotifyParams {
  userId: string;
  type: "task_assigned" | "comment" | "status_change" | "mention" | "invitation";
  title: string;
  body?: string;
  url?: string;
}

export async function createNotification(params: NotifyParams) {
  try {
    await prisma.notification.create({ data: params });
  } catch {
    // never block the main flow on notification failure
  }
}

export async function createNotifications(list: NotifyParams[]) {
  if (!list.length) return;
  try {
    await prisma.notification.createMany({ data: list });
  } catch {}
}
