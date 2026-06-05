import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type WebhookEvent =
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "task.deleted"
  | "comment.created";

export async function fireWebhooks(teamId: string, event: WebhookEvent, payload: object) {
  const hooks = await prisma.webhook.findMany({
    where: { teamId, active: true },
  });

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    teamId,
    data: payload,
  });

  for (const hook of hooks) {
    const events = hook.events.split(",").map((e) => e.trim());
    if (!events.includes(event)) continue;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Tymbr-Event": event,
    };

    if (hook.secret) {
      const sig = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");
      headers["X-Tymbr-Signature"] = `sha256=${sig}`;
    }

    fetch(hook.url, { method: "POST", headers, body }).catch(() => {});
  }
}
