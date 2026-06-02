import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(null);

  const entry = await prisma.timeEntry.findFirst({
    where: { userId: session.user.id, stoppedAt: null },
    include: { task: { include: { category: true } } },
  });

  return NextResponse.json(entry);
}
