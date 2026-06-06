"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Folder, FolderOpen, File, FileText, FileImage, FileVideo, FileArchive,
  Link as LinkIcon, Upload, Trash2, ChevronRight, Home, X, ExternalLink,
  Lock, Globe,
} from "lucide-react";

interface TeamFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  creatorName?: string;
}

interface TeamFile {
  id: string;
  name: string;
  type: "upload" | "link";
  url: string;
  mimeType?: string | null;
  size?: number | null;
  folderId: string | null;
  createdAt: string;
  creatorName?: string;
  visibility?: string;
  createdById?: string;
}

function fileIcon(file: TeamFile) {
  if (file.type === "link") return LinkIcon;
  const m = file.mimeType ?? "";
  if (m.startsWith("image/")) return FileImage;
  if (m.startsWith("video/")) return FileVideo;
  if (m.includes("pdf") || m.includes("text") || m.includes("document")) return FileText;
  if (m.includes("zip") || m.includes("archive") || m.includes("compressed")) return FileArchive;
  return File;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type Modal =
  | { kind: "none" }
  | { kind: "newFolder" }
  | { kind: "addLink" }
  | { kind: "deleteFolder"; item: TeamFolder }
  | { kind: "deleteFile"; item: TeamFile };

export default function FilesPage() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const [folderId, setFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [folders, setFolders] = useState<TeamFolder[]>([]);
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [folderName, setFolderName] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (id: string | null) => {
    setLoading(true);
    const qs = id ? `?folderId=${id}` : "";
    const res = await fetch(`/api/files${qs}`);
    const data = res.ok ? await res.json() : { folders: [], files: [] };
    setFolders(data.folders ?? []);
    setFiles(data.files ?? []);
    setLoading(false);

    if (id) {
      const bc = await fetch(`/api/files/folder/${id}`).then((r) => r.json()).catch(() => []);
      setBreadcrumbs(Array.isArray(bc) ? bc : []);
    } else {
      setBreadcrumbs([]);
    }
  }, []);

  useEffect(() => { load(folderId); }, [folderId, load]);

  const navigate = (id: string | null) => setFolderId(id);

  const closeModal = () => { setModal({ kind: "none" }); setFolderName(""); setLinkName(""); setLinkUrl(""); setError(""); };

  const createFolder = async () => {
    if (!folderName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "folder", name: folderName.trim(), parentId: folderId }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Chyba"); return; }
    closeModal();
    load(folderId);
  };

  const addLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    setSaving(true);
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "link", name: linkName.trim(), url: linkUrl.trim(), folderId }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Chyba"); return; }
    closeModal();
    load(folderId);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Soubor je větší než 5 MB"); return; }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    if (folderId) form.append("folderId", folderId);
    const res = await fetch("/api/files", { method: "POST", body: form });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) { const d = await res.json(); alert(d.error || "Nahrání selhalo"); return; }
    load(folderId);
  };

  const deleteItem = async (kind: "folder" | "file", id: string) => {
    await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, kind }),
    });
    closeModal();
    load(folderId);
  };

  const toggleVisibility = async (file: TeamFile) => {
    const next = (file.visibility ?? "team") === "team" ? "private" : "team";
    await fetch("/api/files", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: file.id, visibility: next }),
    });
    setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, visibility: next } : f));
  };

  const isEmpty = !loading && folders.length === 0 && files.length === 0;

  return (
    <div>
      <Header
        title="Soubory týmu"
        subtitle="Sdílené soubory a odkazy"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Folder className="w-3.5 h-3.5" />} onClick={() => setModal({ kind: "newFolder" })}>
              Složka
            </Button>
            <Button variant="secondary" icon={<LinkIcon className="w-3.5 h-3.5" />} onClick={() => setModal({ kind: "addLink" })}>
              Odkaz
            </Button>
            <Button icon={<Upload className="w-3.5 h-3.5" />} onClick={() => fileRef.current?.click()} loading={uploading}>
              Nahrát
            </Button>
            <input ref={fileRef} type="file" className="hidden" onChange={uploadFile} />
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 mb-5 flex-wrap">
          <button
            onClick={() => navigate(null)}
            className="flex items-center gap-1 text-[13px] font-medium transition-colors hover:opacity-80"
            style={{ color: folderId ? "var(--text-3)" : "var(--text-1)" }}
          >
            <Home className="w-3.5 h-3.5" />
            Soubory
          </button>
          {breadcrumbs.map((bc, i) => (
            <span key={bc.id} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
              <button
                onClick={() => navigate(bc.id)}
                className="text-[13px] font-medium transition-colors hover:opacity-80"
                style={{ color: i === breadcrumbs.length - 1 ? "var(--text-1)" : "var(--text-3)" }}
              >
                {bc.name}
              </button>
            </span>
          ))}
        </nav>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--bg-subtle)" }}>
              <FolderOpen className="w-7 h-7" style={{ color: "var(--text-3)" }} />
            </div>
            <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>Složka je prázdná</p>
            <p className="text-[13px] mb-6" style={{ color: "var(--text-3)" }}>Nahraj soubor, přidej odkaz nebo vytvoř podsložku</p>
            <div className="flex gap-3">
              <Button variant="secondary" icon={<Folder className="w-3.5 h-3.5" />} onClick={() => setModal({ kind: "newFolder" })}>
                Nová složka
              </Button>
              <Button icon={<Upload className="w-3.5 h-3.5" />} onClick={() => fileRef.current?.click()}>
                Nahrát soubor
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border overflow-hidden"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            {/* Folders */}
            {folders.map((folder) => (
              <div key={folder.id}
                className="flex items-center gap-3 px-5 py-3.5 border-b transition-colors hover:bg-black/[0.02] cursor-pointer group"
                style={{ borderColor: "var(--border)" }}>
                <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => navigate(folder.id)}>
                  <Folder className="w-[18px] h-[18px] flex-shrink-0" style={{ color: "#EAB308" }} />
                  <span className="text-[14px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {folder.name}
                  </span>
                </button>
                <span className="text-[12px] hidden sm:block" style={{ color: "var(--text-3)" }}>
                  {folder.creatorName}
                </span>
                <button
                  onClick={() => setModal({ kind: "deleteFolder", item: folder })}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500"
                  style={{ color: "var(--text-3)" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Files */}
            {files.map((file) => {
              const Icon = fileIcon(file);
              return (
                <div key={file.id}
                  className="flex items-center gap-3 px-5 py-3.5 border-b last:border-b-0 transition-colors hover:bg-black/[0.02] group"
                  style={{ borderColor: "var(--border)" }}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0"
                      style={{ color: file.type === "link" ? "#3B82F6" : "var(--text-3)" }} />
                    <span className="text-[14px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                      {file.name}
                    </span>
                    {file.type === "link" && (
                      <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                    )}
                  </a>
                  <div className="hidden sm:flex items-center gap-3">
                    {file.size != null && (
                      <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
                        {formatBytes(Number(file.size))}
                      </span>
                    )}
                    <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
                      {file.creatorName}
                    </span>
                    {file.createdById === myId && (
                      <button
                        onClick={() => toggleVisibility(file)}
                        title={(file.visibility ?? "team") === "team" ? "Viditelné pro tým — klikni pro soukromé" : "Soukromé — klikni pro sdílené"}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all hover:scale-105 active:scale-95"
                        style={(file.visibility ?? "team") === "private"
                          ? { background: "#f3f4f6", color: "#6b7280" }
                          : { background: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        {(file.visibility ?? "team") === "private"
                          ? <><Lock className="w-3 h-3" /> Soukromé</>
                          : <><Globe className="w-3 h-3" /> Tým</>
                        }
                      </button>
                    )}
                    {file.createdById !== myId && (file.visibility ?? "team") === "team" && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                        <Globe className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setModal({ kind: "deleteFile", item: file })}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500"
                    style={{ color: "var(--text-3)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal.kind === "newFolder" && (
        <ModalWrap onClose={closeModal} title="Nová složka">
          <Input label="Název složky" placeholder="Např. Smlouvy" value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createFolder(); }}
            autoFocus />
          {error && <p className="text-[12px] text-red-400 mt-1">{error}</p>}
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Zrušit</Button>
            <Button onClick={createFolder} loading={saving} className="flex-1">Vytvořit</Button>
          </div>
        </ModalWrap>
      )}

      {modal.kind === "addLink" && (
        <ModalWrap onClose={closeModal} title="Přidat odkaz">
          <div className="space-y-3">
            <Input label="Název" placeholder="Např. Firemní web" value={linkName}
              onChange={(e) => setLinkName(e.target.value)} autoFocus />
            <Input label="URL" placeholder="https://..." value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addLink(); }}
              icon={<LinkIcon className="w-3.5 h-3.5" />} />
          </div>
          {error && <p className="text-[12px] text-red-400 mt-1">{error}</p>}
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Zrušit</Button>
            <Button onClick={addLink} loading={saving} className="flex-1">Přidat</Button>
          </div>
        </ModalWrap>
      )}

      {(modal.kind === "deleteFolder" || modal.kind === "deleteFile") && (
        <ModalWrap onClose={closeModal} title="Potvrdit smazání">
          <p className="text-[14px] mb-5" style={{ color: "var(--text-2)" }}>
            {modal.kind === "deleteFolder"
              ? `Smazat složku „${modal.item.name}"? Smaže se i vše uvnitř.`
              : `Smazat „${modal.item.name}"?`}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Zrušit</Button>
            <Button variant="danger" className="flex-1"
              onClick={() => deleteItem(modal.kind === "deleteFolder" ? "folder" : "file", modal.item.id)}>
              Smazat
            </Button>
          </div>
        </ModalWrap>
      )}
    </div>
  );
}

function ModalWrap({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border p-6 relative"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-md, 0 8px 32px rgba(0,0,0,0.15))" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold" style={{ color: "var(--text-1)" }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-black/[0.05]" style={{ color: "var(--text-3)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
