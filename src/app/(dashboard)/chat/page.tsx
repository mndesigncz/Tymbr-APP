"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Send, MessageSquare } from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user?: { id: string; name: string; avatar?: string | null };
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
  const endRef = useRef<HTMLDivElement>(null);
  const lastTimestamp = useRef<string | null>(null);
  const myId = session?.user?.id;

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadInitial = useCallback(async () => {
    const res = await fetch("/api/chat");
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setMessages(list);
    if (list.length > 0) lastTimestamp.current = list[list.length - 1].createdAt;
    setLoading(false);
    setTimeout(scrollToBottom, 50);
  }, []);

  const poll = useCallback(async () => {
    if (!lastTimestamp.current) return;
    const res = await fetch(`/api/chat?since=${encodeURIComponent(lastTimestamp.current)}`);
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
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

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
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      lastTimestamp.current = msg.createdAt;
      setTimeout(scrollToBottom, 50);
    }
    setSending(false);
  };

  // Group messages by day
  let lastDay = "";

  return (
    <div>
      <Header title="Týmový chat" subtitle="Komunikace v reálném čase s celým týmem" />

      <div className="px-6 lg:px-8 pb-6">
        <div className="flex flex-col rounded-3xl border overflow-hidden h-[calc(100vh-180px)]"
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
                <p className="text-[13px] mt-1">Napiš první zprávu svému týmu</p>
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
              placeholder="Napiš zprávu..."
              className="flex-1 text-[14px] px-4 py-3 rounded-2xl outline-none"
              style={{ background: "var(--bg-subtle)", color: "var(--text-1)" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
