import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET — team members with whether they have a kiosk PIN (value never returned).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | null;
  if (!teamId || !isManager((session.user as any).teamRole)) return NextResponse.json({ error: "Jen správce" }, { status: 403 });

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { kioskPin: true, user: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json(
    members.map((m) => ({ userId: m.user.id, name: m.user.name, avatar: m.user.avatar, hasPin: !!m.kioskPin }))
      .sort((a, b) => a.name.localeCompare(b.name, "cs"))
  );
}

// PATCH { userId, pin } — set/clear a member's 4-digit kiosk PIN (manager only).
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | null;
  if (!teamId || !isManager((session.user as any).teamRole)) return NextResponse.json({ error: "Jen správce" }, { status: 403 });

  const { userId, pin } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: "Chybí uživatel" }, { status: 400 });
  const clean = pin == null || pin === "" ? null : String(pin).replace(/\D/g, "").slice(0, 6);
  if (clean !== null && clean.length < 4) return NextResponse.json({ error: "PIN musí mít aspoň 4 číslice" }, { status: 400 });

  await prisma.teamMember.updateMany({ where: { teamId, userId }, data: { kioskPin: clean } });
  return NextResponse.json({ ok: true, hasPin: !!clean });
}
