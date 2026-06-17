-- Content posts: attach an image/media preview (Vercel Blob URL)
ALTER TABLE "ContentPost" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
