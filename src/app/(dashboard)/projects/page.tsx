"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Plus, Briefcase, Calendar, Trash2, Pencil, Contact, CheckSquare, Share2,
} from "lucide-react";
import { ShareSheet } from "@/components/share/ShareSheet";
import { formatDate, isOverdue } from "@/lib/utils";
import { formatCZK } from "@/lib/pricing";
import type { Project, ProjectStatus, Client } from "@/types";

const STATUSES: { key: ProjectStatus; label: string; color: string }[] = [
  { key: "active",   label: "Aktivní",     color: "#3B82F6" },
  { key: "on_hold",  label: "Pozastaveno", color: "#F59E0B" },
  { key: "done",     label: "Dokončeno",   color: "#22C55E" },
  { key: "archived", label: "Archiv",      color: "#6B7280" },
];
const statusInfo = (s: string) => STATUSES.find((x) => x.key === s) ?? STATUSES[0];

const PROJECT_COLORS = ["#f7592f", "#3B82F6", "#8B5CF6", "#22C55E", "#EAB308", "#EC4899", "#14B8A6", "#6B7280"];

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"running" | ProjectStatus>("running");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [sharing, setSharing] = useState<Project | null>(null);
  const [prefillClientId, setPrefillClientId] = useState("");

  const load = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([fetch("/api/projects"), fetch("/api/clients")]);
    setProjects(pRes.ok ? await pRes.json() : []);
    setClients(cRes.ok ? await cRes.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Deep link: /projects?new=1&clientId=… (from client detail)
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setPrefillClientId(searchParams.get("clientId") ?? "");
      setFormOpen(true);
      router.replace("/projects");
    }
  }, [searchParams, router]);

  const remove = async (p: Project) => {
    if (!confirm(`Smazat projekt „${p.name}"? Úkoly zůstanou zachovány.`)) return;
    await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    load();
  };

  const filtered = projects.filter((p) =>
    filter === "running" ? p.status === "active" || p.status === "on_hold" : p.status === filter
  );

  const filters: { key: typeof filter; label: string }[] = [
    { key: "running", label: "Běžící" },
    { key: "done", label: "Dokončené" },
    { key: "archived", label: "Archiv" },
  ];

  return (
    <div>
      <Header
        title="Projekty"
        subtitle="Zakázky a projekty na jednom místě"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setPrefillClientId(""); setFormOpen(true); }}>
            <span>Nový projekt</span>
          </Button>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-5">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border w-fit"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={filter === f.key ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" style={{ color: "var(--text-3)" }}>
            <Briefcase className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>
              {projects.length === 0 ? "Zatím žádné projekty" : "Nic v této kategorii"}
            </p>
            {projects.length === 0 && (
              <>
                <p className="text-[13px] mt-1 mb-4">Založ první projekt a přiřaď k němu úkoly</p>
                <Button icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>Nový projekt</Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((p) => {
              const si = statusInfo(p.status);
              const total = p.tasks?.length ?? 0;
              const done = p.tasks?.filter((t) => t.status === "done").length ?? 0;
              const overdue = p.status !== "done" && p.deadline && isOverdue(p.deadline);
              return (
                <div key={p.id} className="rounded-2xl border p-5 group transition-all hover:-translate-y-0.5"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link href={`/tasks?projectId=${p.id}`} className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color ?? "var(--accent)" }} />
                      <span className="text-[14px] font-semibold leading-snug truncate hover:underline" style={{ color: "var(--text-1)" }}>
                        {p.name}
                      </span>
                    </Link>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => setSharing(p)} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
                        title="Sdílet s klientem" style={{ color: "var(--text-3)" }}>
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditing(p)} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
                        title="Upravit" style={{ color: "var(--text-3)" }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove(p)} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--danger-soft)] hover:text-red-500"
                        title="Smazat" style={{ color: "var(--text-3)" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-[12.5px] line-clamp-2 mb-3 leading-relaxed" style={{ color: "var(--text-3)" }}>
                      {p.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2 py-1 rounded-lg"
                      style={{ color: si.color, background: `${si.color}15` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: si.color }} />
                      {si.label}
                    </span>
                    {p.client && (
                      <Link href="/clients"
                        className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
                        style={{ color: "var(--text-2)", background: "var(--bg-subtle)" }}>
                        <Contact className="w-3 h-3" />
                        {p.client.name}
                      </Link>
                    )}
                    {p.budget != null && p.budget > 0 && (
                      <span className="text-[11.5px] font-medium px-2 py-1 rounded-lg"
                        style={{ color: "var(--text-3)", background: "var(--bg-subtle)" }}>
                        {formatCZK(p.budget)}
                      </span>
                    )}
                  </div>

                  {/* Task progress */}
                  {total > 0 && (
                    <div className="flex items-center gap-2 mb-3.5">
                      <CheckSquare className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: done === total ? "var(--success)" : "var(--text-3)" }} />
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${(done / total) * 100}%`, background: "var(--success)" }} />
                      </div>
                      <span className="text-[11.5px] font-semibold tabular-nums flex-shrink-0" style={{ color: "var(--text-3)" }}>
                        {done}/{total}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    {p.deadline ? (
                      <span className="flex items-center gap-1 text-[11.5px] font-medium"
                        style={{ color: overdue ? "var(--danger)" : "var(--text-3)" }}>
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(p.deadline)}
                      </span>
                    ) : <span />}
                    <Link href={`/tasks?projectId=${p.id}`}
                      className="text-[12px] font-semibold transition-opacity hover:opacity-70"
                      style={{ color: "var(--accent)" }}>
                      Zobrazit úkoly →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={!!sharing} onClose={() => setSharing(null)} title={`Sdílet projekt s klientem`}>
        {sharing && (
          <div className="pt-1">
            <p className="text-[12.5px] mb-3" style={{ color: "var(--text-3)" }}>
              Klient přes odkaz uvidí postup projektu a stav úkolů — bez cen, sazeb a interních dat.
            </p>
            <ShareSheet resourceType="project" resourceId={sharing.id}
              chatMessage={`📋 Projekt ${sharing.name}`} />
          </div>
        )}
      </Modal>

      <Modal
        open={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? "Upravit projekt" : "Nový projekt"}
      >
        <ProjectForm
          key={editing?.id ?? `new-${prefillClientId}`}
          project={editing}
          clients={clients}
          prefillClientId={prefillClientId}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
          onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
        />
      </Modal>
    </div>
  );
}

function ProjectForm({
  project, clients, prefillClientId, onCancel, onSaved,
}: {
  project?: Project | null;
  clients: Client[];
  prefillClientId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: (project?.status ?? "active") as ProjectStatus,
    color: project?.color ?? PROJECT_COLORS[0],
    budget: project?.budget ? String(project.budget) : "",
    startDate: project?.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : "",
    deadline: project?.deadline ? new Date(project.deadline).toISOString().slice(0, 10) : "",
    clientId: project?.clientId ?? prefillClientId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      budget: form.budget ? Number(form.budget) : null,
      startDate: form.startDate || null,
      deadline: form.deadline || null,
      clientId: form.clientId || null,
    };
    const res = await fetch(project ? `/api/projects/${project.id}` : "/api/projects", {
      method: project ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({})))?.error ?? "Nepodařilo se uložit");
  };

  const clientOptions = [
    { value: "", label: "Bez klienta (interní)" },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <form onSubmit={submit} className="space-y-3 pt-1">
      <Input label="Název projektu *" value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Např. WEB – Španělština v Jesu" />

      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Popis</label>
        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
          className="w-full text-[13.5px] rounded-xl px-3 py-2.5 border outline-none resize-none focus:border-[var(--accent)]"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-1)" }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Klient" options={clientOptions} value={form.clientId}
          onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} />
        <Select label="Status" value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
          options={STATUSES.map((s) => ({ value: s.key, label: s.label }))} />
        <Input label="Začátek" type="date" value={form.startDate}
          onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
        <Input label="Deadline" type="date" value={form.deadline}
          onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
      </div>

      <Input label="Rozpočet (Kč)" type="number" min="0" step="1000" placeholder="Např. 50000"
        value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />

      <div>
        <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--text-2)" }}>Barva</label>
        <div className="flex items-center gap-2">
          {PROJECT_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))}
              className="w-7 h-7 rounded-full transition-all hover:scale-110"
              style={{ background: c, boxShadow: form.color === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}` : undefined }} />
          ))}
        </div>
      </div>

      {error && <p className="text-[12.5px]" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Ukládám…" : project ? "Uložit změny" : "Vytvořit projekt"}
        </Button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-[13.5px] font-semibold border transition-all hover:bg-[var(--hover)]"
          style={{ borderColor: "var(--border-md)", color: "var(--text-2)" }}>
          Zrušit
        </button>
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsContent />
    </Suspense>
  );
}
