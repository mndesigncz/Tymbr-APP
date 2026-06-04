import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const DEFAULT_PREFS = {
  taskAssigned: true,
  comments: true,
  dueDates: true,
  statusChanges: false,
};

// Read the current user's profile + notification preferences.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const userId = session.user.id;
  if (!userId) return NextResponse.json({ error: "Relace vypršela" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatar: true, role: true, notificationPrefs: true },
  });
  if (!user) return NextResponse.json({ error: "Uživatel nenalezen" }, { status: 404 });

  let prefs = DEFAULT_PREFS;
  if (user.notificationPrefs) {
    try { prefs = { ...DEFAULT_PREFS, ...JSON.parse(user.notificationPrefs) }; } catch {}
  }

  return NextResponse.json({ ...user, notificationPrefs: prefs });
}

// Update the current user's profile (display name + avatar + notification prefs).
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const userId = session.user.id;
  if (!userId) return NextResponse.json({ error: "Relace vypršela" }, { status: 401 });

  try {
    const { name, avatar, notificationPrefs } = await req.json();

    const trimmedName = typeof name === "string" ? name.trim() : undefined;
    if (trimmedName !== undefined && !trimmedName) {
      return NextResponse.json({ error: "Jméno nesmí být prázdné" }, { status: 400 });
    }

    // avatar: data URL string to set, empty string/null to remove, undefined to keep
    if (avatar !== undefined && typeof avatar === "string" && avatar.length > 1_500_000) {
      return NextResponse.json({ error: "Obrázek je příliš velký" }, { status: 400 });
    }

    const data: Record<string, any> = {};
    if (trimmedName !== undefined) data.name = trimmedName;
    if (avatar !== undefined) data.avatar = avatar || null;
    if (notificationPrefs !== undefined && typeof notificationPrefs === "object") {
      const clean = {
        taskAssigned: !!notificationPrefs.taskAssigned,
        comments: !!notificationPrefs.comments,
        dueDates: !!notificationPrefs.dueDates,
        statusChanges: !!notificationPrefs.statusChanges,
      };
      data.notificationPrefs = JSON.stringify(clean);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nic ke změně" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, avatar: true, role: true, notificationPrefs: true },
    });

    let prefs = DEFAULT_PREFS;
    if (user.notificationPrefs) {
      try { prefs = { ...DEFAULT_PREFS, ...JSON.parse(user.notificationPrefs) }; } catch {}
    }

    return NextResponse.json({ ...user, notificationPrefs: prefs });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
