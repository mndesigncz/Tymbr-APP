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
  CalendarPlus, CheckSquare, Share2, UserPlus, X, Check, BookOpen, Palette, ChevronLeft,
} from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { TaskForm } from "@/components/tasks/TaskForm";
import { EventForm } from "@/components/calendar/EventForm";
import { ShareSheet } from "@/components/share/ShareSheet";
import { DropdownPortal } from "@/components/ui/DropdownPortal";

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
      className="w-full text-left rounded-2xl px-3.5 py-3 transition-all active:scale-[0.98]"
      style={{
        background: active
          ? "color-mix(in srgb, var(--accent) 8%, var(--bg-card))"
          : color?.value
            ? `color-mix(in srgb, ${color.bg} 18%, var(--bg-card))`
            : "var(--bg-card)",
        boxShadow: "var(--shadow-sm)",
        border: active
          ? "1.5px solid var(--accent)"
          : color?.value
            ? `1.5px solid ${color.border}88`
            : "1.5px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[13.5px] font-semibold truncate flex-1" style={{ color: "var(--text-1)" }}>
          {note.title || "Bez názvu"}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
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
      <p className="text-[12px] truncate leading-relaxed" style={{ color: "var(--text-3)" }}>
        {preview || <span className="italic">Prázdná poznámka</span>}
      </p>
      <p className="text-[11px] mt-1.5" style={{ color: "var(--text-3)" }}>
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
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string; email: string; avatar?: string | null }[]>([]);
  const [showCollabPicker, setShowCollabPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [collabSearch, setCollabSearch] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const canUseTeam = !!(session?.user as any)?.teamId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerRef = useRef<HTMLButtonElement>(null);
  const collabBtnRef = useRef<HTMLButtonElement>(null);

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
      setTimeout(() => setSaved(false), 1800);
    }
  }, [note.id, onUpdate]);

  useEffect(() => {
    if (debouncedTitle !== note.title) save({ title: debouncedTitle });
  }, [debouncedTitle]);

  useEffect(() => {
    if (debouncedContent !== note.content) save({ content: debouncedContent });
  }, [debouncedContent]);

  const togglePin = () => save({ pinned: !note.pinned }).then(() => onUpdate({ pinned: !note.pinned }));
  const setNoteColor = (c: string | null) => { save({ color: c }); setShowColorPicker(false); };
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

  const chatMessage = `📝 **${note.title || "Poznámka"}**\n\n${note.content.slice(0, 300)}${note.content.length > 300 ? "…" : ""}`;

  const color = NOTE_COLORS.find((c) => c.value === note.color) ?? NOTE_COLORS[0];
  const isOwner = note.createdById === (session?.user as any)?.id;
  const collabs = note.collaborators ?? [];
  const filteredUsers = users.filter((u) =>
    !collabs.find((c) => c.id === u.id) &&
    u.id !== note.createdById &&
    (u.name.toLowerCase().includes(collabSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(collabSearch.toLowerCase()))
  );

  // Floating-card shadow — kept light & soft, tinted with the note's colour when one is set
  const cardShadow = color.value
    ? `0 10px 28px ${color.border}30, 0 3px 10px ${color.border}1f`
    : "0 10px 30px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)";

  return (
    // Outer container adds even padding on all sides so the card floats with room around it
    <div className="h-full p-3 sm:p-5 flex flex-col min-h-0" style={{ background: "var(--bg-page)" }}>
      <div
        className="glass-strong flex-1 min-h-0 rounded-3xl flex flex-col overflow-hidden transition-shadow duration-300"
        style={{
          border: `1.5px solid ${color.value ? color.border + "99" : "var(--border-md)"}`,
          boxShadow: cardShadow,
        }}
      >
        {/* Toolbar — wraps on narrow screens so nothing gets clipped at the right edge */}
        <div
          className="flex flex-wrap items-center gap-1.5 px-2.5 sm:px-3 py-2 border-b flex-shrink-0"
          style={{
            borderColor: "var(--border)",
            background: color.value ? `${color.bg}28` : undefined,
          }}
        >
          {/* Color picker button */}
          <button
            ref={colorPickerRef}
            onClick={() => setShowColorPicker((o) => !o)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-[var(--hover)]"
            title="Barva poznámky"
          >
            {note.color ? (
              <span
                className="w-4 h-4 rounded-full border-[1.5px]"
                style={{ background: color.bg, borderColor: color.border }}
              />
            ) : (
              <Palette className="w-4 h-4" style={{ color: "var(--text-3)" }} />
            )}
          </button>

          <DropdownPortal
            triggerRef={colorPickerRef}
            open={showColorPicker}
            onClose={() => setShowColorPicker(false)}
            className="p-3 rounded-2xl glass-strong border animate-scale-in"
            style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)", minWidth: 230 }}
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-widest mb-2.5"
              style={{ color: "var(--text-3)" }}>
              Barva poznámky
            </p>
            <div className="flex items-center gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => setNoteColor(c.value)}
                  className="w-8 h-8 rounded-full transition-all hover:scale-110 flex items-center justify-center flex-shrink-0"
                  style={{
                    background: c.bg === "var(--bg-card)" ? "var(--bg-subtle)" : c.bg,
                    border: note.color === c.value
                      ? `2.5px solid var(--accent)`
                      : `2px solid ${c.border}`,
                    boxShadow: note.color === c.value ? `0 0 0 2px var(--accent)44` : undefined,
                  }}
                  title={c.label}
                >
                  {note.color === c.value && (
                    <Check className="w-3.5 h-3.5" style={{ color: c.value ? "#000" : "var(--text-2)" }} />
                  )}
                  {!note.color && c.value === null && (
                    <Check className="w-3.5 h-3.5" style={{ color: "var(--text-2)" }} />
                  )}
                </button>
              ))}
            </div>
          </DropdownPortal>

          {/* Save indicator */}
          {(saving || saved) && (
            <span className="text-[11px] px-1.5 order-2 sm:order-none" style={{ color: saved ? "#22C55E" : "var(--text-3)" }}>
              {saving ? "Ukládám…" : "✓ Uloženo"}
            </span>
          )}

          {/* Right cluster — pushed right; wraps to its own line on mobile as one block */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Visibility toggle — icon-only on mobile to save width */}
            <div className="flex items-center rounded-xl overflow-hidden border"
              style={{ borderColor: "var(--border-md)" }}>
              <button
                onClick={() => setVisibility("private")}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-[11.5px] font-medium transition-all"
                title="Soukromá"
                style={note.visibility === "private"
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "transparent", color: "var(--text-3)" }}
              >
                <Lock className="w-3 h-3" /> <span className="hidden sm:inline">Soukromá</span>
              </button>
              <button
                onClick={() => setVisibility("team")}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-[11.5px] font-medium transition-all"
                title="Tým"
                style={note.visibility === "team"
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "transparent", color: "var(--text-3)" }}
              >
                <Globe className="w-3 h-3" /> <span className="hidden sm:inline">Tým</span>
              </button>
            </div>

            {/* Action icon buttons */}
            <div className="flex items-center gap-0.5">
            <button
              onClick={togglePin}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--hover)]"
              title={note.pinned ? "Odepnout" : "Připnout"}
              style={{ color: note.pinned ? "var(--accent)" : "var(--text-3)" }}
            >
              {note.pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--hover)]"
              title="Sdílet v chatu"
              style={{ color: "var(--text-3)" }}
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTaskOpen(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--hover)]"
              title="Vytvořit úkol"
              style={{ color: "var(--text-3)" }}
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEventOpen(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--hover)]"
              title="Vytvořit událost"
              style={{ color: "var(--text-3)" }}
            >
              <CalendarPlus className="w-4 h-4" />
            </button>
            {isOwner && (
              <button
                onClick={() => { if (confirm("Smazat tuto poznámku?")) onDelete(); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--danger-soft)]"
                style={{ color: "var(--text-3)" }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            </div>
          </div>
        </div>

        {/* Editor body — transparent, glass card provides the background */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 py-5 sm:py-6 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Název poznámky"
            className="w-full text-[26px] font-bold bg-transparent outline-none"
            style={{ color: "var(--text-1)" }}
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Začni psát…"
            className="w-full bg-transparent outline-none resize-none text-[15px] leading-[1.75] min-h-[400px]"
            style={{ color: "var(--text-2)" }}
          />
        </div>

        {/* Collaborators footer */}
        <div
          className="flex-shrink-0 border-t px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11.5px] font-semibold" style={{ color: "var(--text-3)" }}>
              Spolupracovníci:
            </span>
            {collabs.map((c) => (
              <div key={c.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border"
                style={{ background: "var(--bg-subtle)", color: "var(--text-1)", borderColor: "var(--border)" }}>
                <Avatar name={c.name} src={c.avatar} size="sm" />
                <span>{c.name}</span>
                {isOwner && (
                  <button onClick={() => removeCollaborator(c.id)} className="ml-0.5 hover:opacity-70"
                    style={{ color: "var(--text-3)" }}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {isOwner && (
              <>
                <button
                  ref={collabBtnRef}
                  onClick={() => setShowCollabPicker((o) => !o)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all hover:border-[var(--accent)]"
                  style={{ borderColor: "var(--border-md)", color: "var(--text-2)" }}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Přizvat
                </button>
                <DropdownPortal
                  triggerRef={collabBtnRef}
                  open={showCollabPicker}
                  onClose={() => setShowCollabPicker(false)}
                  anchor="top"
                  className="w-56 rounded-2xl border overflow-hidden glass-strong animate-scale-in"
                  style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)" }}
                >
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
                      <p className="text-[12px] px-3 py-2 text-center" style={{ color: "var(--text-3)" }}>
                        Nikdo nenalezen
                      </p>
                    ) : filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => addCollaborator(u.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-[var(--hover)] text-left"
                      >
                        <Avatar name={u.name} src={u.avatar} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                            {u.name}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </DropdownPortal>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Share modal — public link + collaborators + chat */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Sdílet poznámku">
        <div className="pt-1">
          <ShareSheet resourceType="note" resourceId={note.id} chatMessage={chatMessage} />
        </div>
      </Modal>

      {/* Create task modal — real TaskForm pre-filled from the note */}
      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="Vytvořit úkol z poznámky">
        <TaskForm
          initialValues={{ title: note.title, description: note.content }}
          onCancel={() => setTaskOpen(false)}
          onSuccess={(t) => { setTaskOpen(false); router.push(`/tasks/${t.id}`); }}
        />
      </Modal>

      {/* Create event modal — real EventForm pre-filled from the note */}
      <Modal open={eventOpen} onClose={() => setEventOpen(false)} title="Vytvořit událost z poznámky">
        <EventForm
          initialValues={{ title: note.title, description: note.content }}
          canUseTeam={canUseTeam}
          onClose={() => setEventOpen(false)}
          onSaved={() => { setEventOpen(false); router.push("/calendar"); }}
        />
      </Modal>
    </div>
  );
}

/* ─── Notes content ──────────────────────────────────────────────────── */

function NotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Deep-link to a specific note via /notes?note=<id> (e.g. from global search)
  useEffect(() => {
    const noteId = searchParams.get("note");
    if (noteId) {
      setActiveId(noteId);
      router.replace("/notes");
    }
  }, [searchParams, router]);

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
    <div className="flex flex-col h-[calc(100vh-6rem)] lg:h-screen">
      <Header
        title="Poznámky"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={createNote}>
            Nová poznámka
          </Button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Note list sidebar — full width on mobile, fixed sidebar on desktop.
            On mobile it hides once a note is open (master-detail pattern). */}
        <div className={`${activeId ? "hidden lg:flex" : "flex"} w-full lg:w-[272px] flex-shrink-0 border-r flex-col overflow-hidden`}
          style={{ borderColor: "var(--border)", background: "var(--bg-page)" }}>

          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", boxShadow: "var(--shadow-sm)" }}>
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

          <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2">
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
              <div className="space-y-1.5 pt-1">
                {pinned.length > 0 && (
                  <>
                    <p className="px-1 pt-1 pb-0.5 text-[10.5px] font-semibold uppercase tracking-wider"
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
                      <p className="px-1 pt-2 pb-0.5 text-[10.5px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-3)" }}>
                        Ostatní
                      </p>
                    )}
                    {rest.map((n) => (
                      <NoteListItem key={n.id} note={n} active={n.id === activeId} onClick={() => setActiveId(n.id)} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Editor pane — no overflow-hidden so the card shadow can breathe.
            On mobile it only appears once a note is selected. */}
        <div className={`${activeId ? "flex" : "hidden lg:flex"} flex-1 min-h-0 flex-col`}>
          {activeNote ? (
            <>
              {/* Mobile-only back bar to return to the note list */}
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold flex-shrink-0"
                style={{ color: "var(--text-2)" }}
              >
                <ChevronLeft className="w-4 h-4" />
                Zpět na poznámky
              </button>
              <div className="flex-1 min-h-0">
                <NoteEditor
                  key={activeNote.id}
                  note={activeNote}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onRefresh={() => loadNote(activeId!)}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)" }}>
                <BookOpen className="w-7 h-7" style={{ color: "var(--text-3)" }} />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>
                  Vyber nebo vytvoř poznámku
                </p>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
                  Tvoje myšlenky, nápady a plány na jednom místě
                </p>
              </div>
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
