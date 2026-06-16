"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Suspense } from "react";
import {
  Plus, Search, Pin, PinOff, Trash2, Globe, Lock, Users,
  CalendarPlus, CheckSquare, Share2, UserPlus, X, Check,
} from "lucide-react";
import { formatRelative } from "@/lib/utils";

const NOTE_COLORS = [
  { value: null,      label: "Výchozí",  bg: "var(--bg-card)",    border: "var(--border-md)" },
  { value: "#fef9c3", label: "Žlutá",    bg: "#fef9c3",           border: "#fde047" },
  { value: "#dcfce7", label: "Zelená",   bg: "#dcfce7",           border: "#86efac" },
  { value: "#dbeafe", label: "Modrá",    bg: "#dbeafe",           border: "#93c5fd" },
  { value: "#fce7f3", label: "Růžová",   bg: "#fce7f3",           border: "#f9a8d4" },
  { value: "#ede9fe", label: "Fialová",  bg: "#ede9fe",           border: "#c4b5fd" },
  { value: "#ffedd5", label: "Oranžová", bg: "#ffedd5",           border: "#fdba74" },
];

interface Note {
  id: string;
  title: string;
  content: string;
  color: string | null;
  pinned: boolean;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  teamId: string | null;
  createdById: string;
  creatorName?: string;
  collaborators?: { id: string; name: string; email: string; avatar?: string | null }[];
  isOwner?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function NoteListItem({ note, active, onClick }: { note: Note; active: boolean; onClick: () => void }) {
  const color = NOTE_COLORS.find((c) => c.value === note.color);
  const preview = note.content.replace(/\n+/g, " ").slice(0, 80);
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border-b transition-colors hover:bg-[var(--hover)]"
      style={{
        borderColor: "var(--border)",
        background: active
          ? "color-mix(in srgb, var(--accent) 6%, transparent)"
          : color?.value
            ? `${color.bg}50`
            : "transparent",
        borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[13.5px] font-semibold truncate flex-1" style={{ color: "var(--text-1)" }}>
          {note.title || "Bez názvu"}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {note.pinned && <Pin className="w-3 h-3" style={{ color: "var(--accent)" }} />}
          {note.visibility === "team" ? (
            <Globe className="w-3 h-3" style={{ color: "var(--text-3)" }} />
          ) : (note.collaborators?.length ?? 0) > 0 ? (
            <Users className="w-3 h-3" style={{ color: "var(--text-3)" }} />
          ) : (
            <Lock className="w-3 h-3" style={{ color: "var(--text-3)" }} />
          )}
        </div>
      </div>
      <p className="text-[12px] truncate" style={{ color: "var(--text-3)" }}>
        {preview || <span className="italic">Prázdná poznámka</span>}
      </p>
      <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
        {formatRelative(note.updatedAt)}
      </p>
    </button>
  );
}

function NoteEditor({
  note,
  onUpdate,
  onDelete,
  onRefresh,
}: {
  note: Note;
  onUpdate: (updated: Partial<Note>) => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const { data: session } = useSession();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string; email: string; avatar?: string | null }[]>([]);
  const [showCollabPicker, setShowCollabPicker] = useState(false);
  const [collabSearch, setCollabSearch] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSent, setShareSent] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const debouncedTitle = useDebounce(title, 600);
  const debouncedContent = useDebounce(content, 600);

  useEffect(() => { setTitle(note.title); setContent(note.content); }, [note.id]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setUsers(d); });
  }, []);

  const save = useCallback(async (patch: Record<string, any>) => {
    setSaving(true);
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }, [note.id, onUpdate]);

  useEffect(() => {
    if (debouncedTitle !== note.title) save({ title: debouncedTitle });
  }, [debouncedTitle]);

  useEffect(() => {
    if (debouncedContent !== note.content) save({ content: debouncedContent });
  }, [debouncedContent]);

  const togglePin = () => save({ pinned: !note.pinned }).then(() => onUpdate({ pinned: !note.pinned }));

  const setColor = (color: string | null) => save({ color });

  const setVisibility = (v: string) => save({ visibility: v });

  const addCollaborator = async (userId: string) => {
    const res = await fetch(`/api/notes/${note.id}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) { onRefresh(); setShowCollabPicker(false); }
  };

  const removeCollaborator = async (userId: string) => {
    await fetch(`/api/notes/${note.id}/collaborators`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    onRefresh();
  };

  const shareInChat = async () => {
    const text = `📝 **${note.title || "Poznámka"}**\n\n${note.content.slice(0, 300)}${note.content.length > 300 ? "…" : ""}`;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setShareSent(true);
    setTimeout(() => { setShareSent(false); setShareOpen(false); }, 1500);
  };

  const color = NOTE_COLORS.find((c) => c.value === note.color) ?? NOTE_COLORS[0];
  const isOwner = note.createdById === (session?.user as any)?.id;
  const collabs = note.collaborators ?? [];
  const filteredUsers = users.filter((u) =>
    !collabs.find((c) => c.id === u.id) &&
    u.id !== note.createdById &&
    (u.name.toLowerCase().includes(collabSearch.toLowerCase()) || u.email.toLowerCase().includes(collabSearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full" style={{ background: color.bg }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0" style={{ borderColor: color.border ?? "var(--border)" }}>
        {/* Color picker */}
        <div className="flex items-center gap-1">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.label}
              onClick={() => setColor(c.value)}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: c.bg === "var(--bg-card)" ? "var(--bg-card)" : c.bg,
                borderColor: note.color === c.value ? "var(--text-1)" : c.border,
              }}
              title={c.label}
            />
          ))}
        </div>
        <div className="flex-1" />
        {/* Visibility */}
        <div className="flex items-center rounded-xl overflow-hidden border" style={{ borderColor: "var(--border-md)" }}>
          <button
            onClick={() => setVisibility("private")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] font-medium transition-all"
            style={note.visibility === "private"
              ? { background: "var(--accent)", color: "#fff" }
              : { background: "transparent", color: "var(--text-3)" }}
          >
            <Lock className="w-3 h-3" /> Soukromá
          </button>
          <button
            onClick={() => setVisibility("team")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] font-medium transition-all"
            style={note.visibility === "team"
              ? { background: "var(--accent)", color: "#fff" }
              : { background: "transparent", color: "var(--text-3)" }}
          >
            <Globe className="w-3 h-3" /> Tým
          </button>
        </div>
        {/* Pin */}
        <button
          onClick={togglePin}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
          title={note.pinned ? "Odepnout" : "Připnout"}
          style={{ color: note.pinned ? "var(--accent)" : "var(--text-3)" }}
        >
          {note.pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
        </button>
        {/* Share in chat */}
        <button
          onClick={() => setShareOpen(true)}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
          title="Sdílet v chatu"
          style={{ color: "var(--text-3)" }}
        >
          <Share2 className="w-4 h-4" />
        </button>
        {/* Create task */}
        <button
          onClick={() => setTaskOpen(true)}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
          title="Vytvořit úkol"
          style={{ color: "var(--text-3)" }}
        >
          <CheckSquare className="w-4 h-4" />
        </button>
        {/* Create calendar event */}
        <button
          onClick={() => setEventOpen(true)}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
          title="Vytvořit událost"
          style={{ color: "var(--text-3)" }}
        >
          <CalendarPlus className="w-4 h-4" />
        </button>
        {/* Save indicator */}
        <span className="text-[11px] ml-1" style={{ color: "var(--text-3)" }}>
          {saving ? "Ukládám…" : saved ? "✓" : ""}
        </span>
        {/* Delete */}
        {isOwner && (
          <button
            onClick={() => {
              if (confirm("Smazat tuto poznámku?")) onDelete();
            }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--danger-soft)]"
            style={{ color: "var(--text-3)" }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Název poznámky"
          className="w-full text-[24px] font-bold bg-transparent outline-none placeholder:font-semibold"
          style={{ color: "var(--text-1)" }}
        />
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Začni psát…"
          className="w-full flex-1 bg-transparent outline-none resize-none text-[15px] leading-relaxed min-h-[400px]"
          style={{ color: "var(--text-2)" }}
        />
      </div>

      {/* Collaborators footer */}
      <div className="flex-shrink-0 border-t px-4 py-3" style={{ borderColor: color.border ?? "var(--border)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11.5px] font-semibold" style={{ color: "var(--text-3)" }}>Spolupracovníci:</span>
          {collabs.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-medium"
              style={{ background: "var(--bg-subtle)", color: "var(--text-1)" }}>
              <Avatar name={c.name} src={c.avatar} size="sm" />
              <span>{c.name}</span>
              {isOwner && (
                <button onClick={() => removeCollaborator(c.id)} className="ml-0.5 hover:opacity-70" style={{ color: "var(--text-3)" }}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowCollabPicker((o) => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all hover:border-[var(--accent)]"
                style={{ borderColor: "var(--border-md)", color: "var(--text-2)", background: "var(--bg-subtle)" }}
              >
                <UserPlus className="w-3.5 h-3.5" /> Přizvat
              </button>
              {showCollabPicker && (
                <div className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl border overflow-hidden z-50 glass-strong animate-scale-in"
                  style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)" }}>
                  <div className="p-2">
                    <input
                      autoFocus
                      value={collabSearch}
                      onChange={(e) => setCollabSearch(e.target.value)}
                      placeholder="Hledat člena…"
                      className="w-full text-[12.5px] px-2.5 py-1.5 rounded-lg outline-none border"
                      style={{ background: "var(--bg-card)", color: "var(--text-1)", borderColor: "var(--border-md)" }}
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <p className="text-[12px] px-3 py-2 text-center" style={{ color: "var(--text-3)" }}>Nikdo nenalezen</p>
                    ) : filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => addCollaborator(u.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-[var(--hover)] text-left"
                      >
                        <Avatar name={u.name} src={u.avatar} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium truncate" style={{ color: "var(--text-1)" }}>{u.name}</p>
                          <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share in chat modal */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Sdílet v týmovém chatu">
        <div className="space-y-4 pt-1">
          <p className="text-[13.5px]" style={{ color: "var(--text-2)" }}>
            Odešle obsah poznámky do týmového chatu jako zprávu. Platné i pro soukromé poznámky — sdílíš jen obsah, ne odkaz.
          </p>
          <div className="rounded-xl p-3 border text-[12.5px]" style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
            <strong>{note.title || "Bez názvu"}</strong>
            {note.content && <p className="mt-1 line-clamp-3">{note.content}</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShareOpen(false)} className="flex-1">Zrušit</Button>
            <Button onClick={shareInChat} className="flex-1">
              {shareSent ? <><Check className="w-3.5 h-3.5" /> Odesláno</> : "Odeslat do chatu"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create task modal */}
      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="Vytvořit úkol z poznámky">
        <CreateFromNoteForm
          type="task"
          title={note.title}
          content={note.content}
          onClose={() => setTaskOpen(false)}
        />
      </Modal>

      {/* Create event modal */}
      <Modal open={eventOpen} onClose={() => setEventOpen(false)} title="Vytvořit událost z poznámky">
        <CreateFromNoteForm
          type="event"
          title={note.title}
          content={note.content}
          onClose={() => setEventOpen(false)}
        />
      </Modal>
    </div>
  );
}

function CreateFromNoteForm({
  type,
  title: initTitle,
  content: initContent,
  onClose,
}: {
  type: "task" | "event";
  title: string;
  content: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initTitle || "");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    if (type === "task") {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: initContent || null }),
      });
      setLoading(false);
      if (res.ok) {
        const task = await res.json();
        setDone(true);
        setTimeout(() => { onClose(); router.push(`/tasks/${task.id}`); }, 800);
      }
    } else {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: initContent || null,
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 3600000).toISOString(),
          allDay: false,
        }),
      });
      setLoading(false);
      if (res.ok) {
        setDone(true);
        setTimeout(() => { onClose(); router.push("/calendar"); }, 800);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-3)" }}>
          {type === "task" ? "Název úkolu" : "Název události"}
        </label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}
        />
      </div>
      {done ? (
        <div className="flex items-center justify-center gap-2 py-2" style={{ color: "#22C55E" }}>
          <Check className="w-4 h-4" />
          <span className="text-[13.5px] font-semibold">{type === "task" ? "Úkol vytvořen" : "Událost vytvořena"}</span>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Zrušit</Button>
          <Button type="submit" loading={loading} className="flex-1">
            {type === "task" ? "Vytvořit úkol" : "Vytvořit událost"}
          </Button>
        </div>
      )}
    </form>
  );
}

function NotesContent() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notes");
    if (res.ok) setNotes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadNote = useCallback(async (id: string) => {
    const res = await fetch(`/api/notes/${id}`);
    if (res.ok) setActiveNote(await res.json());
  }, []);

  useEffect(() => {
    if (activeId) loadNote(activeId);
    else setActiveNote(null);
  }, [activeId, loadNote]);

  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", content: "", visibility: "private" }),
    });
    if (res.ok) {
      const note = await res.json();
      await load();
      setActiveId(note.id);
    }
  };

  const handleUpdate = (updated: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => n.id === activeId ? { ...n, ...updated } : n));
    setActiveNote((prev) => prev ? { ...prev, ...updated } : prev);
  };

  const handleDelete = async () => {
    if (!activeId) return;
    await fetch(`/api/notes/${activeId}`, { method: "DELETE" });
    setActiveId(null);
    setActiveNote(null);
    load();
  };

  const filtered = notes.filter((n) =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Poznámky"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={createNote}>
            Nová poznámka
          </Button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Note list sidebar */}
        <div className="w-72 flex-shrink-0 border-r flex flex-col overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--bg-page)" }}>
          {/* Search */}
          <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hledat…"
                className="flex-1 text-[13px] bg-transparent outline-none"
                style={{ color: "var(--text-1)" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ color: "var(--text-3)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 rounded-full animate-spin"
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
                  {search ? "Žádné výsledky" : "Zatím žádné poznámky"}
                </p>
                {!search && (
                  <button
                    onClick={createNote}
                    className="mt-3 text-[13px] font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    Vytvořit první
                  </button>
                )}
              </div>
            ) : (
              <>
                {pinned.length > 0 && (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-3)" }}>
                      Připnuté
                    </p>
                    {pinned.map((n) => (
                      <NoteListItem key={n.id} note={n} active={n.id === activeId} onClick={() => setActiveId(n.id)} />
                    ))}
                  </>
                )}
                {rest.length > 0 && (
                  <>
                    {pinned.length > 0 && (
                      <p className="px-4 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-3)" }}>
                        Ostatní
                      </p>
                    )}
                    {rest.map((n) => (
                      <NoteListItem key={n.id} note={n} active={n.id === activeId} onClick={() => setActiveId(n.id)} />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Editor pane */}
        <div className="flex-1 overflow-hidden">
          {activeNote ? (
            <NoteEditor
              key={activeNote.id}
              note={activeNote}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onRefresh={() => loadNote(activeId!)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4"
              style={{ color: "var(--text-3)" }}>
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: "var(--bg-subtle)" }}>
                <Pin className="w-7 h-7" style={{ color: "var(--text-3)" }} />
              </div>
              <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>Vyber nebo vytvoř poznámku</p>
              <Button icon={<Plus className="w-4 h-4" />} onClick={createNote}>
                Nová poznámka
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense>
      <NotesContent />
    </Suspense>
  );
}
