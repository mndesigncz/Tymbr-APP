import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getActiveShift } from "@/lib/shifts";

export const dynamic = "force-dynamic";

// Kiosk state: the open shift, who's currently clocked in, the checklists, and
// the roster of members who have a kiosk PIN.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | null;
  if (!teamId) return NextResponse.json({ error: "Nejsi v žádném týmu" }, { status: 400 });

  const shift = await getActiveShift(teamId);

  const [attendance, checklists, members] = await Promise.all([
    shift
      ? prisma.shiftAttendance.findMany({
          where: { shiftId: shift.id, clockOutAt: null },
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { clockInAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.shiftChecklist.findMany({ where: { teamId }, orderBy: [{ kind: "asc" }, { order: "asc" }] }),
    prisma.teamMember.findMany({
      where: { teamId },
      select: { kioskPin: true, user: { select: { id: true, name: true, avatar: true } } },
    }),
  ]);

  return NextResponse.json({
    shift: shift ? { id: shift.id, openedAt: shift.openedAt, checklistState: shift.checklistState } : null,
    attendance,
    checklists: checklists.map((c) => ({ id: c.id, name: c.name, kind: c.kind, items: JSON.parse(c.items || "[]") })),
    members: members
      .map((m) => ({ userId: m.user.id, name: m.user.name, avatar: m.user.avatar, hasPin: !!m.kioskPin }))
      .sort((a, b) => a.name.localeCompare(b.name, "cs")),
  });
}
