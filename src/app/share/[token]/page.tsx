"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Lock, Calendar, MapPin, CheckSquare, Clock, Coins, BookOpen, Briefcase, Check,
} from "lucide-react";
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  type TaskStatus, type TaskPriority,
} from "@/types/index";
import { formatCZK, formatDuration } from "@/lib/pricing";

interface SharedPayload {
  type: "note" | "task" | "event" | "project";
  sharedBy: { name: string; avatar: string | null };
  resource: any;
}

const NOTE_BG: Record<string, string> = {
  "#fef9c3": "#fef9c3", "#dcfce7": "#dcfce7", "#dbeafe": "#dbeafe",
  "#fce7f3": "#fce7f3", "#ede9fe": "#ede9fe", "#ffedd5": "#ffedd5",
};

function formatDateRange(startAt: string, endAt: string, allDay: boolean): string {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const d = s.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (allDay) return d;
  const t = (x: Date) => x.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  return `${d} · ${t(s)}–${t(e)}`;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<SharedPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(async (r) => {
        if (!r.ok) { setError((await r.json()).error || "Odkaz nenalezen"); return; }
        setData(await r.json());
      })
      .catch(() => setError("Chyba při načítání"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10" style={{ background: "var(--bg-page)" }}>
      {/* Brand header */}
      <div className="flex items-center gap-2.5 mb-8">
        <Image src="/icon-192.png" alt="Noisium" width={30} height={30} className="w-[30px] h-[30px] rounded-xl shadow-sm" priority />
        <span className="text-[18px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Noisium</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : error ? (
        <div className="glass-strong rounded-3xl border max-w-md w-full text-center px-6 py-12"
          style={{ borderColor: "var(--border-md)", boxShadow: "var(--shadow-overlay)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--bg-subtle)" }}>
            <Lock className="w-6 h-6" style={{ color: "var(--text-3)" }} />
          </div>
          <p className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{error}</p>
          <p className="text-[13px] mt-1.5" style={{ color: "var(--text-3)" }}>
            Odkaz mohl být zrušen nebo už není platný.
          </p>
        </div>
      ) : data ? (
        <div className="w-full max-w-2xl">
          {data.type === "note" && <SharedNote resource={data.resource} />}
          {data.type === "task" && <SharedTask resource={data.resource} />}
          {data.type === "event" && <SharedEvent resource={data.resource} />}
          {data.type === "project" && <SharedProject resource={data.resource} />}

          {/* Shared by footer */}
          <div className="flex items-center justify-center gap-2 mt-6 text-[12.5px]" style={{ color: "var(--text-3)" }}>
            <span>Sdílel(a) {data.sharedBy.name} přes</span>
            <span className="font-semibold" style={{ color: "var(--text-2)" }}>Noisium</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="glass-strong rounded-3xl border overflow-hidden"
      style={{
        borderColor: accent ? `${accent}55` : "var(--border-md)",
        boxShadow: accent
          ? `0 18px 44px ${accent}33, 0 4px 14px rgba(0,0,0,0.06)`
          : "var(--shadow-overlay)",
      }}>
      {children}
    </div>
  );
}

function SharedNote({ resource }: { resource: any }) {
  const bg = resource.color && NOTE_BG[resource.color] ? NOTE_BG[resource.color] : null;
  return (
    <Card accent={resource.color || undefined}>
      <div style={{ background: bg ? `${bg}40` : undefined }}>
        <div className="flex items-center gap-2 px-7 pt-6" style={{ color: "var(--text-3)" }}>
          <BookOpen className="w-4 h-4" />
          <span className="text-[11.5px] font-semibold uppercase tracking-widest">Poznámka</span>
        </div>
        <div className="px-7 py-5">
          <h1 className="text-[26px] font-bold mb-4" style={{ color: "var(--text-1)" }}>
            {resource.title || "Bez názvu"}
          </h1>
          <p className="text-[15px] leading-[1.75] whitespace-pre-wrap" style={{ color: "var(--text-2)" }}>
            {resource.content || <span className="italic" style={{ color: "var(--text-3)" }}>Prázdná poznámka</span>}
          </p>
        </div>
      </div>
    </Card>
  );
}

function SharedTask({ resource }: { resource: any }) {
  const status = resource.status as TaskStatus;
  const priority = resource.priority as TaskPriority;
  const subs: any[] = resource.subtasks ?? [];
  const doneCount = subs.filter((s) => s.done).length;
  return (
    <Card>
      <div className="px-7 pt-6 flex items-center gap-2" style={{ color: "var(--text-3)" }}>
        <CheckSquare className="w-4 h-4" />
        <span className="text-[11.5px] font-semibold uppercase tracking-widest">Úkol</span>
      </div>
      <div className="px-7 py-5 space-y-5">
        <h1 className="text-[24px] font-bold" style={{ color: "var(--text-1)" }}>{resource.title}</h1>

        <div className="flex flex-wrap gap-2">
          {STATUS_LABELS[status] && (
            <span className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold"
              style={{ background: STATUS_COLORS[status] + "22", color: STATUS_COLORS[status] }}>
              {STATUS_LABELS[status]}
            </span>
          )}
          {PRIORITY_LABELS[priority] && (
            <span className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold"
              style={{ background: PRIORITY_COLORS[priority] + "22", color: PRIORITY_COLORS[priority] }}>
              {PRIORITY_LABELS[priority]}
            </span>
          )}
          {resource.categoryName && (
            <span className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold"
              style={{ background: (resource.categoryColor || "#888") + "22", color: resource.categoryColor || "var(--text-2)" }}>
              {resource.categoryName}
            </span>
          )}
        </div>

        {resource.description && (
          <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-2)" }}>
            {resource.description}
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-[13px]" style={{ color: "var(--text-2)" }}>
          {resource.dueDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" style={{ color: "var(--text-3)" }} />
              {new Date(resource.dueDate).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
          {resource.estimatedMinutes ? (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" style={{ color: "var(--text-3)" }} />
              {formatDuration(resource.estimatedMinutes)}
            </span>
          ) : null}
          {resource.expenses ? (
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4" style={{ color: "var(--text-3)" }} />
              {formatCZK(resource.expenses)}
            </span>
          ) : null}
        </div>

        {subs.length > 0 && (
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "var(--text-3)" }}>
              Podúkoly · {doneCount}/{subs.length}
            </p>
            <div className="space-y-1.5">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 text-[14px]">
                  <span className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: s.done ? "var(--accent)" : "transparent", border: s.done ? "none" : "1.5px solid var(--border-md)" }}>
                    {s.done && <CheckSquare className="w-3 h-3 text-white" />}
                  </span>
                  <span style={{ color: s.done ? "var(--text-3)" : "var(--text-1)", textDecoration: s.done ? "line-through" : "none" }}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function SharedEvent({ resource }: { resource: any }) {
  const accent = resource.color || "#f7592f";
  return (
    <Card accent={accent}>
      <div className="px-7 pt-6 flex items-center gap-2" style={{ color: "var(--text-3)" }}>
        <Calendar className="w-4 h-4" />
        <span className="text-[11.5px] font-semibold uppercase tracking-widest">Událost</span>
      </div>
      <div className="px-7 py-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: accent, minHeight: 40 }} />
          <div>
            <h1 className="text-[24px] font-bold" style={{ color: "var(--text-1)" }}>{resource.title}</h1>
            <p className="text-[13.5px] mt-1 font-medium" style={{ color: "var(--text-2)" }}>
              {formatDateRange(resource.startAt, resource.endAt, resource.allDay)}
            </p>
          </div>
        </div>
        {resource.location && (
          <p className="flex items-center gap-1.5 text-[13.5px]" style={{ color: "var(--text-2)" }}>
            <MapPin className="w-4 h-4" style={{ color: "var(--text-3)" }} />
            {resource.location}
          </p>
        )}
        {resource.description && (
          <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-2)" }}>
            {resource.description}
          </p>
        )}
      </div>
    </Card>
  );
}

const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  active:   { label: "Aktivní",     color: "#3B82F6" },
  on_hold:  { label: "Pozastaveno", color: "#F59E0B" },
  done:     { label: "Dokončeno",   color: "#22C55E" },
  archived: { label: "Archiv",      color: "#6B7280" },
};

function SharedProject({ resource }: { resource: any }) {
  const st = PROJECT_STATUS[resource.status] ?? PROJECT_STATUS.active;
  const tasks: { id: string; title: string; status: string }[] = resource.tasks ?? [];
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const accent = resource.color || "var(--accent)";
  return (
    <Card accent={resource.color || undefined}>
      <div className="px-7 pt-6 flex items-center gap-2" style={{ color: "var(--text-3)" }}>
        <Briefcase className="w-4 h-4" />
        <span className="text-[11.5px] font-semibold uppercase tracking-widest">Projekt</span>
      </div>
      <div className="px-7 py-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight" style={{ color: "var(--text-1)" }}>{resource.name}</h1>
            {resource.clientName && (
              <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>pro {resource.clientName}</p>
            )}
          </div>
          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ color: st.color, background: `${st.color}18` }}>
            {st.label}
          </span>
        </div>

        {resource.description && (
          <p className="text-[14px] mt-4 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-2)" }}>
            {resource.description}
          </p>
        )}

        {resource.deadline && (
          <p className="flex items-center gap-1.5 text-[13px] mt-4" style={{ color: "var(--text-3)" }}>
            <Calendar className="w-4 h-4" />
            Termín dokončení: {new Date(resource.deadline).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}

        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12.5px] font-semibold" style={{ color: "var(--text-2)" }}>Postup prací</span>
            <span className="text-[12.5px] font-bold tabular-nums" style={{ color: accent }}>{pct} %</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
          </div>
          <p className="text-[11.5px] mt-1.5" style={{ color: "var(--text-3)" }}>
            {done} z {tasks.length} úkolů dokončeno
          </p>
        </div>

        {/* Task list */}
        {tasks.length > 0 && (
          <div className="mt-6 space-y-1.5">
            {tasks.map((t) => {
              const isDone = t.status === "done";
              return (
                <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                  style={{ background: isDone ? "color-mix(in srgb, #22C55E 6%, transparent)" : "var(--bg-subtle)" }}>
                  <span className="w-[17px] h-[17px] rounded-md flex items-center justify-center flex-shrink-0 border"
                    style={isDone
                      ? { background: "#22C55E", borderColor: "#22C55E" }
                      : { borderColor: "var(--border-md)", background: "transparent" }}>
                    {isDone && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-[13px] font-medium flex-1 min-w-0 truncate"
                    style={{ color: isDone ? "var(--text-3)" : "var(--text-1)", textDecoration: isDone ? "line-through" : undefined }}>
                    {t.title}
                  </span>
                  <span className="text-[11px] flex-shrink-0" style={{ color: STATUS_COLORS[t.status as TaskStatus] ?? "var(--text-3)" }}>
                    {STATUS_LABELS[t.status as TaskStatus] ?? t.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
