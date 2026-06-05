import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManager } from "@/lib/roles";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json([]);

  const hooks = await prisma.webhook.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(hooks);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  const teamRole = (session.user as any).teamRole;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });
  if (!isManager(teamRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { url, secret, events } = await req.json();
  if (!url?.trim()) return NextResponse.json({ error: "URL je povinná" }, { status: 400 });

  try { new URL(url); } catch { return NextResponse.json({ error: "Neplatná URL" }, { status: 400 }); }

  const eventsStr = Array.isArray(events) ? events.join(",") : (events || "task.created,task.updated,task.completed");

  const hook = await prisma.webhook.create({
    data: { url: url.trim(), secret: secret?.trim() || null, events: eventsStr, teamId },
  });
  return NextResponse.json(hook, { status: 201 });
}
