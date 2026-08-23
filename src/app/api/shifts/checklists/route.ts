import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/roles";

export const dynamic = "force-dynamic";

// POST { name, kind, items } — create an opening/closing checklist (manager only).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId as string | null;
  if (!teamId || !isManager((session.user as any).teamRole)) {
    return NextResponse.json({ error: "Jen správce" }, { status: 403 });
  }
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });
  const kind = b.kind === "close" ? "close" : "open";
  const items = Array.isArray(b.items) ? b.items.map((s: any) => String(s).slice(0, 200)).filter(Boolean) : [];

  const created = await prisma.shiftChecklist.create({
    data: { teamId, name: name.slice(0, 80), kind, items: JSON.stringify(items) },
  });
  return NextResponse.json({ id: created.id, name: created.name, kind: created.kind, items }, { status: 201 });
}
