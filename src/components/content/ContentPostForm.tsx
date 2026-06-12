"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Link2, Trash2 } from "lucide-react";
import type { ContentPost, ContentStatus, User } from "@/types";
import { PLATFORMS, CONTENT_STATUSES } from "./platforms";

interface ContentPostFormProps {
  post?: ContentPost;
  defaultStatus?: ContentStatus;
  onSaved: (post: ContentPost) => void;
  onDeleted?: (id: string) => void;
  onClose: () => void;
}

function toLocalInput(d: Date | string): string {
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function ContentPostForm({ post, defaultStatus, onSaved, onDeleted, onClose }: ContentPostFormProps) {
  const [title, setTitle] = useState(post?.title || "");
  const [platform, setPlatform] = useState(post?.platform || "instagram");
  const [status, setStatus] = useState<ContentStatus>(post?.status || defaultStatus || "idea");
  const [scheduledAt, setScheduledAt] = useState(post?.scheduledAt ? toLocalInput(post.scheduledAt) : "");
  const [content, setContent] = useState(post?.content || "");
  const [link, setLink] = useState(post?.link || "");
  const [assigneeId, setAssigneeId] = useState(post?.assigneeId || "");
  const [members, setMembers] = useState<User[]>([]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => Array.isArray(d) && setMembers(d)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Název je povinný"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(post ? `/api/content-posts/${post.id}` : "/api/content-posts", {
        method: post ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          platform,
          status,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          content: content || null,
          link: link || null,
          assigneeId: assigneeId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Něco se pokazilo");
        return;
      }
      onSaved(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/content-posts/${post.id}`, { method: "DELETE" });
      if (res.ok) onDeleted?.(post.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Název příspěvku"
        className="text-[15px] font-semibold"
      />

      {/* Platform picker */}
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>Platforma</label>
        <div className="grid grid-cols-4 gap-2">
          {PLATFORMS.map((p) => {
            const active = platform === p.key;
            return (
              <button key={p.key} type="button" onClick={() => setPlatform(p.key)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all"
                style={active
                  ? { borderColor: p.color, background: `color-mix(in srgb, ${p.color} 9%, transparent)`, color: p.color }
                  : { borderColor: "var(--border)", background: "var(--bg-subtle)", color: "var(--text-2)" }}>
                <p.icon className="w-4 h-4" />
                <span className="text-[11px] font-semibold">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>Stav</label>
        <div className="flex items-center gap-1 p-1 rounded-xl border"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}>
          {CONTENT_STATUSES.map((s) => (
            <button key={s.key} type="button" onClick={() => setStatus(s.key)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[12px] font-semibold transition-all"
              style={status === s.key
                ? { background: "var(--btn-invert-bg)", color: "var(--btn-invert-text)" }
                : { color: "var(--text-2)" }}>
              <s.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>
          Datum publikace {status === "scheduled" ? "" : "(nepovinné)"}
        </label>
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </div>

      {/* Copy text */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Text příspěvku / caption (nepovinné)"
        rows={4}
      />

      {/* Link */}
      <Input
        icon={<Link2 className="w-4 h-4" />}
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Odkaz na publikovaný příspěvek (nepovinné)"
      />

      {/* Assignee */}
      <Select
        label="Má na starosti"
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        placeholder="Nikdo"
        options={members.map((m) => ({ value: m.id, label: m.name }))}
      />

      {error && <p className="text-sm px-1" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        {post && onDeleted && (
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="p-2.5 rounded-xl transition-colors hover:bg-[var(--danger-soft)] disabled:opacity-50"
            style={{ color: "var(--danger)" }} title="Smazat příspěvek" aria-label="Smazat příspěvek">
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        )}
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Zrušit
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {post ? "Uložit" : "Vytvořit"}
        </Button>
      </div>
    </form>
  );
}
