"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/tasks/StatusBadge";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Subtasks } from "@/components/tasks/Subtasks";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { formatDate, formatRelative } from "@/lib/utils";
import type { Task } from "@/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";
import {
  Calendar, Tag, User, Edit2, Trash2, MessageSquare,
  ChevronDown, Check,
} from "lucide-react";
import { useSession } from "next-auth/react";

const STATUSES = ["todo", "in_progress", "review", "done"] as const;

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTask = async () => {
    const res = await fetch(`/api/tasks/${id}`);
    if (res.ok) setTask(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchTask(); }, [id]);

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
              <Subtasks taskId={task.id} />
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
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {session && (
                <form onSubmit={handleComment} className="flex gap-3">
                  <Avatar name={session.user?.name || "?"} size="sm" className="mt-1 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Přidat komentář..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                    />
                    {comment.trim() && (
                      <Button type="submit" loading={commenting} size="sm">
                        Odeslat
                      </Button>
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
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(s)}
                            className="w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left hover:bg-black/[0.04]"
                          >
                            <span className="text-[13.5px] font-medium" style={{ color: STATUS_COLORS[s] }}>
                              {STATUS_LABELS[s]}
                            </span>
                            {task.status === s && <Check className="w-4 h-4" style={{ color: "var(--accent)" }} />}
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

                {task.assignee && (
                  <div>
                    <p className="text-[12px] mb-1.5" style={{ color: "var(--text-3)" }}>Přiřazeno</p>
                    <div className="flex items-center gap-2">
                      <Avatar name={task.assignee.name} size="sm" />
                      <span className="text-[14px]" style={{ color: "var(--text-1)" }}>{task.assignee.name}</span>
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
