import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Removes the stored Google Calendar connection for the current user.
export async function POST() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  await prisma.googleCalendarAccount.deleteMany({ where: { userId: session.user.id as string } });
  return NextResponse.json({ ok: true });
}
