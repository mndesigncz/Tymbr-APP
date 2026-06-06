"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { MessageContent } from "@/components/chat/MessageContent";
import { ScrollFadeX } from "@/components/ui/ScrollFadeX";
import { Send, MessageSquare, Users } from "lucide-react";
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

function detectMention(text: string, cursorPos: number): { query: string; start: number } | null {
  const before = text.slice(0, cursorPos);
  const match = /@([^\s@]*)$/.exec(before);
  if (!match) return null;
  return { query: match[1], start: match.index };
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeDM, setActiveDM] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTimestamp = useRef<string | null>(null);
  const myId = session?.user?.id;
  const [bgUnread, setBgUnread] = useState(0);

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" });

  // Mark chat as visited for unread tracking
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
  }, [myId]);

  const tasksById = useMemo(() => {
    const m: Record<string, Task> = {};
    for (const t of tasks) m[t.id] = t;
    return m;
  }, [tasks]);

  const mentionResults = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.status === "done" && b.status !== "done") return 1;
        if (b.status === "done" && a.status !== "done") return -1;
        return a.title.localeCompare(b.title, "cs");
      })
      .slice(0, 6);
  }, [tasks, mention]);

  const selectMentionTask = useCallback((task: Task) => {
    if (!mention) return;
    const before = input.slice(0, mention.start);
    const after = input.slice(mention.start + 1 + mention.query.length);
    setInput(before + `[[task:${task.id}]]` + after);
    setMention(null);
    setMentionIdx(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [mention, input]);

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
      // Update last-visit so unread indicator doesn't trigger for current conversation
      try { localStorage.setItem("chatLastVisit", new Date().toISOString()); } catch {}
    }
  }, [activeDM, myId]);

  useEffect(() => { loadMessages(activeDM); }, [activeDM, loadMessages]);

  useEffect(() => {
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [poll]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const cursor = e.target.selectionStart ?? val.length;
    const m = detectMention(val, cursor);
    setMention(m);
    setMentionIdx(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mention && mentionResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => Math.min(i + 1, mentionResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMentionTask(mentionResults[mentionIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(e as unknown as React.FormEvent);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    setMention(null);
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

  return (
    <div>
      <Header
        title={activeDM ? `Chat s ${activeMember?.name ?? ""}` : "Týmový chat"}
        subtitle={activeDM ? "Přímá zpráva" : "Komunikace s celým týmem"}
      />

      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        {/* Mobile channel selector — horizontally scrollable */}
        {members.length > 0 && (
          <div className="lg:hidden pb-3">
            <ScrollFadeX className="flex items-center gap-2 pb-0.5" fadeColor="var(--bg-page)">
              <button
                onClick={() => setActiveDM(null)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-colors"
                style={!activeDM
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "var(--bg-card)", color: "var(--text-2)", border: "1px solid var(--border-md)" }}>
                <Users className="w-4 h-4" />
                <span className="text-[13px] font-semibold">Tým</span>
              </button>
              {members.map((m) => (
                <button key={m.id}
                  onClick={() => setActiveDM(m.id)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl flex-shrink-0 transition-colors"
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
          {/* Sidebar: channels — desktop only */}
          {members.length > 0 && (
            <div className="hidden lg:flex w-[200px] flex-shrink-0 rounded-3xl border overflow-hidden flex-col"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div className="px-4 pt-4 pb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Kanály</p>
              </div>
              <div className="overflow-y-auto flex-1">
                <button
                  onClick={() => setActiveDM(null)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors"
                  style={!activeDM
                    ? { background: "var(--accent-soft)", color: "var(--accent)" }
                    : { color: "var(--text-2)" }}>
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors"
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
                    <div key={msg.id}>
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
                            <MessageContent
                              content={msg.content}
                              tasksById={tasksById}
                              textColor={isMe ? "#fff" : undefined}
                            />
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

            {/* Input with @mention dropdown */}
            <div className="border-t relative" style={{ borderColor: "var(--border)" }}>
              {mention && mentionResults.length > 0 && (
                <div
                  className="absolute bottom-full left-4 right-4 mb-1 rounded-2xl border overflow-hidden z-20"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-md)",
                    boxShadow: "0 -8px 24px rgba(0,0,0,0.1)",
                  }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                      Vložit úkol
                    </p>
                  </div>
                  {mentionResults.map((task, i) => {
                    const color = STATUS_COLORS[task.status] ?? "#9a9aa2";
                    return (
                      <button
                        key={task.id}
                        onMouseDown={(e) => { e.preventDefault(); selectMentionTask(task); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                        style={i === mentionIdx
                          ? { background: "var(--accent-soft)" }
                          : { background: "transparent" }}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-[13px] font-medium flex-1 truncate" style={{ color: "var(--text-1)" }}>
                          {task.title}
                        </span>
                        {task.category && (
                          <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-3)" }}>
                            {task.category.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <div className="px-3 py-1.5 border-t" style={{ borderColor: "var(--border)" }}>
                    <p className="text-[10.5px]" style={{ color: "var(--text-3)" }}>
                      ↑↓ navigovat · Enter vybrat · Esc zavřít
                    </p>
                  </div>
                </div>
              )}
              <form onSubmit={send} className="flex items-center gap-3 p-4">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={activeDM
                      ? `Zpráva pro ${activeMember?.name?.split(" ")[0] ?? ""}... (@ pro úkol)`
                      : "Napiš zprávu týmu... (@ pro úkol)"}
                    className="w-full text-[14px] px-4 py-3 rounded-2xl outline-none"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-1)" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: "var(--accent)" }}>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
