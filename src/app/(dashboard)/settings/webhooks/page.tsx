"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Webhook, Trash2, Plus, ToggleLeft, ToggleRight, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

interface Hook {
  id: string;
  url: string;
  secret: string | null;
  events: string;
  active: boolean;
  createdAt: string;
}

const ALL_EVENTS = [
  { value: "task.created",   label: "Úkol vytvořen" },
  { value: "task.updated",   label: "Úkol aktualizován" },
  { value: "task.completed", label: "Úkol dokončen" },
  { value: "task.deleted",   label: "Úkol smazán" },
  { value: "comment.created",label: "Komentář přidán" },
];

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    url: "",
    secret: "",
    events: ["task.created", "task.updated", "task.completed"],
  });

  useEffect(() => {
    fetch("/api/webhooks")
      .then((r) => r.json())
      .then((d) => setHooks(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const toggleEvent = (ev: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url.trim() || form.events.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.url, secret: form.secret, events: form.events }),
      });
      if (res.ok) {
        const hook = await res.json();
        setHooks((prev) => [hook, ...prev]);
        setForm({ url: "", secret: "", events: ["task.created", "task.updated", "task.completed"] });
        setAdding(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Smazat tento webhook?")) return;
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    setHooks((prev) => prev.filter((h) => h.id !== id));
  };

  const handleToggle = async (hook: Hook) => {
    const res = await fetch(`/api/webhooks/${hook.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !hook.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setHooks((prev) => prev.map((h) => (h.id === hook.id ? updated : h)));
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <Header
        title="Webhooks"
        subtitle="Posílejte události v reálném čase na vaše systémy."
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 max-w-2xl mx-auto space-y-6">

        {/* Add form */}
        {adding ? (
          <form onSubmit={handleAdd} className="rounded-3xl border p-6 space-y-4"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>Nový webhook</h2>

            <Input label="URL" type="url" placeholder="https://example.com/webhook"
              value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} required />

            <Input label="Secret (volitelný)" placeholder="Pro ověření HMAC podpisu"
              value={form.secret} onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))} />

            <div className="space-y-2">
              <label className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>Události</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_EVENTS.map((ev) => {
                  const checked = form.events.includes(ev.value);
                  return (
                    <button key={ev.value} type="button" onClick={() => toggleEvent(ev.value)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-[12.5px] font-medium transition-all"
                      style={{
                        background: checked ? "var(--accent-soft)" : "var(--bg-subtle)",
                        borderColor: checked ? "var(--accent)" : "var(--border-md)",
                        color: checked ? "var(--accent)" : "var(--text-2)",
                      }}>
                      <div className={`w-3.5 h-3.5 rounded flex-shrink-0 border-2 transition-all ${checked ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border-md)]"}`} />
                      {ev.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setAdding(false)} className="flex-1">Zrušit</Button>
              <Button type="submit" loading={saving} className="flex-1">Přidat webhook</Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 w-full rounded-2xl border py-4 px-5 text-[13.5px] font-semibold transition-all hover:opacity-80"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)", color: "var(--accent)", borderStyle: "dashed" }}>
            <Plus className="w-4 h-4" />
            Přidat webhook
          </button>
        )}

        {/* Existing hooks */}
        {loading ? (
          <div className="h-20 animate-pulse rounded-3xl" style={{ background: "var(--bg-subtle)" }} />
        ) : hooks.length === 0 ? (
          <div className="rounded-3xl border py-12 text-center"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <Webhook className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-3)" }} />
            <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>Žádné webhooky</p>
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Přidejte endpoint, který bude přijímat události z Tymbr.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hooks.map((hook) => {
              const expanded = expandedId === hook.id;
              const events = hook.events.split(",").map((e) => e.trim());
              return (
                <div key={hook.id} className="rounded-2xl border overflow-hidden"
                  style={{ background: "var(--bg-card)", borderColor: hook.active ? "var(--border)" : "var(--border)", opacity: hook.active ? 1 : 0.65 }}>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hook.active ? "bg-green-500" : "bg-gray-400"}`} />
                        <p className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{hook.url}</p>
                      </div>
                      <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-3)" }}>
                        {events.length} událost{events.length === 1 ? "" : events.length < 5 ? "i" : "í"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => copyUrl(hook.url)}
                        className="p-2 rounded-xl transition-colors hover:bg-black/[0.04]"
                        style={{ color: "var(--text-3)" }} title="Kopírovat URL">
                        {copied === hook.url ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleToggle(hook)}
                        className="p-2 rounded-xl transition-colors hover:bg-black/[0.04]"
                        style={{ color: hook.active ? "var(--accent)" : "var(--text-3)" }}
                        title={hook.active ? "Deaktivovat" : "Aktivovat"}>
                        {hook.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => setExpandedId(expanded ? null : hook.id)}
                        className="p-2 rounded-xl transition-colors hover:bg-black/[0.04]"
                        style={{ color: "var(--text-3)" }}>
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(hook.id)}
                        className="p-2 rounded-xl transition-colors hover:text-red-500"
                        style={{ color: "var(--text-3)" }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="px-5 pb-4 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
                      <p className="text-[11.5px] font-semibold uppercase tracking-wide mt-3 mb-1" style={{ color: "var(--text-3)" }}>Události</p>
                      <div className="flex flex-wrap gap-1.5">
                        {events.map((ev) => (
                          <span key={ev} className="text-[11px] font-medium px-2 py-0.5 rounded-md font-mono"
                            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                            {ev}
                          </span>
                        ))}
                      </div>
                      {hook.secret && (
                        <>
                          <p className="text-[11.5px] font-semibold uppercase tracking-wide mt-3 mb-1" style={{ color: "var(--text-3)" }}>Payload ověření</p>
                          <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                            HMAC-SHA256 podpis v hlavičce <code className="font-mono text-[11px] px-1 py-0.5 rounded" style={{ background: "var(--bg-subtle)" }}>X-Tymbr-Signature</code>
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Docs */}
        <div className="rounded-2xl border p-5"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
          <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-1)" }}>Formát payloadu</p>
          <pre className="text-[11.5px] overflow-x-auto" style={{ color: "var(--text-2)" }}>{`{
  "event": "task.created",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "teamId": "...",
  "data": {
    "id": "...",
    "title": "Název úkolu",
    "status": "todo",
    "priority": "medium"
  }
}`}</pre>
        </div>
      </div>
    </div>
  );
}
