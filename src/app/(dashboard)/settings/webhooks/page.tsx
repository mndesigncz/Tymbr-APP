"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Trash2, Plus, ToggleLeft, ToggleRight, Copy, Check,
  ChevronDown, ChevronUp, ChevronRight, Zap, Lock, ArrowRight,
  MessageSquare, Mail, Bell, Table2, Layers, ExternalLink, Code2,
} from "lucide-react";

interface Hook {
  id: string;
  url: string;
  secret: string | null;
  events: string;
  active: boolean;
  createdAt: string;
}

const ALL_EVENTS = [
  { value: "task.created",    label: "Nový úkol vytvořen",    emoji: "📋" },
  { value: "task.updated",    label: "Úkol byl upraven",       emoji: "✏️" },
  { value: "task.completed",  label: "Úkol byl dokončen",      emoji: "✅" },
  { value: "task.deleted",    label: "Úkol byl smazán",        emoji: "🗑️" },
  { value: "comment.created", label: "Nový komentář k úkolu",  emoji: "💬" },
];

const EXAMPLES = [
  { trigger: "Úkol dokončen",    action: "Zpráva na Slack",         icon: MessageSquare, color: "#4CAF50", platform: "Zapier" },
  { trigger: "Nový úkol",        action: "Řádek v Google Sheets",   icon: Table2,        color: "#2196F3", platform: "Make"   },
  { trigger: "Komentář přidán",  action: "Email upozornění",        icon: Mail,          color: "#FF9800", platform: "Zapier" },
  { trigger: "Úkol po termínu",  action: "Reminder v Teams",        icon: Bell,          color: "#9C27B0", platform: "Make"   },
];

const GUIDES = {
  zapier: [
    { num: 1, text: 'Jdi na zapier.com a vytvoř si účet — je zdarma.' },
    { num: 2, text: 'Klikni na "Create Zap" → jako Trigger zvolte "Webhooks by Zapier" → "Catch Hook".' },
    { num: 3, text: 'Zapier vygeneruje unikátní URL adresu. Klikni na "Copy" a zkopíruj ji.' },
    { num: 4, text: 'Vlož tuto URL do pole níže, vyber které akce chceš sledovat a ulož.' },
    { num: 5, text: 'Zpět v Zapier nastav Action — co se má stát (Slack zpráva, email, záznam v Sheets…).' },
    { num: 6, text: 'Klikni na "Publish Zap" a hotovo. Vše se od teď děje automaticky.' },
  ],
  make: [
    { num: 1, text: 'Jdi na make.com a vytvoř si účet — je zdarma.' },
    { num: 2, text: 'Klikni na "Create a new scenario" a přidej modul "Webhooks" → "Custom webhook".' },
    { num: 3, text: 'Make vygeneruje URL adresu. Klikni na "Copy address to clipboard".' },
    { num: 4, text: 'Vlož tuto URL do pole níže, vyber které akce chceš sledovat a ulož.' },
    { num: 5, text: 'Přidej další modul (Slack, Gmail, Google Sheets…) a nastav, co se má stát.' },
    { num: 6, text: 'Klikni na "Save" a aktivuj scénář. Od teď se vše děje automaticky.' },
  ],
};

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeGuide, setActiveGuide] = useState<"zapier" | "make">("zapier");
  const [showFormAdvanced, setShowFormAdvanced] = useState(false);
  const [showDevDocs, setShowDevDocs] = useState(false);

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

  const toggleEvent = (ev: string) =>
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));

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
        setShowFormAdvanced(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Smazat toto propojení?")) return;
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
        title="Integrace"
        subtitle="Propojte Noisium s dalšími nástroji a automatizujte svůj tým."
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 max-w-2xl mx-auto space-y-6">

        {/* ── What is it ── */}
        <div className="rounded-3xl border p-6 space-y-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div>
            <h2 className="text-[16px] font-bold mb-2" style={{ color: "var(--text-1)" }}>
              Co to je a k čemu to slouží?
            </h2>
            <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              Integrace propojí Noisium s nástroji, které už používáte — Slack, Gmail, Google Sheets, Notion
              a stovkami dalších. Kdykoli nastane akce v Noisium (třeba dokončení úkolu), automaticky se spustí
              akce ve druhé appce. Bez jediného kliknutí.
            </p>
          </div>

          {/* Visual flow */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl flex-shrink-0"
              style={{ background: "var(--accent-soft)" }}>
              <div className="w-5 h-5 rounded-lg flex items-center justify-center"
                style={{ background: "var(--accent)" }}>
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-[13px] font-semibold" style={{ color: "var(--accent)" }}>Noisium</span>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl flex-shrink-0"
              style={{ background: "var(--bg-subtle)" }}>
              <Zap className="w-4 h-4" style={{ color: "#FF6B35" }} />
              <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Zapier / Make</span>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl flex-shrink-0"
              style={{ background: "var(--bg-subtle)" }}>
              <Layers className="w-4 h-4" style={{ color: "var(--text-2)" }} />
              <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Slack, Gmail, Sheets…</span>
            </div>
          </div>
        </div>

        {/* ── Automation examples ── */}
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide px-1 mb-3" style={{ color: "var(--text-3)" }}>
            Příklady automatizací
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {EXAMPLES.map(({ trigger, action, icon: Icon, color, platform }) => (
              <div key={trigger + action}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[12.5px] font-medium flex-shrink-0" style={{ color: "var(--text-2)" }}>
                    {trigger}
                  </span>
                  <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                    <span className="text-[12.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                      {action}
                    </span>
                  </div>
                </div>
                <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>
                  {platform}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Step-by-step guide ── */}
        <div className="rounded-3xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-5 pt-5 pb-4">
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>
              Jak to nastavit — krok za krokem
            </h2>
            <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
              Nepotřebujete umět programovat. Stačí 5 minut a bezplatný účet na Zapier nebo Make.
            </p>

            <div className="flex gap-2 mt-4">
              {(["zapier", "make"] as const).map((g) => (
                <button key={g} onClick={() => setActiveGuide(g)}
                  className="px-4 py-1.5 rounded-xl text-[13px] font-semibold transition-all"
                  style={activeGuide === g
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--bg-subtle)", color: "var(--text-2)" }
                  }>
                  {g === "zapier" ? "Zapier" : "Make.com"}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pb-5 space-y-4">
            {GUIDES[activeGuide].map(({ num, text }) => (
              <div key={num} className="flex gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[12px] font-bold"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  {num}
                </div>
                <p className="text-[13.5px] leading-relaxed pt-0.5" style={{ color: "var(--text-2)" }}>
                  {text}
                </p>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <ExternalLink className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[13px]" style={{ color: "var(--text-2)" }}>
                Otevřete{" "}
                <a
                  href={activeGuide === "zapier" ? "https://zapier.com" : "https://make.com"}
                  target="_blank" rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2"
                  style={{ color: "var(--accent)" }}>
                  {activeGuide === "zapier" ? "zapier.com" : "make.com"}
                </a>
                {" "}a postupujte podle kroků výše.
              </span>
            </div>
          </div>
        </div>

        {/* ── Add connection ── */}
        {adding ? (
          <form onSubmit={handleAdd} className="rounded-3xl border p-5 space-y-5"
            style={{ background: "var(--bg-card)", borderColor: "var(--accent)", boxShadow: "var(--shadow-sm)" }}>
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>Nové propojení</h2>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                Vlož URL adresu z Zapier nebo Make, vyber události a ulož.
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
                URL adresa (ze Zapier nebo Make)
              </label>
              <Input
                type="url"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
                Co chcete sledovat?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_EVENTS.map((ev) => {
                  const checked = form.events.includes(ev.value);
                  return (
                    <button key={ev.value} type="button" onClick={() => toggleEvent(ev.value)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-[13px] font-medium transition-all"
                      style={{
                        background: checked ? "var(--accent-soft)" : "var(--bg-subtle)",
                        borderColor: checked ? "var(--accent)" : "var(--border-md)",
                        color: checked ? "var(--accent)" : "var(--text-2)",
                      }}>
                      <div className={`w-4 h-4 rounded flex-shrink-0 border-2 transition-all flex items-center justify-center ${checked ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border-md)]"}`}>
                        {checked && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span>{ev.emoji}</span>
                      {ev.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced fields */}
            <div>
              <button type="button" onClick={() => setShowFormAdvanced((v) => !v)}
                className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--text-3)" }}>
                {showFormAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Pokročilé nastavení (volitelné)
              </button>
              {showFormAdvanced && (
                <div className="mt-3">
                  <Input
                    label="Bezpečnostní klíč (Secret)"
                    placeholder="Pokud nevíte co to je, nechte prázdné"
                    value={form.secret}
                    onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => { setAdding(false); setShowFormAdvanced(false); }} className="flex-1">
                Zrušit
              </Button>
              <Button type="submit" loading={saving} className="flex-1">
                Uložit propojení
              </Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-2 w-full rounded-2xl border py-4 px-5 text-[13.5px] font-semibold transition-all hover:opacity-80"
            style={{ background: "var(--bg-card)", borderColor: "var(--accent)", color: "var(--accent)", borderStyle: "dashed" }}>
            <Plus className="w-4 h-4" />
            Přidat propojení
          </button>
        )}

        {/* ── Existing hooks ── */}
        {loading ? (
          <div className="h-20 animate-pulse rounded-3xl" style={{ background: "var(--bg-subtle)" }} />
        ) : hooks.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide px-1" style={{ color: "var(--text-3)" }}>
              Aktivní propojení ({hooks.length})
            </p>
            {hooks.map((hook) => {
              const expanded = expandedId === hook.id;
              const events = hook.events.split(",").map((e) => e.trim());
              const eventLabels = events.map((v) => ALL_EVENTS.find((e) => e.value === v)?.label ?? v);
              return (
                <div key={hook.id} className="rounded-2xl border overflow-hidden"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border)",
                    opacity: hook.active ? 1 : 0.65,
                  }}>
                  <div className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${hook.active ? "bg-green-500" : "bg-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-mono break-all leading-snug" style={{ color: "var(--text-2)" }}>
                          {hook.url}
                        </p>
                        <p className="text-[11.5px] mt-1 truncate" style={{ color: "var(--text-3)" }}>
                          {eventLabels.join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 justify-end">
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
                    <div className="px-4 pb-4 pt-2 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
                      <p className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
                        Sledované události
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {eventLabels.map((label) => (
                          <span key={label} className="text-[12px] font-medium px-2.5 py-0.5 rounded-full"
                            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* ── For developers ── */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setShowDevDocs((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02]"
            style={{ background: "var(--bg-card)" }}>
            <Code2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
            <span className="flex-1 text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>
              Pro vývojáře — technické detaily
            </span>
            {showDevDocs
              ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-3)" }} />
              : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-3)" }} />}
          </button>

          {showDevDocs && (
            <div className="border-t" style={{ borderColor: "var(--border)" }}>
              <div className="px-4 py-3 border-b"
                style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
                <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
                  Formát payloadu — HTTP POST, Content-Type: application/json
                </span>
              </div>
              <div className="px-4 py-3 overflow-x-auto" style={{ background: "var(--bg-card)" }}>
                <pre className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{`{
  "event": "task.created",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "teamId": "clxxxxxxxxxxxxxx",
  "data": {
    "id": "clxxxxxxxxxxxxxx",
    "title": "Název úkolu",
    "status": "todo",
    "priority": "medium"
  }
}`}</pre>
              </div>
              <div className="px-4 py-3 border-t text-[12.5px] leading-relaxed"
                style={{ borderColor: "var(--border)", color: "var(--text-2)", background: "var(--bg-card)" }}>
                <div className="flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--text-3)" }} />
                  <span>
                    Pokud nastavíte Secret, každý request obsahuje hlavičku{" "}
                    <code className="font-mono text-[11px] px-1.5 py-0.5 rounded-md"
                      style={{ background: "var(--bg-subtle)" }}>
                      X-Noisium-Signature
                    </code>{" "}
                    s HMAC-SHA256 podpisem těla požadavku.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
