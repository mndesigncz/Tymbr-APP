import { NextRequest, NextResponse } from "next/server";
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
    const events = await listEvents(session.user.id as string, timeMin, timeMax);
    return NextResponse.json(events);
  } catch (e: any) {
    console.error("[GET /api/google/calendar/events]", e?.message ?? e);
    return NextResponse.json([]);
  }
}
