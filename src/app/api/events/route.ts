import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAccessibleTask } from "@/lib/access";
import { eventInclude, serializeEvent, syncEventAssignees, expandRecurring } from "@/lib/events";
import { hasGoogleCalendar, insertGoogleEvent } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

/** Build the visibility filter for a given scope.
 *  - personal: only the current user's personal events
 *  - team: only the current team's shared events
 *  - all (default): the user's personal events + their team's shared events */
function visibilityClause(scope: string, userId: string, teamId: string | null) {
  if (scope === "personal") return { visibility: "personal", createdById: userId };
  if (scope === "team") return teamId ? { visibility: "team", teamId } : { id: "__none__" };
  return {
    OR: [
      { visibility: "personal", createdById: userId },
      ...(teamId ? [{ visibility: "team", teamId }] : []),
    ],
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const userId = (session.user as any).id;
    const teamId = (session.user as any).teamId ?? null;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const scope = searchParams.get("scope") || "all";

    // An event overlaps the [from, to] window when startAt <= to AND endAt >= from
    const range: Record<string, any>[] = [];
    if (to) range.push({ startAt: { lte: new Date(to) } });
    if (from) range.push({ endAt: { gte: new Date(from) } });

    const where = { AND: [...range, visibilityClause(scope, userId, teamId)] };

    const events = await prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: { startAt: "asc" },
    });

    const windowFrom = from ? new Date(from) : new Date(0);
    const windowTo = to ? new Date(to) : new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);

    const expanded = events.flatMap((ev) =>
      expandRecurring(ev, windowFrom, windowTo).map(serializeEvent)
    );
    expanded.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    return NextResponse.json(expanded);
  } catch (e: any) {
    console.error("[GET /api/events]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const userId = (session.user as any).id;
    const teamId = (session.user as any).teamId ?? null;

    const body = await req.json();
    const { title, description, startAt, endAt, allDay, location, color } = body;
    const visibility = body.visibility === "team" ? "team" : "personal";
    const assigneeIds: string[] = Array.isArray(body.assigneeIds) ? body.assigneeIds.filter(Boolean) : [];
    const recurring = ["daily", "weekly", "monthly", "yearly"].includes(body.recurring) ? body.recurring : "none";
    const recurringUntil = body.recurringUntil ? new Date(body.recurringUntil) : null;

    if (!title?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });
    if (!startAt) return NextResponse.json({ error: "Začátek je povinný" }, { status: 400 });
    if (visibility === "team" && !teamId) {
      return NextResponse.json({ error: "Pro týmovou událost je potřeba tým" }, { status: 400 });
    }

    const start = new Date(startAt);
    if (isNaN(start.getTime())) return NextResponse.json({ error: "Neplatné datum začátku" }, { status: 400 });
    const end = endAt ? new Date(endAt) : new Date(start.getTime() + 60 * 60 * 1000);
    if (isNaN(end.getTime())) return NextResponse.json({ error: "Neplatné datum konce" }, { status: 400 });

    // Only link a task the caller is actually allowed to see.
    let taskId: string | null = null;
    if (body.taskId) {
      const accessible = await getAccessibleTask(body.taskId, session);
      if (!accessible) return NextResponse.json({ error: "Propojený úkol nenalezen" }, { status: 400 });
      taskId = accessible.id;
    }

    const created = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description || null,
        startAt: start,
        endAt: end < start ? start : end,
        allDay: !!allDay,
        location: location || null,
        color: color || null,
        visibility,
        teamId: visibility === "team" ? teamId : null,
        createdById: userId,
        taskId,
        recurring,
        recurringUntil,
      },
    });

    if (assigneeIds.length > 0) await syncEventAssignees(created.id, assigneeIds);

    // Mirror to the creator's Google Calendar, if connected (best-effort).
    try {
      if (await hasGoogleCalendar(userId)) {
        const gid = await insertGoogleEvent(userId, {
          title: created.title, description: created.description, location: created.location,
          startAt: created.startAt, endAt: created.endAt, allDay: created.allDay,
          recurring: created.recurring, recurringUntil: created.recurringUntil,
        });
        if (gid) await prisma.event.update({ where: { id: created.id }, data: { googleEventId: gid } });
      }
    } catch (e: any) { console.error("[events POST → google]", e?.message ?? e); }

    const event = await prisma.event.findUnique({ where: { id: created.id }, include: eventInclude });
    return NextResponse.json(event ? serializeEvent(event) : created, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/events]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
