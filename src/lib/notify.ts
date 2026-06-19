import { prisma } from "@/lib/prisma";
import webpush from "web-push";
import { DEFAULT_NOTIF_PREFS, type NotifType } from "@/lib/notifTypes";

export type { NotifType };

export interface NotifyParams {
  userId: string;
  type: NotifType;
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
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.$executeRaw`DELETE FROM "PushSubscription" WHERE endpoint = ${sub.endpoint}`;
        }
      }
    }
  } catch {}
}

function normType(type: string): string {
  if (type === "comment") return "task_comment";
  if (type === "status_change") return "task_status";
  return type;
}

async function getUserPrefs(userId: string): Promise<Record<string, { inApp: boolean; push: boolean }>> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
    if (!user?.notificationPrefs) return {};
    const parsed = JSON.parse(user.notificationPrefs);
    const result: Record<string, { inApp: boolean; push: boolean }> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v === "object" && "inApp" in (v as object) && "push" in (v as object)) {
        result[k] = { inApp: !!(v as any).inApp, push: !!(v as any).push };
      }
    }
    return result;
  } catch {
    return {};
  }
}

function getPref(userPrefs: Record<string, { inApp: boolean; push: boolean }>, type: string): { inApp: boolean; push: boolean } {
  const key = normType(type);
  if (key in userPrefs) return userPrefs[key];
  return DEFAULT_NOTIF_PREFS[key] ?? { inApp: true, push: true };
}

export async function createNotification(params: NotifyParams) {
  try {
    const userPrefs = await getUserPrefs(params.userId);
    const pref = getPref(userPrefs, params.type);
    if (pref.inApp) {
      await prisma.notification.create({ data: params });
    }
    if (pref.push) {
      void sendPushToUser(params.userId, { title: params.title, body: params.body, url: params.url });
    }
  } catch {}
}

export async function createNotifications(list: NotifyParams[]) {
  if (!list.length) return;
  try {
    const userIds = [...new Set(list.map((n) => n.userId))];
    const prefsMap = new Map<string, Record<string, { inApp: boolean; push: boolean }>>();
    await Promise.all(userIds.map(async (uid) => {
      prefsMap.set(uid, await getUserPrefs(uid));
    }));

    const inAppList: NotifyParams[] = [];
    for (const n of list) {
      const pref = getPref(prefsMap.get(n.userId) ?? {}, n.type);
      if (pref.inApp) inAppList.push(n);
      if (pref.push) void sendPushToUser(n.userId, { title: n.title, body: n.body, url: n.url });
    }

    if (inAppList.length > 0) {
      await prisma.notification.createMany({ data: inAppList });
    }
  } catch {}
}
