import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  // Categories are strictly team-scoped.
  if (!teamId) return NextResponse.json([]);

  const categories = await prisma.category.findMany({
    where: { teamId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { name, color, icon } = await req.json();
  if (!name) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });

  try {
    // Raw SQL to bypass Prisma 7 adapter cuid() generation issue
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO "Category" (id, name, color, icon, "teamId", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${name},
        ${color || "#F97316"},
        ${icon || "folder"},
        ${teamId},
        NOW()
      )
      RETURNING id, name, color, icon, "teamId", "createdAt"
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
