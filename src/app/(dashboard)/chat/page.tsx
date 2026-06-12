"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { MessageContent } from "@/components/chat/MessageContent";
import { MentionInput, type MentionInputHandle } from "@/components/chat/MentionInput";
import { ScrollFadeX } from "@/components/ui/ScrollFadeX";
import { Send, MessageSquare, Users, CheckSquare, User, Paperclip } from "lucide-react";
import type { Task } from "@/types";
import { STATUS_COLORS } from "@/types";

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  recipientId?: string | null;
  user?: { id: string; name: string; avatar?: string | null };
  recipient?: { id: string; name: string; avatar?: string | null };
}

interface Member {
  id: string;
  name: string;
  avatar?: string | null;
}

interface TeamFile {
  id: string;
  name: string;
  type: string;
  url: string;
  mimeType?: string | null;
}

type MentionResult =
  | { kind: "task"; id: string; title: string; status: string; category?: { name: string; color: string } | null }
  | { kind: "user"; id: string; name: string; avatar?: string | null }
  | { kind: "file"; id: string; name: string; mimeType?: string | null };

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(d: string) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Dnes";
  if (date.toDateString() === yesterday.toDateString()) return "Včera";
  return date.toLocaleDateString("cs-CZ", { day: "numeric", month: "long" });
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeDM, setActiveDM] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MentionInputHandle>(null);
  const lastTimestamp = useRef<string | null>(null);
  const myId = session?.user?.id;
  const [bgUnread, setBgUnread] = useState(0);

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    try { localStorage.setItem("chatLastVisit", new Date().toISOString()); } catch {}
  }, []);

  // Reset unread badge when tab becomes visible
  useEffect(() => {
    const handle = () => { if (!document.hidden) setBgUnread(0); };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, []);

  // Update document.title with unread count
  useEffect(() => {
    const base = "Tymbr";
    document.title = bgUnread > 0 ? `(${bgUnread}) Chat – ${base}` : `Chat – ${base}`;
    return () => { document.title = base; };
  }, [bgUnread]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setMembers(d.filter((m: Member) => m.id !== myId));
    });
    fetch("/api/tasks").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setTasks(d);
    });
    fetch("/api/files").then((r) => r.json()).then((d) => {
      if (d?.files && Array.isArray(d.files)) setFiles(d.files);
    });
  }, [myId]);

  const tasksById = useMemo(() => {
    const m: Record<string, Task> = {};
    for (const t of tasks) m[t.id] = t;
    return m;
  }, [tasks]);

  // Unified mention results: tasks + users + files
  const mentionResults = useMemo((): MentionResult[] => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const result: MentionResult[] = [];

    const matchedTasks = tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.status === "done" && b.status !== "done") return 1;
        if (b.status === "done" && a.status !== "done") return -1;
        return a.title.localeCompare(b.title, "cs");
      })
      .slice(0, 4);
    for (const t of matchedTasks) {
      result.push({ kind: "task", id: t.id, title: t.title, status: t.status, category: t.category });
    }

    const matchedUsers = members
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 3);
    for (const u of matchedUsers) {
      result.push({ kind: "user", id: u.id, name: u.name, avatar: u.avatar });
    }

    const matchedFiles = files
      .filter((f) => f.name.toLowerCase().includes(q))
      .slice(0, 3);
    for (const f of matchedFiles) {
      result.push({ kind: "file", id: f.id, name: f.name, mimeType: f.mimeType });
    }

    return result;
  }, [tasks, members, files, mentionQuery]);

  const selectMention = useCallback((item: MentionResult) => {
    if (!inputRef.current) return;
    if (item.kind === "task") inputRef.current.insertMention("task", item.id, item.title);
    else if (item.kind === "user") inputRef.current.insertMention("user", item.id, item.name);
    else if (item.kind === "file") inputRef.current.insertMention("file", item.id, item.name);
    setMentionQuery(null);
    setMentionIdx(0);
  }, []);

  const loadMessages = useCallback(async (recipientId: string | null) => {
    setLoading(true);
    setMessages([]);
    lastTimestamp.current = null;
    const params = new URLSearchParams();
    if (recipientId) params.set("recipientId", recipientId);
    const res = await fetch(`/api/chat?${params}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setMessages(list);
    if (list.length > 0) lastTimestamp.current = list[list.length - 1].createdAt;
    setLoading(false);
    setTimeout(scrollToBottom, 50);
  }, []);

  const poll = useCallback(async () => {
    if (!lastTimestamp.current) return;
    const params = new URLSearchParams({ since: lastTimestamp.current });
    if (activeDM) params.set("recipientId", activeDM);
    const res = await fetch(`/api/chat?${params}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    if (list.length > 0) {
      let freshCount = 0;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = list.filter((m: ChatMessage) => !existingIds.has(m.id));
        freshCount = fresh.length;
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
      // Badge: count messages from others when tab is in background
      if (document.hidden && freshCount > 0) {
        const fromOthers = list.filter((m: ChatMessage) => m.userId !== myId).length;
        if (fromOthers > 0) setBgUnread((u) => u + fromOthers);
      }
      lastTimestamp.current = list[list.length - 1].createdAt;
      setTimeout(scrollToBottom, 50);
      try { localStorage.setItem("chatLastVisit", new Date().toISOString()); } catch {}
    }
  }, [activeDM, myId]);

  useEffect(() => { loadMessages(activeDM); }, [activeDM, loadMessages]);
  useEffect(() => {
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [poll]);

  const handleQueryChange = (q: string | null) => {
    setMentionQuery(q);
    setMentionIdx(0);
  };

  const handleKeyDownPicker = (e: React.KeyboardEvent) => {
    if (mentionQuery === null || mentionResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIdx((i) => Math.min(i + 1, mentionResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectMention(mentionResults[mentionIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionQuery(null);
    }
  };

  const send = async () => {
    if (!inputRef.current) return;
    const content = inputRef.current.serialize().trim();
    if (!content || sending) return;
    setSending(true);
    inputRef.current.clear();
    setHasContent(false);
    setMentionQuery(null);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, recipientId: activeDM }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      lastTimestamp.current = msg.createdAt;
      setTimeout(scrollToBottom, 50);
      try { localStorage.setItem("chatLastVisit", new Date().toISOString()); } catch {}
    }
    setSending(false);
  };

  const activeMember = members.find((m) => m.id === activeDM);

  let lastDay = "";

  const kindIcon = (kind: MentionResult["kind"]) => {
    if (kind === "task") return <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />;
    if (kind === "user") return <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6366f1" }} />;
    return <Paperclip className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#0ea5e9" }} />;
  };

  const kindLabel = (kind: MentionResult["kind"]) => {
    if (kind === "task") return "Úkoly";
    if (kind === "user") return "Lidé";
    return "Soubory";
  };

  // Group results by kind for section headers
  const grouped = useMemo(() => {
    const seen = new Set<string>();
    return mentionResults.map((item, i) => ({ item, i, firstOfKind: !seen.has(item.kind) && (seen.add(item.kind), true) }));
  }, [mentionResults]);

  return (
    <div>
      <Header
        title={activeDM ? `Chat s ${activeMember?.name ?? ""}` : "Týmový chat"}
        subtitle={activeDM ? "Přímá zpráva" : "Komunikace s celým týmem"}
      />

      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        {members.length > 0 && (
          <div className="lg:hidden pb-3">
            <ScrollFadeX className="flex items-center gap-2 pb-0.5" fadeColor="var(--bg-page)">
              <button
                onClick={() => setActiveDM(null)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-all active:scale-95"
                style={!activeDM
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "var(--bg-card)", color: "var(--text-2)", border: "1px solid var(--border-md)" }}>
                <Users className="w-4 h-4" />
                <span className="text-[13px] font-semibold">Tým</span>
              </button>
              {members.map((m) => (
                <button key={m.id}
                  onClick={() => setActiveDM(m.id)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl flex-shrink-0 transition-all active:scale-95"
                  style={activeDM === m.id
                    ? { background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent)" }
                    : { background: "var(--bg-card)", color: "var(--text-2)", border: "1px solid var(--border-md)" }}>
                  <Avatar name={m.name} src={m.avatar} size="xs" />
                  <span className="text-[13px] font-medium">{m.name.split(" ")[0]}</span>
                </button>
              ))}
            </ScrollFadeX>
          </div>
        )}

        <div className="flex gap-4 h-[calc(100dvh-220px)] lg:h-[calc(100vh-180px)]">
          {/* Sidebar desktop */}
          {members.length > 0 && (
            <div className="hidden lg:flex w-[200px] flex-shrink-0 rounded-3xl border overflow-hidden flex-col"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="px-4 pt-4 pb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Kanály</p>
              </div>
              <div className="overflow-y-auto flex-1">
                <button
                  onClick={() => setActiveDM(null)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-all active:scale-[0.98]"
                  style={!activeDM ? { background: "var(--accent-soft)", color: "var(--accent)" } : { color: "var(--text-2)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: !activeDM ? "var(--accent)" : "var(--bg-subtle)" }}>
                    <Users className="w-3.5 h-3.5" style={{ color: !activeDM ? "#fff" : "var(--text-3)" }} />
                  </div>
                  <span className="text-[13px] font-semibold truncate">Tým</span>
                </button>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Přímé zprávy</p>
                </div>
                {members.map((m) => (
                  <button key={m.id}
                    onClick={() => setActiveDM(m.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 transition-all active:scale-[0.98]"
                    style={activeDM === m.id
                      ? { background: "var(--accent-soft)", color: "var(--accent)" }
                      : { color: "var(--text-2)" }}>
                    <Avatar name={m.name} src={m.avatar} size="sm" />
                    <span className="text-[13px] font-medium truncate">{m.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat area */}
          <div className="flex-1 flex flex-col rounded-3xl border overflow-hidden"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
                    style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full" style={{ color: "var(--text-3)" }}>
                  <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>Zatím žádné zprávy</p>
                  <p className="text-[13px] mt-1">
                    {activeDM ? `Napiš ${activeMember?.name?.split(" ")[0] ?? ""}` : "Napiš první zprávu svému týmu"}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.userId === myId;
                  const day = formatDay(msg.createdAt);
                  const showDay = day !== lastDay;
                  lastDay = day;
                  return (
                    <div key={msg.id} className="animate-chat-in">
                      {showDay && (
                        <div className="flex items-center justify-center my-4">
                          <span className="text-[11px] font-semibold px-3 py-1 rounded-full"
                            style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>
                            {day}
                          </span>
                        </div>
                      )}
                      <div className={`flex items-end gap-2.5 mb-2 ${isMe ? "flex-row-reverse" : ""}`}>
                        {!isMe && <Avatar name={msg.user?.name ?? "?"} src={msg.user?.avatar} size="sm" />}
                        <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                          {!isMe && (
                            <span className="text-[11.5px] font-semibold mb-1 px-1" style={{ color: "var(--text-3)" }}>
                              {msg.user?.name}
                            </span>
                          )}
                          <div className="px-3.5 py-2.5 rounded-2xl"
                            style={isMe
                              ? { background: "var(--accent)", color: "#fff", borderBottomRightRadius: "4px" }
                              : { background: "var(--bg-subtle)", color: "var(--text-1)", borderBottomLeftRadius: "4px" }}>
                            <MessageContent content={msg.content} tasksById={tasksById} textColor={isMe ? "#fff" : undefined} />
                          </div>
                          <span className="text-[10.5px] mt-1 px-1" style={{ color: "var(--text-3)" }}>
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t relative" style={{ borderColor: "var(--border)" }} onKeyDown={handleKeyDownPicker}>
              {/* Unified @ mention picker */}
              {mentionQuery !== null && (
                <div
                  className="absolute bottom-full left-4 right-4 mb-1 rounded-2xl border overflow-hidden z-20"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-md)",
                    boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
                  }}
                >
                  {mentionResults.length === 0 ? (
                    <div className="px-4 py-3 text-[13px]" style={{ color: "var(--text-3)" }}>
                      Nic nenalezeno…
                    </div>
                  ) : (
                    <>
                      {grouped.map(({ item, i, firstOfKind }) => (
                        <div key={`${item.kind}-${item.id}`}>
                          {firstOfKind && (
                            <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
                              {kindIcon(item.kind)}
                              <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                                {kindLabel(item.kind)}
                              </p>
                            </div>
                          )}
                          <button
                            onMouseDown={(e) => { e.preventDefault(); selectMention(item); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                            style={i === mentionIdx ? { background: "var(--accent-soft)" } : { background: "transparent" }}
                          >
                            {item.kind === "task" && (
                              <>
                                <span className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: (STATUS_COLORS as Record<string, string>)[item.status] ?? "#9a9aa2" }} />
                                <span className="text-[13px] font-medium flex-1 truncate" style={{ color: "var(--text-1)" }}>
                                  {item.title}
                                </span>
                                {item.category && (
                                  <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-3)" }}>
                                    {item.category.name}
                                  </span>
                                )}
                              </>
                            )}
                            {item.kind === "user" && (
                              <>
                                <Avatar name={item.name} src={item.avatar} size="xs" />
                                <span className="text-[13px] font-medium flex-1 truncate" style={{ color: "var(--text-1)" }}>
                                  {item.name}
                                </span>
                              </>
                            )}
                            {item.kind === "file" && (
                              <>
                                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                                <span className="text-[13px] font-medium flex-1 truncate" style={{ color: "var(--text-1)" }}>
                                  {item.name}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                      <div className="px-3 py-1.5 border-t" style={{ borderColor: "var(--border)" }}>
                        <p className="text-[10.5px]" style={{ color: "var(--text-3)" }}>
                          ↑↓ navigovat · Enter vybrat · Esc zavřít
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 p-4">
                <MentionInput
                  ref={inputRef}
                  placeholder={activeDM
                    ? `Zpráva pro ${activeMember?.name?.split(" ")[0] ?? ""}… (@ pro úkol, osobu nebo soubor)`
                    : "Napiš zprávu týmu… (@ pro úkol, osobu nebo soubor)"}
                  onQueryChange={handleQueryChange}
                  onHasContentChange={setHasContent}
                  onSubmit={send}
                  disabled={sending}
                />
                <button
                  onClick={send}
                  disabled={!hasContent || sending}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                  style={{ background: "var(--accent)" }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
