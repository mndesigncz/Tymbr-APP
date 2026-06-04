import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/files/folder/:id — returns folder + ancestors for breadcrumbs
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  const { id } = await params;

  // Walk the parent chain (max 10 levels to avoid infinite loops)
  const breadcrumbs: { id: string; name: string }[] = [];
  let current: string | null = id;
  let safety = 0;
  while (current && safety++ < 10) {
    const currentId: string = current;
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, name, "parentId" FROM "TeamFolder"
      WHERE id = ${currentId} AND "teamId" = ${teamId}
    `;
    if (rows.length === 0) break;
    breadcrumbs.unshift({ id: rows[0].id, name: rows[0].name });
    current = rows[0].parentId;
  }

  return NextResponse.json(breadcrumbs);
}
