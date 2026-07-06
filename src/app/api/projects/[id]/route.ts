import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "on_hold", "done", "archived"];

const projectInclude = {
  client: { select: { id: true, name: true, stage: true } },
  tasks: { select: { id: true, status: true } },
};

async function findTeamProject(id: string, teamId: string | undefined) {
  if (!teamId) return null;
  const project = await prisma.project.findUnique({ where: { id } });
  return project && project.teamId === teamId ? project : null;
}

// GET /api/projects/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const teamId = (session.user as any).teamId as string | undefined;
  const project = await findTeamProject(id, teamId);
  if (!project) return NextResponse.json({ error: "Projekt nenalezen" }, { status: 404 });

  const full = await prisma.project.findUnique({ where: { id }, include: projectInclude });
  return NextResponse.json(full);
}

// PATCH /api/projects/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const teamId = (session.user as any).teamId as string | undefined;
  const project = await findTeamProject(id, teamId);
  if (!project) return NextResponse.json({ error: "Projekt nenalezen" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, any> = {};
  if ("name" in body) {
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });
    data.name = name;
  }
  if ("description" in body) data.description = body.description?.trim() || null;
  if ("status" in body) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Neplatný status" }, { status: 400 });
    data.status = body.status;
  }
  if ("color" in body) data.color = body.color || null;
  if ("budget" in body) data.budget = body.budget ? Number(body.budget) : null;
  if ("startDate" in body) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if ("deadline" in body) data.deadline = body.deadline ? new Date(body.deadline) : null;
  if ("clientId" in body) {
    if (body.clientId) {
      const client = await prisma.client.findUnique({ where: { id: body.clientId } });
      if (!client || client.teamId !== teamId) {
        return NextResponse.json({ error: "Klient nenalezen" }, { status: 400 });
      }
      data.clientId = client.id;
    } else {
      data.clientId = null;
    }
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nic ke změně" }, { status: 400 });

  const updated = await prisma.project.update({ where: { id }, data, include: projectInclude });
  return NextResponse.json(updated);
}

// DELETE /api/projects/[id] — creator or manager; tasks are kept (projectId set null)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const teamId = (session.user as any).teamId as string | undefined;
  const teamRole = (session.user as any).teamRole as string | null;
  const project = await findTeamProject(id, teamId);
  if (!project) return NextResponse.json({ error: "Projekt nenalezen" }, { status: 404 });

  if (project.createdById !== session.user.id && !isManager(teamRole as any)) {
    return NextResponse.json({ error: "Nemáš oprávnění smazat tento projekt" }, { status: 403 });
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
