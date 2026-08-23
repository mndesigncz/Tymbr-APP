import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getActiveShift, getOrOpenActiveShift } from "@/lib/shifts";

export const dynamic = "force-dynamic";

// POST { userId, pin, action: "in" | "out" } — clock a member in/out via kiosk PIN.
// Clocking in auto-opens a shift if none is running.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | null;
  if (!teamId) return NextResponse.json({ error: "Nejsi v žádném týmu" }, { status: 400 });

  const { userId, pin, action } = await req.json().catch(() => ({}));
  if (!userId || !pin) return NextResponse.json({ error: "Chybí PIN" }, { status: 400 });

  const member = await prisma.teamMember.findFirst({
    where: { teamId, userId },
    select: { kioskPin: true, user: { select: { name: true } } },
  });
  if (!member || !member.kioskPin) return NextResponse.json({ error: "Zaměstnanec nemá PIN" }, { status: 400 });
  if (String(pin) !== member.kioskPin) return NextResponse.json({ error: "Špatný PIN" }, { status: 403 });

  if (action === "out") {
    const shift = await getActiveShift(teamId);
    if (shift) {
      await prisma.shiftAttendance.updateMany({
        where: { shiftId: shift.id, userId, clockOutAt: null },
        data: { clockOutAt: new Date() },
      });
    }
    return NextResponse.json({ ok: true, action: "out" });
  }

  // clock in (default)
  const shift = await getOrOpenActiveShift(teamId);
  const already = await prisma.shiftAttendance.findFirst({ where: { shiftId: shift.id, userId, clockOutAt: null } });
  if (!already) {
    await prisma.shiftAttendance.create({ data: { shiftId: shift.id, userId, name: member.user.name } });
  }
  return NextResponse.json({ ok: true, action: "in", shiftId: shift.id });
}
