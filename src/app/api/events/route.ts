import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAccessibleTask } from "@/lib/access";
import { eventInclude, serializeEvent, syncEventAssignees } from "@/lib/events";

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
    return NextResponse.json(events.map(serializeEvent));
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
      },
    });

    if (assigneeIds.length > 0) await syncEventAssignees(created.id, assigneeIds);

    const event = await prisma.event.findUnique({ where: { id: created.id }, include: eventInclude });
    return NextResponse.json(event ? serializeEvent(event) : created, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/events]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
