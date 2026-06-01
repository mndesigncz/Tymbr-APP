import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, avatar: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}
