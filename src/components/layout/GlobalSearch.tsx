"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckSquare, MessageSquare, User, X, ArrowRight, StickyNote, Calendar, FileText, Link2, Paperclip } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

interface SearchTask {
  id: string; title: string; status: string; priority: string;
  category: { name: string; color: string } | null;
}
interface SearchComment {
  id: string; content: string;
  task: { id: string; title: string };
  user: { name: string; avatar: string | null };
  createdAt: string;
}
interface SearchMember {
  user: { id: string; name: string; email: string; avatar: string | null };
  role: string;
}
interface SearchNote {
  id: string; title: string; content: string; color: string | null;
}
interface SearchEvent {
  id: string; title: string; startAt: string; allDay: boolean; location: string | null; color: string | null;
}
interface SearchFile {
  id: string; name: string; type: string; url: string; mimeType: string | null;
}

interface SearchResults {
  tasks: SearchTask[]; comments: SearchComment[]; members: SearchMember[];
  notes: SearchNote[]; events: SearchEvent[]; files: SearchFile[];
}

type ItemType = "task" | "comment" | "member" | "note" | "event" | "file";

const STATUS_COLORS: Record<string, string> = {
  todo: "#6B7280", in_progress: "#3B82F6", review: "#EAB308", done: "#22C55E",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSearch = useCallback(() => {
    setOpen(true);
    setQ("");
    setResults(null);
    setIdx(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl+K or K (from useKeyboardShortcuts dispatches noisium:search-open)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); openSearch(); }
      if (e.key === "Escape" && open) setOpen(false);
    };
    const handleCustom = () => openSearch();
    window.addEventListener("keydown", handleKey);
    window.addEventListener("noisium:search-open", handleCustom);
    return () => { window.removeEventListener("keydown", handleKey); window.removeEventListener("noisium:search-open", handleCustom); };
  }, [open, openSearch]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data);
        setIdx(0);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [q, open]);

  // Rendered order — keep flatIdx() and the JSX sections in the same order.
  const allItems: { type: ItemType; id: string; url: string; external?: boolean }[] = [
    ...(results?.tasks ?? []).map((t) => ({ type: "task" as const, id: t.id, url: `/tasks/${t.id}` })),
    ...(results?.notes ?? []).map((n) => ({ type: "note" as const, id: n.id, url: `/notes?note=${n.id}` })),
    ...(results?.events ?? []).map((e) => ({ type: "event" as const, id: e.id, url: `/calendar?event=${e.id}` })),
    ...(results?.files ?? []).map((f) => ({ type: "file" as const, id: f.id, url: f.url, external: true })),
    ...(results?.comments ?? []).map((c) => ({ type: "comment" as const, id: c.id, url: `/tasks/${c.task.id}` })),
    ...(results?.members ?? []).map((m) => ({ type: "member" as const, id: m.user.id, url: `/tasks?assigneeId=${m.user.id}` })),
  ];

  const navigate = (url: string, external?: boolean) => {
    setOpen(false);
    if (external) { window.open(url, "_blank", "noopener,noreferrer"); return; }
    router.push(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, allItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && allItems[idx]) navigate(allItems[idx].url, allItems[idx].external);
    else if (e.key === "Escape") setOpen(false);
  };

  if (!open) return null;

  // Offset of each section in the flat keyboard-nav list (must match allItems order).
  const flatIdx = (type: ItemType, localIdx: number) => {
    const len = {
      task: results?.tasks.length ?? 0,
      note: results?.notes.length ?? 0,
      event: results?.events.length ?? 0,
      file: results?.files.length ?? 0,
      comment: results?.comments.length ?? 0,
      member: results?.members.length ?? 0,
    };
    const order: ItemType[] = ["task", "note", "event", "file", "comment", "member"];
    let offset = 0;
    for (const t of order) { if (t === type) break; offset += len[t]; }
    return offset + localIdx;
  };

  const totalCount =
    (results?.tasks.length ?? 0) + (results?.notes.length ?? 0) + (results?.events.length ?? 0) +
    (results?.files.length ?? 0) + (results?.comments.length ?? 0) + (results?.members.length ?? 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-[3px] animate-fade-in"
      onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl mx-4 rounded-3xl overflow-hidden shadow-2xl glass-strong animate-scale-in"
        style={{ border: "1px solid var(--border-md)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <Search className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hledat úkoly, poznámky, události, soubory…"
            className="flex-1 bg-transparent outline-none text-[15px]"
            style={{ color: "var(--text-1)" }}
          />
          {q && (
            <button onClick={() => { setQ(""); setResults(null); inputRef.current?.focus(); }}
              className="p-1 rounded-lg hover:opacity-70" style={{ color: "var(--text-3)" }}>
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[11px] px-2 py-0.5 rounded-md font-mono hidden sm:block"
            style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="py-10 text-center text-[13px]" style={{ color: "var(--text-3)" }}>Hledám…</div>
          )}

          {!loading && q.length >= 2 && results && (
            <>
              {totalCount === 0 && (
                <div className="py-10 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
                  Žádné výsledky pro „{q}"
                </div>
              )}

              {results.tasks.length > 0 && (
                <Section label="Úkoly" icon={<CheckSquare className="w-3.5 h-3.5" />}>
                  {results.tasks.map((t, i) => {
                    const gi = flatIdx("task", i);
                    return (
                      <ResultRow key={t.id} active={idx === gi} onClick={() => navigate(`/tasks/${t.id}`)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[t.status] ?? "#6B7280" }} />
                        <span className="flex-1 text-[13.5px] font-medium truncate" style={{ color: "var(--text-1)" }}>{t.title}</span>
                        {t.category && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                            style={{ color: t.category.color, background: `${t.category.color}18` }}>{t.category.name}</span>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-3)" }} />
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {results.notes.length > 0 && (
                <Section label="Poznámky" icon={<StickyNote className="w-3.5 h-3.5" />}>
                  {results.notes.map((n, i) => {
                    const gi = flatIdx("note", i);
                    return (
                      <ResultRow key={n.id} active={idx === gi} onClick={() => navigate(`/notes?note=${n.id}`)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: n.color || "var(--text-3)" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-medium truncate" style={{ color: "var(--text-1)" }}>{n.title || "Bez názvu"}</p>
                          {n.content && <p className="text-[12px] truncate" style={{ color: "var(--text-3)" }}>{n.content}</p>}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-3)" }} />
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {results.events.length > 0 && (
                <Section label="Události" icon={<Calendar className="w-3.5 h-3.5" />}>
                  {results.events.map((e, i) => {
                    const gi = flatIdx("event", i);
                    return (
                      <ResultRow key={e.id} active={idx === gi} onClick={() => navigate(`/calendar?event=${e.id}`)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color || "var(--accent)" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-medium truncate" style={{ color: "var(--text-1)" }}>{e.title}</p>
                          <p className="text-[12px] truncate" style={{ color: "var(--text-3)" }}>
                            {formatEventDate(e.startAt, e.allDay)}{e.location ? ` · ${e.location}` : ""}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-3)" }} />
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {results.files.length > 0 && (
                <Section label="Soubory" icon={<Paperclip className="w-3.5 h-3.5" />}>
                  {results.files.map((f, i) => {
                    const gi = flatIdx("file", i);
                    const isLink = f.type === "link";
                    return (
                      <ResultRow key={f.id} active={idx === gi} onClick={() => navigate(f.url, true)}>
                        {isLink
                          ? <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                          : <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />}
                        <span className="flex-1 text-[13.5px] font-medium truncate" style={{ color: "var(--text-1)" }}>{f.name}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                          style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>{isLink ? "odkaz" : "soubor"}</span>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {results.comments.length > 0 && (
                <Section label="Komentáře" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                  {results.comments.map((c, i) => {
                    const gi = flatIdx("comment", i);
                    return (
                      <ResultRow key={c.id} active={idx === gi} onClick={() => navigate(`/tasks/${c.task.id}`)}>
                        <Avatar name={c.user.name} src={c.user.avatar} size="xs" className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium truncate" style={{ color: "var(--text-3)" }}>{c.task.title}</p>
                          <p className="text-[13px] truncate" style={{ color: "var(--text-1)" }}>{c.content}</p>
                        </div>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {results.members.length > 0 && (
                <Section label="Členové" icon={<User className="w-3.5 h-3.5" />}>
                  {results.members.map((m, i) => {
                    const gi = flatIdx("member", i);
                    return (
                      <ResultRow key={m.user.id} active={idx === gi} onClick={() => navigate(`/tasks?assigneeId=${m.user.id}`)}>
                        <Avatar name={m.user.name} src={m.user.avatar} size="sm" className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{m.user.name}</p>
                          <p className="text-[11.5px] truncate" style={{ color: "var(--text-3)" }}>{m.user.email}</p>
                        </div>
                        <span className="text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                          style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>{m.role}</span>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}
            </>
          )}

          {!loading && q.length < 2 && (
            <div className="py-8 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
              Začni psát pro vyhledávání…
              <div className="mt-3 flex items-center justify-center gap-3">
                <Hint keys={["⌘", "K"]} label="otevřít" />
                <Hint keys={["↑", "↓"]} label="navigace" />
                <Hint keys={["↵"]} label="otevřít" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatEventDate(startAt: string, allDay: boolean): string {
  const d = new Date(startAt);
  const date = d.toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" });
  if (allDay) return date;
  return `${date} · ${d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}`;
}

function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-5 pt-3 pb-1" style={{ color: "var(--text-3)" }}>
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}

function ResultRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="group w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors"
      style={{ background: active ? "var(--accent-soft)" : "transparent" }}>
      {children}
    </button>
  );
}

function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd key={k} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
          style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}>{k}</kbd>
      ))}
      <span className="text-[11px] ml-0.5" style={{ color: "var(--text-3)" }}>{label}</span>
    </span>
  );
}
