import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOrOpenActiveShift } from "@/lib/shifts";

export const dynamic = "force-dynamic";

// PATCH { checklistId, itemIndex, done, byName? } — tick/untick a checklist item
// on the active shift. Ticking an item opens a shift if none is running yet.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | null;
  if (!teamId) return NextResponse.json({ error: "Nejsi v žádném týmu" }, { status: 400 });

  const { checklistId, itemIndex, done, byName } = await req.json().catch(() => ({}));
  if (!checklistId || itemIndex == null) return NextResponse.json({ error: "Neplatná data" }, { status: 400 });

  const shift = await getOrOpenActiveShift(teamId);
  let state: Record<string, Record<string, any>> = {};
  try { state = JSON.parse(shift.checklistState || "{}"); } catch { state = {}; }
  if (!state[checklistId]) state[checklistId] = {};

  if (done) state[checklistId][String(itemIndex)] = { at: new Date().toISOString(), byName: byName || null };
  else delete state[checklistId][String(itemIndex)];

  await prisma.shift.update({ where: { id: shift.id }, data: { checklistState: JSON.stringify(state) } });
  return NextResponse.json({ ok: true, checklistState: state });
}
