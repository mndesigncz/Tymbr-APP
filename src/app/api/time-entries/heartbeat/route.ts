import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Called periodically by the client while a timer runs, so we know the last
// moment the user was actually present. Updates the active entry only.
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  await prisma.timeEntry.updateMany({
    where: { userId: session.user.id as string, stoppedAt: null },
    data: { lastHeartbeatAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
