import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Issues short-lived client upload tokens so the browser can upload files
// straight to Vercel Blob — bypassing the ~4.5 MB serverless request body
// limit that a normal multipart POST through an API route would hit.
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Surface the most common misconfiguration clearly instead of a vague
  // "Failed to retrieve the client token" on the browser.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Úložiště souborů není nastavené (chybí BLOB_READ_WRITE_TOKEN pro toto prostředí)." },
      { status: 500 }
    );
  }

  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => ({
        maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB
        addRandomSuffix: true,
      }),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e: any) {
    console.error("[blob/upload]", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Chyba nahrávání" }, { status: 400 });
  }
}
