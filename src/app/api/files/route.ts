import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { put, del } from "@vercel/blob";

// GET  /api/files?folderId=...   — list folders + files in a folder (null = root)
// POST /api/files                — create folder  { type:"folder", name, parentId? }
//                               — add link       { type:"link", name, url, folderId? }
//                               — upload file    multipart/form-data { file, folderId? }
// DELETE /api/files              { id, kind:"file"|"folder" }

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ folders: [], files: [] });

  const userId = (session.user as any).id;
  const folderId = req.nextUrl.searchParams.get("folderId") || null;

  const [folders, files] = await Promise.all([
    folderId
      ? prisma.$queryRaw<any[]>`
          SELECT f.id, f.name, f."parentId", f."createdAt", u.name as "creatorName"
          FROM "TeamFolder" f LEFT JOIN "User" u ON u.id = f."createdById"
          WHERE f."teamId" = ${teamId} AND f."parentId" = ${folderId}
          ORDER BY f.name ASC`
      : prisma.$queryRaw<any[]>`
          SELECT f.id, f.name, f."parentId", f."createdAt", u.name as "creatorName"
          FROM "TeamFolder" f LEFT JOIN "User" u ON u.id = f."createdById"
          WHERE f."teamId" = ${teamId} AND f."parentId" IS NULL
          ORDER BY f.name ASC`,
    folderId
      ? prisma.$queryRaw<any[]>`
          SELECT f.id, f.name, f.type, f.url, f."mimeType", f.size, f."folderId", f."createdAt", f.visibility, u.name as "creatorName", f."createdById"
          FROM "TeamFile" f LEFT JOIN "User" u ON u.id = f."createdById"
          WHERE f."teamId" = ${teamId} AND f."folderId" = ${folderId}
            AND (COALESCE(f.visibility,'team') = 'team' OR f."createdById" = ${userId})
          ORDER BY f."createdAt" DESC`
      : prisma.$queryRaw<any[]>`
          SELECT f.id, f.name, f.type, f.url, f."mimeType", f.size, f."folderId", f."createdAt", f.visibility, u.name as "creatorName", f."createdById"
          FROM "TeamFile" f LEFT JOIN "User" u ON u.id = f."createdById"
          WHERE f."teamId" = ${teamId} AND f."folderId" IS NULL
            AND (COALESCE(f.visibility,'team') = 'team' OR f."createdById" = ${userId})
          ORDER BY f."createdAt" DESC`,
  ]);

  return NextResponse.json({ folders, files });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });
  const userId = session.user.id;

  const contentType = req.headers.get("content-type") ?? "";

  // --- file upload (multipart) ---
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const folderId = (form.get("folderId") as string) || null;
    if (!file) return NextResponse.json({ error: "Soubor chybí" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Soubor je větší než 5 MB" }, { status: 400 });

    let url: string;
    try {
      const blob = await put(`team-files/${teamId}/${Date.now()}-${file.name}`, file, {
        access: "public",
        contentType: file.type || "application/octet-stream",
      });
      url = blob.url;
    } catch {
      return NextResponse.json({ error: "Nahrání souboru selhalo" }, { status: 500 });
    }

    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO "TeamFile" (id, name, type, url, "mimeType", size, "folderId", "teamId", "createdById")
      VALUES (gen_random_uuid()::text, ${file.name}, 'upload', ${url},
              ${file.type || null}, ${file.size}, ${folderId}, ${teamId}, ${userId})
      RETURNING id, name, type, url, "mimeType", size, "folderId", "createdAt"
    `;
    return NextResponse.json(rows[0], { status: 201 });
  }

  // --- JSON: folder or link ---
  const body = await req.json().catch(() => ({}));
  const { type, name, parentId, folderId, url } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Název je povinný" }, { status: 400 });

  if (type === "folder") {
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO "TeamFolder" (id, name, "parentId", "teamId", "createdById")
      VALUES (gen_random_uuid()::text, ${name.trim()}, ${parentId || null}, ${teamId}, ${userId})
      RETURNING id, name, "parentId", "createdAt"
    `;
    return NextResponse.json(rows[0], { status: 201 });
  }

  if (type === "link") {
    if (!url?.trim()) return NextResponse.json({ error: "URL je povinná" }, { status: 400 });
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO "TeamFile" (id, name, type, url, "folderId", "teamId", "createdById")
      VALUES (gen_random_uuid()::text, ${name.trim()}, 'link', ${url.trim()},
              ${folderId || null}, ${teamId}, ${userId})
      RETURNING id, name, type, url, "folderId", "createdAt"
    `;
    return NextResponse.json(rows[0], { status: 201 });
  }

  return NextResponse.json({ error: "Neznámý typ" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  const userId = (session.user as any).id;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  const { id, visibility } = await req.json();
  if (!id || !["team", "private"].includes(visibility)) {
    return NextResponse.json({ error: "Neplatná data" }, { status: 400 });
  }
  await prisma.$executeRaw`
    UPDATE "TeamFile" SET visibility = ${visibility}
    WHERE id = ${id} AND "teamId" = ${teamId} AND "createdById" = ${userId}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "Tým nenalezen" }, { status: 404 });

  const { id, kind } = await req.json();
  if (!id) return NextResponse.json({ error: "id je povinné" }, { status: 400 });

  if (kind === "folder") {
    await prisma.$executeRaw`DELETE FROM "TeamFolder" WHERE id = ${id} AND "teamId" = ${teamId}`;
    return NextResponse.json({ ok: true });
  }

  // file — also delete from blob storage if it was an upload
  const rows = await prisma.$queryRaw<any[]>`
    SELECT url, type FROM "TeamFile" WHERE id = ${id} AND "teamId" = ${teamId}
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Soubor nenalezen" }, { status: 404 });
  if (rows[0].type === "upload") {
    try { await del(rows[0].url); } catch {}
  }
  await prisma.$executeRaw`DELETE FROM "TeamFile" WHERE id = ${id} AND "teamId" = ${teamId}`;
  return NextResponse.json({ ok: true });
}
