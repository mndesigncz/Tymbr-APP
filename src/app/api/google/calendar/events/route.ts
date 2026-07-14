import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { listEvents } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

// Returns the user's Google Calendar events within [from, to] (read-only).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const timeMin = from ? new Date(from) : new Date();
  const timeMax = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  try {
    const userId = session.user.id as string;
    const events = await listEvents(userId, timeMin, timeMax);

    // Hide Google events that are mirrors of this user's own Tymbr events, so
    // they don't appear twice (once native, once from Google).
    const mirrored = await prisma.event.findMany({
      where: {
        createdById: userId,
        googleEventId: { not: null },
        startAt: { lte: timeMax },
        endAt: { gte: timeMin },
      },
      select: { googleEventId: true },
    });
    const mine = mirrored.map((m) => m.googleEventId!).filter(Boolean);
    const filtered = events.filter(
      (e) => !mine.some((g) => e.id === g || e.id.startsWith(g + "_")) // base + recurring instances
    );
    return NextResponse.json(filtered);
  } catch (e: any) {
    console.error("[GET /api/google/calendar/events]", e?.message ?? e);
    return NextResponse.json([]);
  }
}
