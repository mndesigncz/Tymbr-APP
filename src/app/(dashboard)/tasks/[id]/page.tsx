"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/tasks/StatusBadge";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Subtasks } from "@/components/tasks/Subtasks";
import { TaskDependencies } from "@/components/tasks/TaskDependencies";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate, formatRelative } from "@/lib/utils";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Task } from "@/types";
import {
  Calendar, Edit2, Trash2, MessageSquare,
  ChevronDown, Check, Globe, EyeOff, Send,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useStatusConfig } from "@/hooks/useStatusConfig";

function detectMention(text: string, cursor: number): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = /@([^\s@]*)$/.exec(before);
  if (!match) return null;
  return { query: match[1], start: match.index };
}

function renderComment(text: string) {
  const parts = text.split(/(@\w[\w\s]*)/g);
  return parts.map((p, i) =>
    p.startsWith("@")
      ? <span key={i} className="font-semibold" style={{ color: "var(--accent)" }}>{p}</span>
      : p
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const statuses = useStatusConfig();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string; avatar?: string | null }[]>([]);

  const teamRole = (session?.user as any)?.teamRole as string | undefined;
  const isAdminOrOwner = teamRole === "admin" || teamRole === "owner";

  const fetchTask = async () => {
    const res = await fetch(`/api/tasks/${id}`);
    if (res.ok) setTask(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchTask(); }, [id]);

  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then((data) => {
      if (data?.members) {
        setMembers(data.members.map((m: any) => ({ id: m.userId, name: m.user?.name ?? m.name ?? "", avatar: m.user?.avatar ?? null })));
      }
    });
  }, []);

  const handleStatusChange = async (status: string) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setTask(await res.json());
      setStatusOpen(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    router.push("/tasks");
  };

  const mentionResults = mention
    ? members.filter((m) => m.name.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 6)
    : [];

  const selectMention = useCallback((name: string) => {
    if (!mention) return;
    const before = comment.slice(0, mention.start);
    const after = comment.slice(mention.start + 1 + mention.query.length);
    setComment(before + `@${name} ` + after);
    setMention(null);
    setMentionIdx(0);
    setTimeout(() => commentRef.current?.focus(), 0);
  }, [mention, comment]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setComment(val);
    const cursor = e.target.selectionStart ?? val.length;
    const m = detectMention(val, cursor);
    setMention(m);
    setMentionIdx(0);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mention || mentionResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx((i) => Math.min(i + 1, mentionResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectMention(mentionResults[mentionIdx].name); }
    else if (e.key === "Escape") setMention(null);
  };

  const handleVisibilityChange = async (visibility: "team" | "private") => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    if (res.ok) setTask(await res.json());
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    const res = await fetch(`/api/tasks/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    if (res.ok) {
      setComment("");
      await fetchTask();
    }
    setCommenting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p style={{ color: "var(--text-2)" }}>Úkol nenalezen</p>
        <Button onClick={() => router.push("/tasks")}>Zpět na úkoly</Button>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={task.title}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={<Edit2 className="w-4 h-4" />}
              onClick={() => setEditOpen(true)}
            >
              <span className="hidden sm:inline">Upravit</span>
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setDeleteOpen(true)}
            >
              <span className="hidden sm:inline">Smazat</span>
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>

              <h2 className="text-[20px] font-bold tracking-tight mb-3" style={{ color: "var(--text-1)" }}>{task.title}</h2>

              {task.description ? (
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-2)" }}>
                  {task.description}
                </p>
              ) : (
                <p className="text-[14px] italic" style={{ color: "var(--text-3)" }}>Bez popisu</p>
              )}
            </div>

            <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <h3 className="text-[16px] font-bold tracking-tight mb-4" style={{ color: "var(--text-1)" }}>
                Podúkoly
              </h3>
              <Subtasks taskId={task.id} members={members} />
            </div>

            <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <TaskDependencies taskId={task.id} teamId={task.teamId} />
            </div>

            <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center gap-2 mb-5">
                <MessageSquare className="w-[18px] h-[18px]" style={{ color: "var(--text-2)" }} />
                <h3 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
                  Komentáře ({task.comments?.length || 0})
                </h3>
              </div>

              <div className="space-y-4 mb-4">
                {(task.comments || []).map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar name={c.user?.name || "?"} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{c.user?.name}</span>
                        <span className="text-[12px]" style={{ color: "var(--text-3)" }}>{formatRelative(c.createdAt)}</span>
                      </div>
                      <p className="text-[13.5px] rounded-2xl p-3.5" style={{ color: "var(--text-2)", background: "var(--bg-subtle)" }}>
                        {renderComment(c.content)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {session && (
                <form onSubmit={handleComment} className="flex gap-3">
                  <Avatar name={session.user?.name || "?"} size="sm" className="mt-1 flex-shrink-0" />
                  <div className="flex-1 relative">
                    <div className="relative">
                      <textarea
                        ref={commentRef}
                        placeholder="Přidat komentář… (@ pro zmínění člena)"
                        value={comment}
                        onChange={handleCommentChange}
                        onKeyDown={handleCommentKeyDown}
                        rows={2}
                        className="w-full text-[13.5px] rounded-2xl px-4 py-3 resize-none outline-none border transition-all"
                        style={{ background: "var(--bg-subtle)", color: "var(--text-1)", borderColor: "var(--border-md)" }}
                      />
                      {/* @mention dropdown */}
                      {mention && mentionResults.length > 0 && (
                        <div className="absolute bottom-full left-0 mb-1 w-52 rounded-xl overflow-hidden z-50"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                          {mentionResults.map((m, i) => (
                            <button
                              key={m.id}
                              type="button"
                              onMouseDown={() => selectMention(m.name)}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] transition-colors"
                              style={{ background: i === mentionIdx ? "var(--accent-soft)" : "transparent", color: "var(--text-1)" }}
                            >
                              <Avatar name={m.name} src={m.avatar} size="sm" />
                              <span className="font-medium truncate">{m.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {comment.trim() && (
                      <div className="flex justify-end mt-2">
                        <Button type="submit" loading={commenting} size="sm" icon={<Send className="w-3.5 h-3.5" />}>
                          Odeslat
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <h3 className="text-[11.5px] font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-3)" }}>
                Detaily
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-[12px] mb-1.5" style={{ color: "var(--text-3)" }}>Status</p>
                  <div className="relative">
                    <button
                      onClick={() => setStatusOpen(!statusOpen)}
                      className="w-full flex items-center justify-between border rounded-xl px-3 py-2.5 transition-all hover:border-[var(--accent)]"
                      style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}
                    >
                      <StatusBadge status={task.status} />
                      <ChevronDown className="w-4 h-4" style={{ color: "var(--text-3)" }} />
                    </button>
                    {statusOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", boxShadow: "0 12px 32px rgba(0,0,0,0.12)" }}>
                        {statuses.map((s) => (
                          <button
                            key={s.key}
                            onClick={() => handleStatusChange(s.key)}
                            className="w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left hover:bg-black/[0.04]"
                          >
                            <span className="flex items-center gap-2 text-[13.5px] font-medium" style={{ color: s.color }}>
                              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                              {s.label}
                            </span>
                            {task.status === s.key && <Check className="w-4 h-4" style={{ color: "var(--accent)" }} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {task.category && (
                  <div>
                    <p className="text-[12px] mb-1.5" style={{ color: "var(--text-3)" }}>Kategorie</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.category.color }} />
                      <span className="text-[14px]" style={{ color: "var(--text-1)" }}>{task.category.name}</span>
                    </div>
                  </div>
                )}

                {(task.assignees?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[12px] mb-1.5" style={{ color: "var(--text-3)" }}>Přiřazeno</p>
                    <div className="space-y-1.5">
                      {(task.assignees ?? []).map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <Avatar name={a.name} size="sm" />
                          <span className="text-[14px]" style={{ color: "var(--text-1)" }}>{a.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {task.createdBy && (
                  <div>
                    <p className="text-[12px] mb-1.5" style={{ color: "var(--text-3)" }}>Vytvořil</p>
                    <div className="flex items-center gap-2">
                      <Avatar name={task.createdBy.name} size="sm" />
                      <span className="text-[14px]" style={{ color: "var(--text-1)" }}>{task.createdBy.name}</span>
                    </div>
                  </div>
                )}

                {task.startDate && (
                  <div>
                    <p className="text-[12px] mb-1" style={{ color: "var(--text-3)" }}>Datum začátku</p>
                    <span className="text-[14px]" style={{ color: "var(--text-1)" }}>{formatDate(task.startDate)}</span>
                  </div>
                )}

                {task.dueDate && (
                  <div>
                    <p className="text-[12px] mb-1" style={{ color: "var(--text-3)" }}>Termín splnění</p>
                    <span className="text-[14px]" style={{ color: "var(--text-1)" }}>{formatDate(task.dueDate)}</span>
                  </div>
                )}

                {task.hourlyRate ? (
                  <div>
                    <p className="text-[12px] mb-1" style={{ color: "var(--text-3)" }}>Hodinová sazba</p>
                    <span className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                      {task.hourlyRate.toLocaleString("cs-CZ")} Kč/h
                    </span>
                  </div>
                ) : null}

                {task.completedAt ? (
                  <div>
                    <p className="text-[12px] mb-1" style={{ color: "var(--text-3)" }}>Dokončeno</p>
                    <span className="text-[14px] font-semibold" style={{ color: "#22C55E" }}>
                      {formatRelative(task.completedAt)}
                    </span>
                  </div>
                ) : null}

                {isAdminOrOwner && (
                  <div>
                    <p className="text-[12px] mb-1.5" style={{ color: "var(--text-3)" }}>Viditelnost</p>
                    <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--border-md)" }}>
                      <button
                        onClick={() => handleVisibilityChange("team")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-all"
                        style={task.visibility !== "private"
                          ? { background: "var(--accent)", color: "#fff" }
                          : { background: "var(--bg-subtle)", color: "var(--text-3)" }}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Tým
                      </button>
                      <button
                        onClick={() => handleVisibilityChange("private")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-all"
                        style={task.visibility === "private"
                          ? { background: "var(--accent)", color: "#fff" }
                          : { background: "var(--bg-subtle)", color: "var(--text-3)" }}
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Soukromý
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[12px] mb-1" style={{ color: "var(--text-3)" }}>Vytvořeno</p>
                  <span className="text-[14px]" style={{ color: "var(--text-2)" }}>{formatRelative(task.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Upravit úkol" size="lg">
        <TaskForm
          task={task}
          onSuccess={(updated) => {
            setTask(updated);
            setEditOpen(false);
          }}
        />
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Smazat úkol">
        <p className="text-[14px] mb-5" style={{ color: "var(--text-2)" }}>
          Opravdu chcete smazat úkol <strong style={{ color: "var(--text-1)" }}>{task.title}</strong>? Tato akce je nevratná.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)} className="flex-1">
            Zrušit
          </Button>
          <Button loading={deleting} onClick={handleDelete} className="flex-1 !bg-red-500 hover:!opacity-90">
            Smazat
          </Button>
        </div>
      </Modal>
    </div>
  );
}
