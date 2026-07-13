import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

// Who may change/delete an entry: its owner, or a manager of the entry's team.
async function canEdit(entryId: string, session: any) {
  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
    include: { task: { select: { teamId: true } } },
  });
  if (!entry) return null;
  if (entry.userId === session.user.id) return entry;
  const teamId = (session.user as any).teamId;
  const teamRole = (session.user as any).teamRole;
  if (isManager(teamRole) && teamId && entry.task?.teamId === teamId) return entry;
  return null;
}

// PATCH supports three shapes:
//   {}                                          → stop the running timer now (default)
//   { stopAt }                                  → stop the running timer at a given time
//   { startedAt?, stoppedAt?, durationMinutes? } → edit an existing entry
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const entry = await canEdit(id, session);
  if (!entry) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });

  const body = await req.json().catch(() => ({} as any));
  const started = body.startedAt ? new Date(body.startedAt) : new Date(entry.startedAt);
  let stopped: Date;

  if (body.stopAt) {
    stopped = new Date(body.stopAt);
  } else if (body.durationMinutes != null) {
    const dur = Math.max(1, Math.round(Number(body.durationMinutes)));
    stopped = new Date(started.getTime() + dur * 60000);
  } else if (body.stoppedAt) {
    stopped = new Date(body.stoppedAt);
  } else {
    // Default: stop now.
    stopped = new Date();
  }

  if (isNaN(started.getTime()) || isNaN(stopped.getTime())) {
    return NextResponse.json({ error: "Neplatné datum" }, { status: 400 });
  }
  if (stopped.getTime() <= started.getTime()) {
    return NextResponse.json({ error: "Konec musí být po začátku" }, { status: 400 });
  }
  const duration = Math.round((stopped.getTime() - started.getTime()) / 60000);
  // Guard against absurd durations from a runaway/forgotten timer.
  if (duration > 24 * 60) {
    return NextResponse.json({ error: "Záznam nemůže být delší než 24 hodin" }, { status: 400 });
  }

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: { startedAt: started, stoppedAt: stopped, durationMinutes: Math.max(1, duration) },
    include: { task: { include: { category: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const entry = await canEdit(id, session);
  if (!entry) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });

  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
