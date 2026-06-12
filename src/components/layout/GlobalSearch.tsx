"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckSquare, MessageSquare, User, X, ArrowRight } from "lucide-react";
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

const STATUS_COLORS: Record<string, string> = {
  todo: "#6B7280", in_progress: "#3B82F6", review: "#EAB308", done: "#22C55E",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ tasks: SearchTask[]; comments: SearchComment[]; members: SearchMember[] } | null>(null);
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

  // Global keyboard shortcut: Cmd/Ctrl+K or K (from useKeyboardShortcuts dispatches tymbr:search-open)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); openSearch(); }
      if (e.key === "Escape" && open) setOpen(false);
    };
    const handleCustom = () => openSearch();
    window.addEventListener("keydown", handleKey);
    window.addEventListener("tymbr:search-open", handleCustom);
    return () => { window.removeEventListener("keydown", handleKey); window.removeEventListener("tymbr:search-open", handleCustom); };
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

  const allItems: { type: "task" | "comment" | "member"; id: string; url: string }[] = [
    ...(results?.tasks ?? []).map((t) => ({ type: "task" as const, id: t.id, url: `/tasks/${t.id}` })),
    ...(results?.comments ?? []).map((c) => ({ type: "comment" as const, id: c.id, url: `/tasks/${c.task.id}` })),
    ...(results?.members ?? []).map((m) => ({ type: "member" as const, id: m.user.id, url: `/tasks?assigneeId=${m.user.id}` })),
  ];

  const navigate = (url: string) => { setOpen(false); router.push(url); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, allItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && allItems[idx]) navigate(allItems[idx].url);
    else if (e.key === "Escape") setOpen(false);
  };

  if (!open) return null;

  const flatIdx = (type: "task" | "comment" | "member", localIdx: number) => {
    if (type === "task") return localIdx;
    if (type === "comment") return (results?.tasks.length ?? 0) + localIdx;
    return (results?.tasks.length ?? 0) + (results?.comments.length ?? 0) + localIdx;
  };

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
            placeholder="Hledat úkoly, komentáře, členy…"
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
              {results.tasks.length === 0 && results.comments.length === 0 && results.members.length === 0 && (
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
