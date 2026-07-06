import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

export const dynamic = "force-dynamic";

const STAGES = ["lead", "negotiation", "active", "inactive", "lost"];

async function findTeamClient(id: string, teamId: string | undefined) {
  if (!teamId) return null;
  const client = await prisma.client.findUnique({ where: { id } });
  return client && client.teamId === teamId ? client : null;
}

// GET /api/clients/[id] — detail including projects
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const teamId = (session.user as any).teamId as string | undefined;
  const client = await findTeamClient(id, teamId);
  if (!client) return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });

  const full = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { tasks: true } } },
      },
    },
  });
  return NextResponse.json(full);
}

// PATCH /api/clients/[id] — update fields / move pipeline stage
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const teamId = (session.user as any).teamId as string | undefined;
  const client = await findTeamClient(id, teamId);
  if (!client) return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, any> = {};
  for (const key of ["contactName", "email", "phone", "website", "address", "ico", "dic", "note"] as const) {
    if (key in body) data[key] = body[key]?.trim?.() || null;
  }
  if ("name" in body) {
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });
    data.name = name;
  }
  if ("stage" in body) {
    if (!STAGES.includes(body.stage)) return NextResponse.json({ error: "Neplatný stav" }, { status: 400 });
    data.stage = body.stage;
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nic ke změně" }, { status: 400 });

  const updated = await prisma.client.update({
    where: { id },
    data,
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json(updated);
}

// DELETE /api/clients/[id] — creator or manager
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  const teamId = (session.user as any).teamId as string | undefined;
  const teamRole = (session.user as any).teamRole as string | null;
  const client = await findTeamClient(id, teamId);
  if (!client) return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });

  if (client.createdById !== session.user.id && !isManager(teamRole as any)) {
    return NextResponse.json({ error: "Nemáš oprávnění smazat tohoto klienta" }, { status: 403 });
  }

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
