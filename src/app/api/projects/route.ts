import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "on_hold", "done", "archived"];

const projectInclude = {
  client: { select: { id: true, name: true, stage: true } },
  // Task statuses only — enough to compute progress without hauling full tasks.
  tasks: { select: { id: true, status: true } },
};

// GET /api/projects?status=&clientId=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");

  const where: Record<string, any> = { teamId };
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const projects = await prisma.project.findMany({
    where,
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(projects);
}

// POST /api/projects
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  // A client link may only point at a client of the same team.
  let clientId: string | null = null;
  if (body.clientId) {
    const client = await prisma.client.findUnique({ where: { id: body.clientId } });
    if (!client || client.teamId !== teamId) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 400 });
    }
    clientId = client.id;
  }

  const project = await prisma.project.create({
    data: {
      name,
      description: body.description?.trim() || null,
      status: STATUSES.includes(body.status) ? body.status : "active",
      color: body.color || null,
      budget: body.budget ? Number(body.budget) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      clientId,
      teamId,
      createdById: session.user.id as string,
    },
    include: projectInclude,
  });
  return NextResponse.json(project, { status: 201 });
}
