import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  canShareResource, getOrCreateShareLink, isShareResourceType,
} from "@/lib/share";

/** GET /api/share?resourceType=note&resourceId=xxx → existing active link (or { token: null }). */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const resourceType = searchParams.get("resourceType");
  const resourceId = searchParams.get("resourceId");
  if (!isShareResourceType(resourceType) || !resourceId) {
    return NextResponse.json({ error: "Neplatné parametry" }, { status: 400 });
  }

  const userId = session.user.id;
  const teamId = (session.user as any).teamId as string | undefined;
  if (!(await canShareResource(resourceType, resourceId, userId, teamId))) {
    return NextResponse.json({ error: "Nemáš přístup" }, { status: 403 });
  }

  const rows = await prisma.$queryRaw<any[]>`
    SELECT token FROM "ShareLink"
    WHERE "resourceType" = ${resourceType} AND "resourceId" = ${resourceId}
      AND "createdById" = ${userId} AND revoked = false
    ORDER BY "createdAt" DESC LIMIT 1`;
  return NextResponse.json({ token: rows[0]?.token ?? null });
}

/** POST /api/share { resourceType, resourceId } → creates/returns an active link. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { resourceType, resourceId } = await req.json();
  if (!isShareResourceType(resourceType) || !resourceId) {
    return NextResponse.json({ error: "Neplatné parametry" }, { status: 400 });
  }

  const userId = session.user.id;
  const teamId = (session.user as any).teamId as string | undefined;
  if (!(await canShareResource(resourceType, resourceId, userId, teamId))) {
    return NextResponse.json({ error: "Nemáš přístup" }, { status: 403 });
  }

  const { token } = await getOrCreateShareLink(resourceType, resourceId, userId, teamId);
  return NextResponse.json({ token });
}

/** DELETE /api/share { resourceType, resourceId } → revokes the caller's link. */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { resourceType, resourceId } = await req.json();
  if (!isShareResourceType(resourceType) || !resourceId) {
    return NextResponse.json({ error: "Neplatné parametry" }, { status: 400 });
  }

  const userId = session.user.id;
  await prisma.$executeRaw`
    UPDATE "ShareLink" SET revoked = true
    WHERE "resourceType" = ${resourceType} AND "resourceId" = ${resourceId} AND "createdById" = ${userId}`;
  return NextResponse.json({ ok: true });
}
