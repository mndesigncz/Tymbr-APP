import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STAGES = ["lead", "negotiation", "active", "inactive", "lost"];

// GET /api/clients?stage=&search=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const search = searchParams.get("search");

  const where: Record<string, any> = { teamId };
  if (stage) where.stage = stage;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    include: { _count: { select: { projects: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(clients);
}

// POST /api/clients — create a client (any team member)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const client = await prisma.client.create({
    data: {
      name,
      contactName: body.contactName?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      website: body.website?.trim() || null,
      address: body.address?.trim() || null,
      ico: body.ico?.trim() || null,
      dic: body.dic?.trim() || null,
      note: body.note?.trim() || null,
      stage: STAGES.includes(body.stage) ? body.stage : "lead",
      teamId,
      createdById: session.user.id as string,
    },
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json(client, { status: 201 });
}
