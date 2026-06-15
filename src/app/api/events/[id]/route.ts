import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAccessibleTask } from "@/lib/access";
import { eventInclude, serializeEvent, syncEventAssignees } from "@/lib/events";

export const dynamic = "force-dynamic";

/** Whether the given session may see/edit this event. */
function canAccess(event: { visibility: string; createdById: string; teamId: string | null }, userId: string, teamId: string | null) {
  if (event.visibility === "team") return !!teamId && event.teamId === teamId;
  return event.createdById === userId;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const userId = (session.user as any).id;
    const teamId = (session.user as any).teamId ?? null;

    const { id } = await params;
    const event = await prisma.event.findUnique({ where: { id }, include: eventInclude });
    if (!event) return NextResponse.json({ error: "Událost nenalezena" }, { status: 404 });
    if (!canAccess(event, userId, teamId)) return NextResponse.json({ error: "Přístup odepřen" }, { status: 403 });

    return NextResponse.json(serializeEvent(event));
  } catch (e: any) {
    console.error("[GET /api/events/[id]]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const userId = (session.user as any).id;
    const teamId = (session.user as any).teamId ?? null;

    const { id } = await params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Událost nenalezena" }, { status: 404 });
    if (!canAccess(existing, userId, teamId)) return NextResponse.json({ error: "Přístup odepřen" }, { status: 403 });

    const body = await req.json();
    const { title, description, startAt, endAt, allDay, location, color } = body;
    const visibility = body.visibility !== undefined
      ? (body.visibility === "team" ? "team" : "personal")
      : undefined;

    if (visibility === "team" && !teamId) {
      return NextResponse.json({ error: "Pro týmovou událost je potřeba tým" }, { status: 400 });
    }

    const start = startAt !== undefined ? new Date(startAt) : undefined;
    const end = endAt !== undefined ? new Date(endAt) : undefined;

    // Resolve the optional task link (null clears it; only accessible tasks allowed).
    let taskId: string | null | undefined;
    if ("taskId" in body) {
      if (body.taskId) {
        const accessible = await getAccessibleTask(body.taskId, session);
        if (!accessible) return NextResponse.json({ error: "Propojený úkol nenalezen" }, { status: 400 });
        taskId = accessible.id;
      } else {
        taskId = null;
      }
    }

    await prisma.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(start !== undefined && { startAt: start }),
        ...(end !== undefined && { endAt: end }),
        ...(allDay !== undefined && { allDay: !!allDay }),
        ...(location !== undefined && { location: location || null }),
        ...(color !== undefined && { color: color || null }),
        ...(taskId !== undefined && { taskId }),
        ...(visibility !== undefined && {
          visibility,
          teamId: visibility === "team" ? teamId : null,
        }),
      },
    });

    if (Array.isArray(body.assigneeIds)) {
      await syncEventAssignees(id, body.assigneeIds.filter(Boolean));
    }

    const event = await prisma.event.findUnique({ where: { id }, include: eventInclude });
    return NextResponse.json(event ? serializeEvent(event) : { id });
  } catch (e: any) {
    console.error("[PUT /api/events/[id]]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const userId = (session.user as any).id;
    const teamId = (session.user as any).teamId ?? null;

    const { id } = await params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Událost nenalezena" }, { status: 404 });
    if (!canAccess(existing, userId, teamId)) return NextResponse.json({ error: "Přístup odepřen" }, { status: 403 });

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[DELETE /api/events/[id]]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
