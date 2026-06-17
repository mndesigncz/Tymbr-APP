"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Plus, CalendarClock, Link2, Loader2, Megaphone } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { ScrollFadeX } from "@/components/ui/ScrollFadeX";
import type { ContentPost, ContentStatus } from "@/types";
import { PLATFORMS, CONTENT_STATUSES, platformCfg } from "./platforms";
import { ContentPostForm } from "./ContentPostForm";

export function ContentBoard() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContentPost | undefined>(undefined);
  const [defaultStatus, setDefaultStatus] = useState<ContentStatus>("idea");

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/content-posts");
      if (res.ok) setPosts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = platformFilter ? posts.filter((p) => p.platform === platformFilter) : posts;

  const openCreate = (status: ContentStatus) => {
    setEditing(undefined);
    setDefaultStatus(status);
    setFormOpen(true);
  };

  const openEdit = (post: ContentPost) => {
    setEditing(post);
    setFormOpen(true);
  };

  const handleSaved = (post: ContentPost) => {
    setPosts((prev) => {
      const exists = prev.some((p) => p.id === post.id);
      return exists ? prev.map((p) => (p.id === post.id ? post : p)) : [post, ...prev];
    });
    setFormOpen(false);
  };

  const handleDeleted = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setFormOpen(false);
  };

  const moveTo = async (postId: string, status: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || post.status === status) return;
    // Optimistic move
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status: status as ContentStatus } : p)));
    const res = await fetch(`/api/content-posts/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } else {
      load();
    }
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggingId) moveTo(draggingId, status);
    setDraggingId(null);
    setOverColumn(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} />
      </div>
    );
  }

  const columns = CONTENT_STATUSES.map((col) => {
    const colPosts = visible.filter((p) => p.status === col.key);
    const isOver = overColumn === col.key;

    return (
      <div
        key={col.key}
        className="flex flex-col rounded-3xl p-4 transition-all w-full lg:w-[290px] lg:flex-shrink-0"
        style={isOver
          ? { background: "var(--accent-soft)", outline: "2px dashed var(--accent)", outlineOffset: "-2px" }
          : { background: "var(--bg-subtle)" }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverColumn(col.key); }}
        onDrop={(e) => handleDrop(e, col.key)}
        onDragLeave={() => setOverColumn(null)}
      >
        <div className="flex items-center justify-between mb-4 px-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <col.icon className="w-4 h-4 flex-shrink-0" style={{ color: col.color }} />
            <span className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{col.label}</span>
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{ background: "var(--bg-card)", color: "var(--text-3)" }}>
              {colPosts.length}
            </span>
          </div>
          <button type="button" onClick={() => openCreate(col.key)} aria-label={`Přidat do ${col.label}`}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
            style={{ color: "var(--text-2)" }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 min-h-0 lg:min-h-[120px]">
          {colPosts.map((post) => {
            const platform = platformCfg(post.platform);
            return (
              <div
                key={post.id}
                draggable
                onDragStart={(e) => { setDraggingId(post.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragEnd={() => { setDraggingId(null); setOverColumn(null); }}
                className={draggingId === post.id ? "opacity-40" : ""}
              >
                <button type="button" onClick={() => openEdit(post)}
                  className="w-full text-left rounded-2xl border transition-all duration-150 cursor-pointer hover:-translate-y-0.5 overflow-hidden"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  {post.mediaUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={post.mediaUrl} alt="" className="w-full h-32 object-cover" />
                  )}
                  <div className={post.mediaUrl ? "p-4 pt-3" : "p-4"}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg"
                      style={{ color: platform.color, background: `color-mix(in srgb, ${platform.color} 10%, transparent)` }}>
                      <platform.icon className="w-3 h-3" />
                      {platform.label}
                    </span>
                    {post.link && <Link2 className="w-3.5 h-3.5 ml-auto" style={{ color: "var(--text-3)" }} />}
                  </div>
                  <p className="text-[13.5px] font-semibold leading-snug line-clamp-2 mb-1.5" style={{ color: "var(--text-1)" }}>
                    {post.title}
                  </p>
                  {post.content && (
                    <p className="text-[12px] line-clamp-2 leading-relaxed mb-2" style={{ color: "var(--text-3)" }}>
                      {post.content}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {post.scheduledAt ? (
                      <span className="flex items-center gap-1 text-[11.5px] font-medium" style={{ color: "var(--text-3)" }}>
                        <CalendarClock className="w-3.5 h-3.5" />
                        {format(new Date(post.scheduledAt), "d. M. HH:mm", { locale: cs })}
                      </span>
                    ) : <span />}
                    {post.assignee && (
                      <Avatar name={post.assignee.name} src={post.assignee.avatar} size="sm" />
                    )}
                  </div>
                  </div>
                </button>
              </div>
            );
          })}
          {colPosts.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <span className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Prázdné</span>
            </div>
          )}
        </div>
      </div>
    );
  });

  return (
    <div>
      {/* Platform filter chips — single row like the tasks tab */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button type="button" onClick={() => setPlatformFilter(null)}
          className="px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all"
          style={platformFilter === null
            ? { background: "var(--btn-invert-bg)", color: "var(--btn-invert-text)", borderColor: "transparent" }
            : { background: "var(--bg-card)", color: "var(--text-2)", borderColor: "var(--border-md)" }}>
          Vše
        </button>
        {PLATFORMS.map((p) => {
          const active = platformFilter === p.key;
          const count = posts.filter((x) => x.platform === p.key).length;
          if (count === 0 && !active) return null;
          return (
            <button key={p.key} type="button" onClick={() => setPlatformFilter(active ? null : p.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all"
              style={active
                ? { background: `color-mix(in srgb, ${p.color} 10%, transparent)`, color: p.color, borderColor: p.color }
                : { background: "var(--bg-card)", color: "var(--text-2)", borderColor: "var(--border-md)" }}>
              <p.icon className="w-3.5 h-3.5" />
              {p.label}
              <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-3xl border px-6 py-16 text-center"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--text-3)" }} />
          <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>Zatím žádný obsah</p>
          <p className="text-[13px] mb-5" style={{ color: "var(--text-3)" }}>
            Naplánujte příspěvky na sociální sítě — od nápadu po publikaci.
          </p>
          <button type="button" onClick={() => openCreate("idea")}
            className="inline-flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all hover:opacity-90"
            style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(247,89,47,0.25)" }}>
            <Plus className="w-4 h-4" />
            První příspěvek
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: stacked columns */}
          <div className="flex flex-col gap-4 lg:hidden">
            {columns}
          </div>
          {/* Desktop: horizontal board, columns hug their own height */}
          <ScrollFadeX className="hidden lg:flex items-start gap-4 pb-2" fadeColor="var(--bg-page)">
            {columns}
          </ScrollFadeX>
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Upravit příspěvek" : "Nový příspěvek"}>
        {formOpen && (
          <ContentPostForm
            post={editing}
            defaultStatus={defaultStatus}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onClose={() => setFormOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
