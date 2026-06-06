import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const { id } = await params;
  const file = await prisma.teamFile.findUnique({
    where: { id },
    select: { id: true, name: true, type: true, url: true, mimeType: true },
  });
  if (!file) return NextResponse.json({ error: "Nenalezeno" }, { status: 404 });
  return NextResponse.json(file);
}
