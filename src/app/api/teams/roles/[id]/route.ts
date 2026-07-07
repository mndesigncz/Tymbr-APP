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

async function guardRole(id: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Neautorizováno" }, { status: 401 }) };
  const teamId = (session.user as any).teamId as string | undefined;
  if (!teamId || !isManager((session.user as any).teamRole)) {
    return { error: NextResponse.json({ error: "Vlastní role spravuje jen owner/admin" }, { status: 403 }) };
  }
  const role = await prisma.customRole.findUnique({ where: { id } });
  if (!role || role.teamId !== teamId) {
    return { error: NextResponse.json({ error: "Role nenalezena" }, { status: 404 }) };
  }
  return { role };
}

// PATCH /api/teams/roles/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guardRole(id);
  if ("error" in g) return g.error;

  const body = await req.json();
  const data: Record<string, any> = {};
  if ("name" in body) {
    const name = (body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Název role je povinný" }, { status: 400 });
    data.name = name;
  }
  if ("color" in body) data.color = body.color || null;
  if ("finance" in body) data.finance = !!body.finance;
  if ("permissions" in body) data.permissions = JSON.stringify(sanitizePerms(body.permissions));

  const updated = await prisma.customRole.update({ where: { id }, data });
  return NextResponse.json({ ...updated, permissions: JSON.parse(updated.permissions) });
}

// DELETE /api/teams/roles/[id] — members holding it fall back to plain member
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guardRole(id);
  if ("error" in g) return g.error;

  // Detach members first (SET NULL also handles it, but reset role explicitly).
  await prisma.teamMember.updateMany({
    where: { customRoleId: id },
    data: { customRoleId: null, role: "member" },
  });
  await prisma.customRole.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
