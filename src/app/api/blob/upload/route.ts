import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Issues short-lived client upload tokens so the browser can upload files
// straight to Vercel Blob — bypassing the ~4.5 MB serverless request body
// limit that a normal multipart POST through an API route would hit.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (!session?.user) throw new Error("Neautorizováno");
        return {
          maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB
          addRandomSuffix: true,
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Chyba nahrávání" }, { status: 400 });
  }
}
