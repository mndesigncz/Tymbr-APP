import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DEFAULT_NOTIF_PREFS } from "@/lib/notifTypes";

function mergeWithDefaults(saved: Record<string, any>): Record<string, { inApp: boolean; push: boolean }> {
  const result: Record<string, { inApp: boolean; push: boolean }> = {};
  for (const [key, def] of Object.entries(DEFAULT_NOTIF_PREFS)) {
    const s = saved[key];
    if (s && typeof s === "object" && "inApp" in s && "push" in s) {
      result[key] = { inApp: !!s.inApp, push: !!s.push };
    } else {
      result[key] = def;
    }
  }
  return result;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });

  let saved: Record<string, any> = {};
  if (user?.notificationPrefs) {
    try { saved = JSON.parse(user.notificationPrefs); } catch {}
  }

  return NextResponse.json(mergeWithDefaults(saved));
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Neplatná data" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });

  let existing: Record<string, any> = {};
  if (user?.notificationPrefs) {
    try { existing = JSON.parse(user.notificationPrefs); } catch {}
  }

  for (const key of Object.keys(DEFAULT_NOTIF_PREFS)) {
    if (key in body && body[key] && typeof body[key] === "object") {
      existing[key] = {
        inApp: typeof body[key].inApp === "boolean" ? body[key].inApp : (existing[key]?.inApp ?? DEFAULT_NOTIF_PREFS[key].inApp),
        push:  typeof body[key].push  === "boolean" ? body[key].push  : (existing[key]?.push  ?? DEFAULT_NOTIF_PREFS[key].push),
      };
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPrefs: JSON.stringify(existing) },
  });

  return NextResponse.json(mergeWithDefaults(existing));
}
