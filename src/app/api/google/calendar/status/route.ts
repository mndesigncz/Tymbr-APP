import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { googleConfigured } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

// Whether Google Calendar is configured on the server and connected for this user.
export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const acct = await prisma.googleCalendarAccount.findUnique({
    where: { userId: session.user.id as string },
    select: { email: true, syncEnabled: true, connectedAt: true },
  });

  return NextResponse.json({
    configured: googleConfigured(),
    connected: !!acct,
    email: acct?.email ?? null,
    syncEnabled: acct?.syncEnabled ?? false,
  });
}
