import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const postInclude = {
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
};

const PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin", "x", "youtube", "newsletter", "other"];
const STATUSES = ["idea", "draft", "scheduled", "published"];

/** Posts are team-scoped — only members of the post's current team may touch them. */
async function findInTeam(id: string, session: { user: { teamId?: string | null } }) {
  const teamId = session.user.teamId;
  if (!teamId) return null;
  const post = await prisma.contentPost.findUnique({ where: { id }, select: { teamId: true, status: true, publishedAt: true } });
  if (!post || post.teamId !== teamId) return null;
  return post;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const { id } = await params;
    const existing = await findInTeam(id, session);
    if (!existing) return NextResponse.json({ error: "Příspěvek nenalezen" }, { status: 404 });

    const body = await req.json();
    const { title, content, link, assigneeId, mediaUrl } = body;

    let scheduledAt: Date | null | undefined;
    if ("scheduledAt" in body) {
      if (body.scheduledAt) {
        scheduledAt = new Date(body.scheduledAt);
        if (isNaN(scheduledAt.getTime())) return NextResponse.json({ error: "Neplatné datum" }, { status: 400 });
      } else {
        scheduledAt = null;
      }
    }

    const status = body.status !== undefined && STATUSES.includes(body.status) ? body.status : undefined;
    // publishedAt follows the status: set on first publish, cleared when un-published
    let publishedAt: Date | null | undefined;
    if (status === "published" && existing.status !== "published") publishedAt = new Date();
    if (status !== undefined && status !== "published") publishedAt = null;

    const post = await prisma.contentPost.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content: content || null }),
        ...(body.platform !== undefined && PLATFORMS.includes(body.platform) && { platform: body.platform }),
        ...(status !== undefined && { status }),
        ...(scheduledAt !== undefined && { scheduledAt }),
        ...(publishedAt !== undefined && { publishedAt }),
        ...(link !== undefined && { link: link || null }),
        ...(mediaUrl !== undefined && { mediaUrl: mediaUrl || null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      },
      include: postInclude,
    });
    return NextResponse.json(post);
  } catch (e: any) {
    console.error("[PUT /api/content-posts/[id]]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const { id } = await params;
    if (!(await findInTeam(id, session))) {
      return NextResponse.json({ error: "Příspěvek nenalezen" }, { status: 404 });
    }
    await prisma.contentPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[DELETE /api/content-posts/[id]]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
