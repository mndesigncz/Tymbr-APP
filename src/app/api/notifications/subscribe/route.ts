import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const body = await req.json();
  const { endpoint, keys } = body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Neplatná subscription" }, { status: 400 });
  }

  const userId = (session.user as any).id;

  await prisma.$executeRaw`
    INSERT INTO "PushSubscription" (id, endpoint, p256dh, auth, "userId")
    VALUES (gen_random_uuid()::text, ${endpoint}, ${keys.p256dh}, ${keys.auth}, ${userId})
    ON CONFLICT (endpoint) DO UPDATE
      SET p256dh = ${keys.p256dh}, auth = ${keys.auth}, "userId" = ${userId}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Chybí endpoint" }, { status: 400 });

  const userId = (session.user as any).id;
  await prisma.$executeRaw`
    DELETE FROM "PushSubscription" WHERE endpoint = ${endpoint} AND "userId" = ${userId}
  `;

  return NextResponse.json({ ok: true });
}
