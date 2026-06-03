"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Send, MessageSquare, Users } from "lucide-react";

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
  const endRef = useRef<HTMLDivElement>(null);
  const lastTimestamp = useRef<string | null>(null);
  const myId = session?.user?.id;

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setMembers(d.filter((m: Member) => m.id !== myId));
    });
  }, [myId]);

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

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
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
                            <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
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
            <form onSubmit={send} className="flex items-center gap-3 p-4 border-t" style={{ borderColor: "var(--border)" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeDM ? `Zpráva pro ${activeMember?.name?.split(" ")[0] ?? ""}...` : "Napiš zprávu týmu..."}
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
