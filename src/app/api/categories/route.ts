import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json([]);

  const categories = await prisma.category.findMany({
    where: { teamId },
    include: {
      _count: { select: { tasks: true } },
      approver: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { name, color, icon, approvalEnabled, approverId } = await req.json();
  if (!name) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });

  const enabled = approvalEnabled === true;
  const resolvedApproverId = enabled && approverId ? approverId : null;

  try {
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO "Category" (id, name, color, icon, "approvalEnabled", "approverId", "teamId", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${name},
        ${color || "#F97316"},
        ${icon || "folder"},
        ${enabled},
        ${resolvedApproverId},
        ${teamId},
        NOW()
      )
      RETURNING id, name, color, icon, "approvalEnabled", "approverId", "teamId", "createdAt"
    `;
    const cat = rows[0];
    if (cat.approverId) {
      const approver = await prisma.user.findUnique({ where: { id: cat.approverId }, select: { id: true, name: true, avatar: true } });
      cat.approver = approver;
    } else {
      cat.approver = null;
    }
    return NextResponse.json(cat, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
