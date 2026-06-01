"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/tasks/StatusBadge";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskForm } from "@/components/tasks/TaskForm";
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
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-400">Úkol nenalezen</p>
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
              size="sm"
              icon={<Edit2 className="w-4 h-4" />}
              onClick={() => setEditOpen(true)}
            >
              <span className="hidden sm:inline">Upravit</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setDeleteOpen(true)}
            >
              <span className="hidden sm:inline">Smazat</span>
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>

              <h2 className="text-xl font-bold text-white mb-3">{task.title}</h2>

              {task.description ? (
                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : (
                <p className="text-gray-600 text-sm italic">Bez popisu</p>
              )}
            </div>

            <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <h3 className="text-base font-semibold text-white">
                  Komentáře ({task.comments?.length || 0})
                </h3>
              </div>

              <div className="space-y-4 mb-4">
                {(task.comments || []).map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar name={c.user?.name || "?"} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{c.user?.name}</span>
                        <span className="text-xs text-gray-500">{formatRelative(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-400 bg-[#141414] rounded-xl p-3">
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
            <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                Detaily
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Status</p>
                  <div className="relative">
                    <button
                      onClick={() => setStatusOpen(!statusOpen)}
                      className="w-full flex items-center justify-between bg-[#141414] border border-[#2d2d2d] rounded-xl px-3 py-2 hover:border-orange-500/40 transition-all"
                    >
                      <StatusBadge status={task.status} />
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>
                    {statusOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl overflow-hidden z-10 shadow-xl">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(s)}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#2a2a2a] transition-colors text-left"
                          >
                            <span className="text-sm" style={{ color: STATUS_COLORS[s] }}>
                              {STATUS_LABELS[s]}
                            </span>
                            {task.status === s && <Check className="w-4 h-4 text-orange-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {task.category && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Kategorie</p>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: task.category.color }} />
                      <span className="text-sm text-gray-300">{task.category.name}</span>
                    </div>
                  </div>
                )}

                {task.assignee && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Přiřazeno</p>
                    <div className="flex items-center gap-2">
                      <Avatar name={task.assignee.name} size="sm" />
                      <span className="text-sm text-gray-300">{task.assignee.name}</span>
                    </div>
                  </div>
                )}

                {task.createdBy && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Vytvořil</p>
                    <div className="flex items-center gap-2">
                      <Avatar name={task.createdBy.name} size="sm" />
                      <span className="text-sm text-gray-300">{task.createdBy.name}</span>
                    </div>
                  </div>
                )}

                {task.startDate && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Datum začátku</p>
                    <span className="text-sm text-gray-300">{formatDate(task.startDate)}</span>
                  </div>
                )}

                {task.dueDate && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Termín splnění</p>
                    <span className="text-sm text-gray-300">{formatDate(task.dueDate)}</span>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 mb-1">Vytvořeno</p>
                  <span className="text-sm text-gray-400">{formatRelative(task.createdAt)}</span>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Upraveno</p>
                  <span className="text-sm text-gray-400">{formatRelative(task.updatedAt)}</span>
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
        <p className="text-gray-400 mb-5">
          Opravdu chcete smazat úkol <strong className="text-white">{task.title}</strong>? Tato akce je nevratná.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)} className="flex-1">
            Zrušit
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete} className="flex-1 !bg-red-500 !text-white hover:!bg-red-600">
            Smazat
          </Button>
        </div>
      </Modal>
    </div>
  );
}
