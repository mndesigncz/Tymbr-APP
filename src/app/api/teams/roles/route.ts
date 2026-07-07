import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager, MEMBER_NAV_TABS } from "@/lib/roles";

export const dynamic = "force-dynamic";

const VALID_KEYS = new Set(MEMBER_NAV_TABS.map((t) => t.key as string));

function sanitizePerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((k) => typeof k === "string" && VALID_KEYS.has(k)))];
}

function guard(session: any): { teamId: string } | NextResponse {
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = session.user.teamId as string | undefined;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });
  if (!isManager(session.user.teamRole)) {
    return NextResponse.json({ error: "Vlastní role spravuje jen owner/admin" }, { status: 403 });
  }
  return { teamId };
}

// GET /api/teams/roles — list team's custom roles (with member counts)
export async function GET() {
  const session = await getSession();
  const g = guard(session);
  if (g instanceof NextResponse) return g;

  const roles = await prisma.customRole.findMany({
    where: { teamId: g.teamId },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(
    roles.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      finance: r.finance,
      permissions: JSON.parse(r.permissions || "[]"),
      memberCount: r._count.members,
    }))
  );
}

// POST /api/teams/roles — create a custom role
export async function POST(req: NextRequest) {
  const session = await getSession();
  const g = guard(session);
  if (g instanceof NextResponse) return g;

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Název role je povinný" }, { status: 400 });

  const role = await prisma.customRole.create({
    data: {
      teamId: g.teamId,
      name,
      color: body.color || null,
      finance: !!body.finance,
      permissions: JSON.stringify(sanitizePerms(body.permissions)),
    },
  });
  return NextResponse.json({ ...role, permissions: JSON.parse(role.permissions), memberCount: 0 }, { status: 201 });
}
