"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { KeyRound, Plus, Trash2, Copy, Check, ShieldAlert } from "lucide-react";
import { formatRelative } from "@/lib/utils";

interface Token {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/tokens");
    if (r.ok) setTokens(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const r = await fetch("/api/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Token" }),
      });
      if (r.ok) {
        const data = await r.json();
        setNewToken(data.token);
        setName("");
        load();
      }
    } finally { setCreating(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm("Zrušit tento token? Aplikace, které ho používají, přestanou fungovat.")) return;
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    load();
  };

  const copy = () => {
    if (!newToken) return;
    navigator.clipboard?.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-[760px] mx-auto w-full">
      <Header title="API tokeny" subtitle="Pro přihlášení externích aplikací (např. Mac appka)" />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-5">
        {/* Freshly created token — shown once */}
        {newToken && (
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
            <div className="flex items-start gap-2.5 mb-3">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
              <p className="text-[13px]" style={{ color: "var(--text-1)" }}>
                Zkopíruj si token teď — <strong>zobrazí se jen jednou</strong>. Ulož ho do své aplikace jako
                <code className="mx-1 px-1 rounded" style={{ background: "var(--bg-card)" }}>Authorization: Bearer …</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[12.5px] px-3 py-2 rounded-lg break-all"
                style={{ background: "var(--bg-card)", color: "var(--text-1)" }}>{newToken}</code>
              <button onClick={copy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white flex-shrink-0"
                style={{ background: "var(--accent)" }}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Zkopírováno" : "Kopírovat"}
              </button>
            </div>
            <button onClick={() => setNewToken(null)} className="mt-3 text-[12px] font-medium" style={{ color: "var(--text-3)" }}>
              Hotovo, skrýt
            </button>
          </div>
        )}

        {/* Create */}
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <p className="text-[13.5px] font-semibold mb-2.5" style={{ color: "var(--text-1)" }}>Nový token</p>
          <div className="flex items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Název (např. Mac appka)" className="flex-1" />
            <Button icon={<Plus className="w-4 h-4" />} onClick={create} loading={creating}>Vytvořit</Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {tokens.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <KeyRound className="w-8 h-8 mb-2 opacity-30" style={{ color: "var(--text-3)" }} />
              <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Zatím žádné tokeny</p>
            </div>
          ) : tokens.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl border px-4 py-3"
              style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
              <KeyRound className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{t.name}</p>
                <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                  {t.prefix}… · vytvořen {formatRelative(t.createdAt)}
                  {t.lastUsedAt ? ` · naposledy použit ${formatRelative(t.lastUsedAt)}` : " · nepoužit"}
                </p>
              </div>
              <button onClick={() => revoke(t.id)} title="Zrušit token"
                className="p-2 rounded-lg transition-colors hover:bg-[var(--danger-soft)] flex-shrink-0"
                style={{ color: "var(--text-3)" }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-3)" }}>
          Token používej v hlavičce <code className="px-1 rounded" style={{ background: "var(--bg-subtle)" }}>Authorization: Bearer &lt;token&gt;</code>{" "}
          proti <code className="px-1 rounded" style={{ background: "var(--bg-subtle)" }}>/api</code>. Má stejná práva jako tvůj účet — nikomu ho nedávej.
        </p>
      </div>
    </div>
  );
}
