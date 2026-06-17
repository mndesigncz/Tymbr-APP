"use client";

import { useEffect, useState } from "react";
import { Link2, Copy, Check, Trash2, MessageSquare, Globe } from "lucide-react";
import type { ShareResourceType } from "@/lib/share";

interface ShareSheetProps {
  resourceType: ShareResourceType;
  resourceId: string;
  /** When provided, shows a "share in team chat" button that posts this text. */
  chatMessage?: string;
}

/**
 * Reusable sharing panel — public read-only link (create / copy / revoke) plus an
 * optional "share in team chat" action. Used by notes, tasks and events.
 */
export function ShareSheet({ resourceType, resourceId, chatMessage }: ShareSheetProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatSent, setChatSent] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = token ? `${origin}/share/${token}` : "";

  useEffect(() => {
    fetch(`/api/share?resourceType=${resourceType}&resourceId=${resourceId}`)
      .then((r) => r.json())
      .then((d) => setToken(d.token ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [resourceType, resourceId]);

  const createLink = async () => {
    setWorking(true);
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType, resourceId }),
    });
    if (res.ok) setToken((await res.json()).token);
    setWorking(false);
  };

  const revokeLink = async () => {
    setWorking(true);
    await fetch("/api/share", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType, resourceId }),
    });
    setToken(null);
    setWorking(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard may be unavailable */ }
  };

  const shareInChat = async () => {
    if (!chatMessage) return;
    const text = url ? `${chatMessage}\n\n🔗 ${url}` : chatMessage;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setChatSent(true);
    setTimeout(() => setChatSent(false), 1800);
  };

  return (
    <div className="space-y-4">
      {/* Public link */}
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border-md)", background: "var(--bg-subtle)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>Veřejný odkaz</span>
        </div>
        <p className="text-[12.5px] mb-3" style={{ color: "var(--text-3)" }}>
          Kdokoliv s odkazem uvidí jen tento obsah — read-only, bez přihlášení.
        </p>

        {loading ? (
          <div className="h-9 rounded-xl animate-pulse" style={{ background: "var(--bg-card)" }} />
        ) : token ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border min-w-0"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
                <Link2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                <span className="text-[12.5px] truncate" style={{ color: "var(--text-2)" }}>{url}</span>
              </div>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-white transition-all hover:opacity-90 flex-shrink-0"
                style={{ background: "var(--accent)" }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Zkopírováno" : "Kopírovat"}
              </button>
            </div>
            <button
              onClick={revokeLink}
              disabled={working}
              className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ color: "var(--danger)" }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Zrušit odkaz
            </button>
          </div>
        ) : (
          <button
            onClick={createLink}
            disabled={working}
            className="flex items-center justify-center gap-2 w-full px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            <Link2 className="w-4 h-4" />
            {working ? "Vytvářím…" : "Vytvořit veřejný odkaz"}
          </button>
        )}
      </div>

      {/* Share in team chat */}
      {chatMessage && (
        <button
          onClick={shareInChat}
          className="flex items-center justify-center gap-2 w-full px-3.5 py-2.5 rounded-xl text-[13px] font-semibold border transition-all hover:bg-[var(--hover)]"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--text-1)" }}
        >
          {chatSent ? <Check className="w-4 h-4" style={{ color: "#22C55E" }} /> : <MessageSquare className="w-4 h-4" />}
          {chatSent ? "Odesláno do chatu" : "Sdílet v týmovém chatu"}
        </button>
      )}
    </div>
  );
}
