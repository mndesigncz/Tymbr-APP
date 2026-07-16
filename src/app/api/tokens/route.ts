import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateToken } from "@/lib/apiToken";

export const dynamic = "force-dynamic";

// GET — list the user's tokens (metadata only, never the raw value).
export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const tokens = await prisma.personalToken.findMany({
    where: { userId: session.user.id as string },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tokens);
}

// POST { name } — create a token; the raw value is returned exactly once.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim() || "Token";

  const { raw, hash, prefix } = generateToken();
  const created = await prisma.personalToken.create({
    data: { name: name.slice(0, 60), tokenHash: hash, prefix, userId: session.user.id as string },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  return NextResponse.json({ ...created, token: raw }, { status: 201 });
}
