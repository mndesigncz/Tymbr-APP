import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const categories = await prisma.category.findMany({
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

  const cat = await prisma.category.create({ data: { name, color: color || "#F97316", icon: icon || "folder" } });
  return NextResponse.json(cat, { status: 201 });
}
