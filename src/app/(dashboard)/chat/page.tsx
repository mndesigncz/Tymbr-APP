"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Send, MessageSquare, Users, CheckSquare, AtSign } from "lucide-react";
import { MessageContent } from "@/components/chat/MessageContent";
import type { Task } from "@/types";

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

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeDM, setActiveDM] = useState<string | null>(null); // null = team chat
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTimestamp = useRef<string | null>(null);
  const myId = session?.user?.id;

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setMembers(d.filter((m: Member) => m.id !== myId));
    });
  }, [myId]);

  // Load team tasks once — used both to render embedded cards and to power @-mentions.
  useEffect(() => {
    fetch("/api/tasks").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setTasks(d);
    });
  }, []);

  const tasksById = useMemo(() => {
    const map: Record<string, Task> = {};
    for (const t of tasks) map[t.id] = t;
    return map;
  }, [tasks]);

  // Tasks matching the current @-mention query (max 6, open tasks first).
  const mentionResults = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .sort((a, b) => Number(a.status === "done") - Number(b.status === "done"))
      .slice(0, 6);
  }, [mention, tasks]);

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
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = list.filter((m: ChatMessage) => !existingIds.has(m.id));
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
      lastTimestamp.current = list[list.length - 1].createdAt;
      setTimeout(scrollToBottom, 50);
    }
  }, [activeDM]);

  useEffect(() => { loadMessages(activeDM); }, [activeDM, loadMessages]);

  useEffect(() => {
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [poll]);

  // Detect an active "@query" token ending at the caret to drive the task picker.
  const detectMention = (value: string, caret: number) => {
    const upToCaret = value.slice(0, caret);
    const m = upToCaret.match(/@(\S*)$/);
    if (m) {
      setMention({ query: m[1], start: caret - m[0].length });
      setMentionIndex(0);
    } else {
      setMention(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
  };

  const selectMentionTask = (task: Task) => {
    if (!mention) return;
    const before = input.slice(0, mention.start);
    const after = input.slice(mention.start + mention.query.length + 1); // +1 for '@'
    const next = `${before}[[task:${task.id}]] ${after.replace(/^\s/, "")}`;
    setInput(next);
    setMention(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mention && mentionResults.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionResults.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectMentionTask(mentionResults[mentionIndex]); return; }
      if (e.key === "Escape") { e.preventDefault(); setMention(null); return; }
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setMention(null);
    setSending(true);
    const content = input.trim();
    setInput("");
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

      <div className="px-6 lg:px-8 pb-6">
        <div className="flex gap-4 h-[calc(100vh-180px)]">
          {/* Sidebar: channels */}
          {members.length > 0 && (
            <div className="w-[200px] flex-shrink-0 rounded-3xl border overflow-hidden flex flex-col"
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
                              textColor={isMe ? "#fff" : "var(--text-1)"}
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

            {/* Input */}
            <form onSubmit={send} className="relative flex items-center gap-3 p-4 border-t" style={{ borderColor: "var(--border)" }}>
              {/* @-mention task picker */}
              {mention && mentionResults.length > 0 && (
                <div
                  className="absolute bottom-full left-4 mb-2 w-[340px] max-w-[calc(100%-2rem)] rounded-2xl border overflow-hidden z-20"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,0.12))" }}
                >
                  <div className="px-3 py-2 flex items-center gap-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                    <AtSign className="w-3 h-3" style={{ color: "var(--text-3)" }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Odkázat úkol</span>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto py-1">
                    {mentionResults.map((t, i) => (
                      <button
                        key={t.id}
                        type="button"
                        onMouseEnter={() => setMentionIndex(i)}
                        onClick={() => selectMentionTask(t)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                        style={i === mentionIndex ? { background: "var(--accent-soft)" } : undefined}
                      >
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: t.category ? `${t.category.color}1a` : "var(--bg-subtle)" }}>
                          <CheckSquare className="w-3 h-3" style={{ color: t.category?.color ?? "var(--text-3)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium line-clamp-1" style={{ color: "var(--text-1)" }}>{t.title}</p>
                          {t.category && <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{t.category.name}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={activeDM ? `Zpráva pro ${activeMember?.name?.split(" ")[0] ?? ""}... (napiš @ pro úkol)` : "Napiš zprávu týmu... (napiš @ pro úkol)"}
                className="flex-1 text-[14px] px-4 py-3 rounded-2xl outline-none"
                style={{ background: "var(--bg-subtle)", color: "var(--text-1)" }}
              />
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
  );
}
