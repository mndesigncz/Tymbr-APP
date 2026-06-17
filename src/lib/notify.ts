import { prisma } from "@/lib/prisma";
import webpush from "web-push";

interface NotifyParams {
  userId: string;
  type: "task_assigned" | "comment" | "status_change" | "mention" | "invitation";
  title: string;
  body?: string;
  url?: string;
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  try {
    webpush.setVapidDetails(
      "mailto:vyrobimweb@gmail.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidReady = true;
  } catch {}
}

async function sendPushToUser(userId: string, payload: { title: string; body?: string; url?: string }) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  ensureVapid();

  try {
    const subs = await prisma.$queryRaw<{ endpoint: string; p256dh: string; auth: string }[]>`
      SELECT endpoint, p256dh, auth FROM "PushSubscription" WHERE "userId" = ${userId}
    `;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // Subscription expired or invalid — clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.$executeRaw`DELETE FROM "PushSubscription" WHERE endpoint = ${sub.endpoint}`;
        }
      }
    }
  } catch {}
}

export async function createNotification(params: NotifyParams) {
  try {
    await prisma.notification.create({ data: params });
    void sendPushToUser(params.userId, { title: params.title, body: params.body, url: params.url });
  } catch {}
}

export async function createNotifications(list: NotifyParams[]) {
  if (!list.length) return;
  try {
    await prisma.notification.createMany({ data: list });
    for (const n of list) {
      void sendPushToUser(n.userId, { title: n.title, body: n.body, url: n.url });
    }
  } catch {}
}
