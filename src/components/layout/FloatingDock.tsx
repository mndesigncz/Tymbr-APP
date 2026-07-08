"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import {
  MessageSquare, X, StickyNote, ChevronLeft, Send, Users, Plus, Trash2,
} from "lucide-react";

// Only for landscape tablets and desktops — never on phones / portrait tablets.
function useWideLandscape(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px), (min-width: 768px) and (orientation: landscape)");
    const on = () => setOk(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return ok;
}

interface Member { id: string; name: string; avatar?: string | null }
interface Msg {
  id: string; content: string; createdAt: string; userId: string;
  user?: { id: string; name: string; avatar?: string | null };
}
interface Note { id: string; title: string; content: string; updatedAt: string }

function timeOf(d: string) {
  return new Date(d).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

export function FloatingDock() {
  const wide = useWideLandscape();
  const { data: session } = useSession();
  const myId = session?.user?.id;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chats" | "notes">("chats");

  if (!wide || !session?.user) return null;

  return (
    <>
      {open && (
        <div
          className="fixed z-40 bottom-24 right-6 w-[370px] rounded-3xl overflow-hidden flex flex-col glass-strong border animate-scale-in"
          style={{ height: "min(560px, calc(100vh - 8rem))", borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)" }}
        >
          {view === "chats"
            ? <ChatsPanel myId={myId} onNewNote={() => setView("notes")} onClose={() => setOpen(false)} />
            : <NotesPanel onBack={() => setView("chats")} onClose={() => setOpen(false)} />}
        </div>
      )}

      {/* Bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat a poznámky"
        className="fixed z-40 bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
        style={{ background: "var(--accent)", boxShadow: "0 8px 24px rgba(247,89,47,0.4)" }}
      >
        {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </>
  );
}

/* ── Chats ─────────────────────────────────────────────────────────────── */

function ChatsPanel({ myId, onNewNote, onClose }: { myId?: string; onNewNote: () => void; onClose: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  // "list" = conversation picker, "team" = team chat, otherwise a user id (DM)
  const [conv, setConv] = useState<"list" | "team" | string>("list");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setMembers(d.filter((m: Member) => m.id !== myId));
    }).catch(() => {});
  }, [myId]);

  const load = useCallback(async () => {
    if (conv === "list") return;
    const q = conv === "team" ? "" : `?recipientId=${conv}`;
    try {
      const r = await fetch(`/api/chat${q}`);
      const d = await r.json();
      if (Array.isArray(d)) setMessages(d);
    } catch {}
  }, [conv]);

  useEffect(() => {
    if (conv === "list") { setMessages([]); return; }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [conv, load]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: body, recipientId: conv === "team" ? null : conv }),
      });
      await load();
    } catch {} finally { setSending(false); }
  };

  const convName = conv === "team" ? "Tým" : members.find((m) => m.id === conv)?.name ?? "Chat";

  return (
    <>
      <DockHeader
        title={conv === "list" ? "Chaty" : convName}
        onBack={conv === "list" ? undefined : () => setConv("list")}
        onNewNote={onNewNote}
        onClose={onClose}
      />

      {conv === "list" ? (
        <div className="flex-1 overflow-y-auto p-2">
          <button onClick={() => setConv("team")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors hover:bg-[var(--hover)] text-left">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-soft)" }}>
              <Users className="w-4 h-4" style={{ color: "var(--accent)" }} />
            </div>
            <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>Týmový chat</span>
          </button>
          {members.length > 0 && (
            <p className="text-[10.5px] font-semibold uppercase tracking-wide px-3 pt-3 pb-1" style={{ color: "var(--text-3)" }}>
              Přímé zprávy
            </p>
          )}
          {members.map((m) => (
            <button key={m.id} onClick={() => setConv(m.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-colors hover:bg-[var(--hover)] text-left">
              <Avatar name={m.name} src={m.avatar} size="sm" />
              <span className="text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>{m.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.length === 0 ? (
              <p className="text-[12.5px] text-center py-8" style={{ color: "var(--text-3)" }}>Zatím žádné zprávy</p>
            ) : messages.map((m) => {
              const mine = m.userId === myId;
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {!mine && <Avatar name={m.user?.name ?? "?"} src={m.user?.avatar} size="xs" />}
                  <div className={`max-w-[75%] px-3 py-1.5 rounded-2xl ${mine ? "rounded-br-md" : "rounded-bl-md"}`}
                    style={{ background: mine ? "var(--accent)" : "var(--bg-subtle)", color: mine ? "#fff" : "var(--text-1)" }}>
                    <p className="text-[12.5px] leading-snug whitespace-pre-wrap break-words">{m.content}</p>
                    <p className="text-[9.5px] mt-0.5 opacity-60">{timeOf(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="p-2 border-t flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Napiš zprávu…"
              className="flex-1 text-[13px] px-3 py-2 rounded-xl outline-none border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}
            />
            <button onClick={send} disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
              style={{ background: "var(--accent)" }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ── Notes ─────────────────────────────────────────────────────────────── */

function NotesPanel({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      const r = await fetch("/api/notes");
      const d = await r.json();
      if (Array.isArray(d)) setNotes(d);
    } catch {}
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const openNote = (n: Note) => { setActive(n); setTitle(n.title); setContent(n.content); };

  const newNote = async () => {
    try {
      const r = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", content: "", visibility: "private" }),
      });
      if (r.ok) { const n = await r.json(); openNote(n); loadNotes(); }
    } catch {}
  };

  // Debounced autosave while editing.
  useEffect(() => {
    if (!active) return;
    if (title === active.title && content === active.content) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/notes/${active.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        setActive((a) => (a ? { ...a, title, content } : a));
        loadNotes();
      } catch {}
    }, 700);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  const removeNote = async (id: string) => {
    try { await fetch(`/api/notes/${id}`, { method: "DELETE" }); } catch {}
    if (active?.id === id) setActive(null);
    loadNotes();
  };

  return (
    <>
      <DockHeader
        title={active ? "Poznámka" : "Poznámky"}
        onBack={active ? () => setActive(null) : onBack}
        onClose={onClose}
        right={
          <button onClick={newNote} title="Nová poznámka"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-semibold"
            style={{ color: "var(--accent)" }}>
            <Plus className="w-3.5 h-3.5" /> Nová
          </button>
        }
      />

      {active ? (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
          style={{ background: "#fef9c3" }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Název"
            className="w-full text-[15px] font-bold bg-transparent outline-none"
            style={{ color: "#3a3320" }}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Rychlá poznámka…"
            className="flex-1 w-full bg-transparent outline-none resize-none text-[13px] leading-relaxed"
            style={{ color: "#4a4326" }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          <button onClick={newNote}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-2 rounded-2xl text-[13px] font-semibold text-white"
            style={{ background: "var(--accent)" }}>
            <StickyNote className="w-4 h-4" /> Nová poznámka
          </button>
          {notes.length === 0 ? (
            <p className="text-[12.5px] text-center py-8" style={{ color: "var(--text-3)" }}>Zatím žádné poznámky</p>
          ) : notes.map((n) => (
            <div key={n.id} className="group flex items-center gap-1">
              <button onClick={() => openNote(n)}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl text-left transition-colors hover:bg-[var(--hover)]">
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                  {n.title || "Bez názvu"}
                </p>
                <p className="text-[11.5px] truncate" style={{ color: "var(--text-3)" }}>
                  {n.content.replace(/\n+/g, " ").slice(0, 60) || "Prázdná"}
                </p>
              </button>
              <button onClick={() => removeNote(n.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--danger-soft)] flex-shrink-0"
                style={{ color: "var(--text-3)" }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── shared header ─────────────────────────────────────────────────────── */

function DockHeader({
  title, onBack, onNewNote, onClose, right,
}: {
  title: string;
  onBack?: () => void;
  onNewNote?: () => void;
  onClose: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
      {onBack && (
        <button onClick={onBack} className="p-1 rounded-lg hover:bg-[var(--hover)]" style={{ color: "var(--text-2)" }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <span className="text-[14px] font-bold flex-1 truncate" style={{ color: "var(--text-1)" }}>{title}</span>
      {right}
      {onNewNote && (
        <button onClick={onNewNote} title="Nová poznámka"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-semibold" style={{ color: "var(--accent)" }}>
          <StickyNote className="w-3.5 h-3.5" /> Poznámka
        </button>
      )}
      <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--hover)]" style={{ color: "var(--text-3)" }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
