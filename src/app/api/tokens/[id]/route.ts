import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// DELETE — revoke a token owned by the current user.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { id } = await params;
  await prisma.personalToken.deleteMany({ where: { id, userId: session.user.id as string } });
  return NextResponse.json({ ok: true });
}
