import { upload } from "@vercel/blob/client";

export interface UploadedBlob {
  url: string;
  name: string;
  type: string;
  size: number;
}

/**
 * Uploads a file directly from the browser to Vercel Blob storage via a
 * short-lived token from /api/blob/upload. This avoids routing the file
 * body through a serverless function (which caps at ~4.5 MB).
 */
export async function uploadFileToBlob(file: File, prefix = "chat"): Promise<UploadedBlob> {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const blob = await upload(`${prefix}/${safeName}`, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
  });
  return {
    url: blob.url,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
  };
}
