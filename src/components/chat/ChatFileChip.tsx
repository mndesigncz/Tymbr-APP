"use client";

import { useState, useEffect } from "react";
import { FileText, FileImage, FileVideo, FileArchive, Link as LinkIcon, File } from "lucide-react";

interface FileInfo {
  id: string;
  name: string;
  type: string;
  url: string;
  mimeType?: string | null;
}

const fileCache = new Map<string, FileInfo | null>();

function fileIcon(mimeType?: string | null, type?: string) {
  if (type === "link") return LinkIcon;
  const m = mimeType ?? "";
  if (m.startsWith("image/")) return FileImage;
  if (m.startsWith("video/")) return FileVideo;
  if (m.includes("pdf") || m.includes("text") || m.includes("document")) return FileText;
  if (m.includes("zip") || m.includes("archive") || m.includes("compressed")) return FileArchive;
  return File;
}

export function ChatFileChip({ fileId }: { fileId: string }) {
  const [file, setFile] = useState<FileInfo | null | undefined>(
    fileCache.has(fileId) ? fileCache.get(fileId) : undefined
  );

  useEffect(() => {
    if (fileCache.has(fileId)) {
      setFile(fileCache.get(fileId));
      return;
    }
    let cancelled = false;
    fetch(`/api/files/${fileId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FileInfo | null) => {
        const val = data?.id ? data : null;
        fileCache.set(fileId, val);
        if (!cancelled) setFile(val);
      })
      .catch(() => {
        if (!cancelled) setFile(null);
      });
    return () => { cancelled = true; };
  }, [fileId]);

  if (file === undefined) {
    return (
      <span className="inline-block w-28 h-4 rounded align-middle animate-pulse"
        style={{ background: "var(--border-md)" }} />
    );
  }

  if (file === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-semibold align-middle"
        style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>
        <File className="w-3 h-3" /> smazaný soubor
      </span>
    );
  }

  const Icon = fileIcon(file.mimeType, file.type);

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12.5px] font-semibold align-middle transition-opacity hover:opacity-80"
      style={{
        background: "var(--bg-subtle)",
        color: "var(--text-1)",
        border: "1px solid var(--border-md)",
      }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
      {file.name}
    </a>
  );
}
