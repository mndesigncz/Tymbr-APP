import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const postInclude = {
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
};

const PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin", "x", "youtube", "newsletter", "other"];
const STATUSES = ["idea", "draft", "scheduled", "published"];

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const teamId = session.user.teamId;
    if (!teamId) return NextResponse.json([]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");

    const posts = await prisma.contentPost.findMany({
      where: {
        teamId,
        ...(status ? { status } : {}),
        ...(platform ? { platform } : {}),
      },
      include: postInclude,
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(posts);
  } catch (e: any) {
    console.error("[GET /api/content-posts]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

    const teamId = session.user.teamId;
    if (!teamId) return NextResponse.json({ error: "Nejprve si vytvoř tým" }, { status: 400 });

    const body = await req.json();
    const { title, content, link, assigneeId, mediaUrl } = body;
    if (!title?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

    const platform = PLATFORMS.includes(body.platform) ? body.platform : "other";
    const status = STATUSES.includes(body.status) ? body.status : "idea";

    let scheduledAt: Date | null = null;
    if (body.scheduledAt) {
      scheduledAt = new Date(body.scheduledAt);
      if (isNaN(scheduledAt.getTime())) return NextResponse.json({ error: "Neplatné datum" }, { status: 400 });
    }

    const post = await prisma.contentPost.create({
      data: {
        title: title.trim(),
        content: content || null,
        platform,
        status,
        scheduledAt,
        publishedAt: status === "published" ? new Date() : null,
        link: link || null,
        mediaUrl: mediaUrl || null,
        teamId,
        createdById: session.user.id,
        assigneeId: assigneeId || null,
      },
      include: postInclude,
    });
    return NextResponse.json(post, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/content-posts]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba serveru" }, { status: 500 });
  }
}
