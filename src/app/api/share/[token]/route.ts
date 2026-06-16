import { NextRequest, NextResponse } from "next/server";
import { loadSharedByToken } from "@/lib/share";

/**
 * GET /api/share/[token] — PUBLIC, no auth required.
 * Returns a read-only snapshot of the shared resource, or 404 if the link is
 * invalid, revoked or expired.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await loadSharedByToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Odkaz neexistuje nebo byl zrušen" }, { status: 404 });
  }
  return NextResponse.json(payload);
}
