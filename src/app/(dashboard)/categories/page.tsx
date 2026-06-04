"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { Category } from "@/types";
import { Plus, Tag, Trash2, Edit2, CheckSquare, Settings2, Eye, EyeOff, GripVertical, Flag, AlertCircle } from "lucide-react";
import Link from "next/link";
import { refreshStatusConfig } from "@/hooks/useStatusConfig";
import { refreshPriorityConfig } from "@/hooks/usePriorityConfig";

const COLORS = [
  "#F97316", "#3B82F6", "#22C55E", "#EAB308", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F59E0B", "#6366F1",
];

interface StatusConfig {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
  showInFocus: boolean;
  isBuiltin: boolean;
}

interface PriorityConfig {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
  isUrgent: boolean;
  isBuiltin: boolean;
}

export default function CategoriesPage() {
  const [pageTab, setPageTab] = useState<"categories" | "statuses" | "priorities">("categories");

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", color: "#F97316" });
  const [saving, setSaving] = useState(false);

  // Statuses state
  const [statuses, setStatuses] = useState<StatusConfig[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusConfig | null>(null);
  const [statusForm, setStatusForm] = useState({ label: "", color: "#8B5CF6", showInFocus: true });
  const [savingStatus, setSavingStatus] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Priorities state
  const [priorities, setPriorities] = useState<PriorityConfig[]>([]);
  const [prioLoading, setPrioLoading] = useState(false);
  const [prioModal, setPrioModal] = useState(false);
  const [editingPrio, setEditingPrio] = useState<PriorityConfig | null>(null);
  const [prioForm, setPrioForm] = useState({ label: "", color: "#8B5CF6" });
  const [savingPrio, setSavingPrio] = useState(false);

  const fetchCategories = async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
    setCatLoading(false);
  };

  const fetchStatuses = async () => {
    setStatusLoading(true);
    const res = await fetch("/api/teams/status-config");
    const data = await res.json();
    setStatuses(Array.isArray(data) ? data : []);
    setStatusLoading(false);
  };

  const fetchPriorities = async () => {
    setPrioLoading(true);
    const res = await fetch("/api/teams/priority-config");
    const data = await res.json();
    setPriorities(Array.isArray(data) ? data : []);
    setPrioLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => {
    if (pageTab === "statuses") fetchStatuses();
    if (pageTab === "priorities") fetchPriorities();
  }, [pageTab]);

  const openNewPrio = () => { setEditingPrio(null); setPrioForm({ label: "", color: "#8B5CF6" }); setPrioModal(true); };
  const openEditPrio = (p: PriorityConfig) => { setEditingPrio(p); setPrioForm({ label: p.label, color: p.color }); setPrioModal(true); };

  const handleSavePrio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prioForm.label.trim()) return;
    setSavingPrio(true);
    if (editingPrio) {
      await fetch("/api/teams/priority-config", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingPrio.id, label: prioForm.label, color: prioForm.color }),
      });
    } else {
      await fetch("/api/teams/priority-config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prioForm),
      });
    }
    setSavingPrio(false);
    setPrioModal(false);
    await fetchPriorities();
    refreshPriorityConfig();
  };

  const handleDeletePrio = async (id: string) => {
    if (!confirm("Smazat tuto prioritu?")) return;
    await fetch("/api/teams/priority-config", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchPriorities();
    refreshPriorityConfig();
  };

  const openNew = () => { setEditing(null); setForm({ name: "", color: "#F97316" }); setModalOpen(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setForm({ name: cat.name, color: cat.color }); setModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      await fetch(`/api/categories/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false);
    setModalOpen(false);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Smazat tuto kategorii?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    fetchCategories();
  };

  const openNewStatus = () => {
    setEditingStatus(null);
    setStatusForm({ label: "", color: "#8B5CF6", showInFocus: true });
    setStatusModal(true);
  };
  const openEditStatus = (s: StatusConfig) => {
    setEditingStatus(s);
    setStatusForm({ label: s.label, color: s.color, showInFocus: s.showInFocus });
    setStatusModal(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusForm.label.trim()) return;
    setSavingStatus(true);
    if (editingStatus) {
      await fetch("/api/teams/status-config", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingStatus.id, ...statusForm }),
      });
    } else {
      await fetch("/api/teams/status-config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusForm),
      });
    }
    setSavingStatus(false);
    setStatusModal(false);
    await fetchStatuses();
    refreshStatusConfig();
  };

  const handleDeleteStatus = async (id: string) => {
    if (!confirm("Smazat tento stav?")) return;
    await fetch("/api/teams/status-config", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchStatuses();
    refreshStatusConfig();
  };

  const handleToggleFocus = async (s: StatusConfig) => {
    await fetch("/api/teams/status-config", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, showInFocus: !s.showInFocus }),
    });
    await fetchStatuses();
    refreshStatusConfig();
  };

  // Drag-and-drop reordering — reflowed locally, then persisted per changed row.
  const handleReorder = async (toId: string) => {
    const fromId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (!fromId || fromId === toId) return;

    const fromIdx = statuses.findIndex((s) => s.id === fromId);
    const toIdx = statuses.findIndex((s) => s.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...statuses];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const withOrder = reordered.map((s, i) => ({ ...s, order: i }));
    const prevOrder = new Map(statuses.map((s) => [s.id, s.order]));
    setStatuses(withOrder); // optimistic

    await Promise.all(
      withOrder
        .filter((s) => prevOrder.get(s.id) !== s.order)
        .map((s) =>
          fetch("/api/teams/status-config", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: s.id, order: s.order }),
          })
        )
    );
    refreshStatusConfig();
  };

  return (
    <div>
      <Header
        title="Funkce"
        subtitle="Organizace úkolů"
        actions={
          pageTab === "categories"
            ? <Button icon={<Plus className="w-4 h-4" />} onClick={openNew}><span className="hidden sm:inline">Nová kategorie</span></Button>
            : pageTab === "statuses"
            ? <Button icon={<Plus className="w-4 h-4" />} onClick={openNewStatus}><span className="hidden sm:inline">Nový stav</span></Button>
            : <Button icon={<Plus className="w-4 h-4" />} onClick={openNewPrio}><span className="hidden sm:inline">Nová priorita</span></Button>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        {/* Tab toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl border mb-6 w-fit"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
          <button onClick={() => setPageTab("categories")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={pageTab === "categories" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}>
            <Tag className="w-3.5 h-3.5" />
            Kategorie
          </button>
          <button onClick={() => setPageTab("statuses")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={pageTab === "statuses" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}>
            <Settings2 className="w-3.5 h-3.5" />
            Stavy úkolů
          </button>
          <button onClick={() => setPageTab("priorities")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={pageTab === "priorities" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-2)" }}>
            <Flag className="w-3.5 h-3.5" />
            Priority
          </button>
        </div>

        {/* Categories */}
        {pageTab === "categories" && (
          catLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {categories.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20" style={{ color: "var(--text-3)" }}>
                  <Tag className="w-10 h-10 mb-3" />
                  <p className="text-[14px] font-medium" style={{ color: "var(--text-2)" }}>Žádné kategorie</p>
                  <Button icon={<Plus className="w-3.5 h-3.5" />} className="mt-4" onClick={openNew}>Nová kategorie</Button>
                </div>
              )}
              {categories.map((cat) => (
                <div key={cat.id} className="border rounded-xl p-4 transition-all group"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-md)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${cat.color}15` }}>
                      <Tag className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.05]" style={{ color: "var(--text-3)" }}><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500" style={{ color: "var(--text-3)" }}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-[13.5px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>{cat.name}</p>
                  <Link href={`/tasks?categoryId=${cat.id}`}>
                    <div className="flex items-center gap-1.5 text-[12px] transition-colors hover:opacity-80" style={{ color: "var(--text-3)" }}>
                      <CheckSquare className="w-3 h-3" />
                      {cat._count?.tasks ?? 0} úkolů
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )
        )}

        {/* Statuses */}
        {pageTab === "statuses" && (
          statusLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            </div>
          ) : (
            <div className="space-y-3 max-w-xl">
              <p className="text-[13px] mb-4" style={{ color: "var(--text-3)" }}>
                Přetažením za úchyt změníš pořadí stavů — projeví se i na nástěnce úkolů. Vestavěné stavy lze přejmenovat,
                vlastní stavy lze přidávat i mazat.
              </p>
              {statuses.map((s) => (
                <div key={s.id}
                  draggable
                  onDragStart={() => setDragId(s.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(s.id); }}
                  onDragLeave={() => setDragOverId((cur) => (cur === s.id ? null : cur))}
                  onDrop={(e) => { e.preventDefault(); handleReorder(s.id); }}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border group transition-all"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: dragOverId === s.id && dragId !== s.id ? "var(--accent)" : "var(--border)",
                    opacity: dragId === s.id ? 0.4 : 1,
                  }}>
                  <GripVertical className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-70 cursor-grab active:cursor-grabbing" style={{ color: "var(--text-3)" }} />
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{s.label}</p>
                    <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                      {s.isBuiltin ? "Vestavěný" : "Vlastní"} · klíč: <code className="font-mono">{s.key}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleFocus(s)}
                      title={s.showInFocus ? "Skrýt ve focus módu" : "Zobrazit ve focus módu"}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-medium border transition-all"
                      style={s.showInFocus
                        ? { background: "#22C55E15", color: "#22C55E", borderColor: "#22C55E" }
                        : { background: "var(--bg-subtle)", color: "var(--text-3)", borderColor: "var(--border-md)" }}>
                      {s.showInFocus ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      Focus mód
                    </button>
                    <button onClick={() => openEditStatus(s)} className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.05]" style={{ color: "var(--text-3)" }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!s.isBuiltin && (
                      <button onClick={() => handleDeleteStatus(s.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500" style={{ color: "var(--text-3)" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {statuses.length === 0 && (
                <div className="text-center py-12" style={{ color: "var(--text-3)" }}>
                  <p className="text-[14px] font-medium">Načítání stavů...</p>
                </div>
              )}
            </div>
          )
        )}

        {/* Priorities */}
        {pageTab === "priorities" && (
          prioLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            </div>
          ) : (
            <div className="space-y-3 max-w-xl">
              <p className="text-[13px] mb-4" style={{ color: "var(--text-3)" }}>
                Priority přiřadíš úkolům při jejich vytváření či úpravě. Můžeš si přidat libovolné množství vlastních priorit
                s názvem a barvou. <strong style={{ color: "var(--text-2)" }}>Urgentní</strong> priorita je vždy červená,
                nelze ji smazat — lze ji jen přejmenovat.
              </p>
              {priorities.map((p) => (
                <div key={p.id}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border group transition-all"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold flex items-center gap-1.5" style={{ color: "var(--text-1)" }}>
                      {p.label}
                      {p.isUrgent && <AlertCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />}
                    </p>
                    <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                      {p.isUrgent ? "Urgentní · vždy červená" : "Vlastní priorita"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditPrio(p)} className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.05]" style={{ color: "var(--text-3)" }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!p.isUrgent && (
                      <button onClick={() => handleDeletePrio(p.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500" style={{ color: "var(--text-3)" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {priorities.length === 0 && (
                <div className="text-center py-12" style={{ color: "var(--text-3)" }}>
                  <p className="text-[14px] font-medium">Načítání priorit...</p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Category modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Upravit kategorii" : "Nová kategorie"}>
        <form onSubmit={handleSave} className="space-y-5">
          <Input label="Název kategorie" placeholder="Např. Marketing, Vývoj..." value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <div>
            <label className="text-[12px] font-medium block mb-2" style={{ color: "var(--text-2)" }}>Barva</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: form.color === c ? `3px solid ${c}` : undefined, outlineOffset: "2px" }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Zrušit</Button>
            <Button type="submit" loading={saving} className="flex-1">{editing ? "Uložit" : "Vytvořit"}</Button>
          </div>
        </form>
      </Modal>

      {/* Status modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title={editingStatus ? "Upravit stav" : "Nový stav"}>
        <form onSubmit={handleSaveStatus} className="space-y-5">
          <Input label="Název stavu" placeholder="Např. V testování, Blokováno..." value={statusForm.label} onChange={(e) => setStatusForm((f) => ({ ...f, label: e.target.value }))} required />
          <div>
            <label className="text-[12px] font-medium block mb-2" style={{ color: "var(--text-2)" }}>Barva</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setStatusForm((f) => ({ ...f, color: c }))}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: statusForm.color === c ? `3px solid ${c}` : undefined, outlineOffset: "2px" }} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={statusForm.showInFocus} onChange={(e) => setStatusForm((f) => ({ ...f, showInFocus: e.target.checked }))} className="w-4 h-4 rounded" />
            <div>
              <p className="text-[13.5px] font-medium" style={{ color: "var(--text-1)" }}>Zobrazit ve focus módu</p>
              <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Úkoly v tomto stavu se ukáží ve focus/work módu</p>
            </div>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setStatusModal(false)} className="flex-1">Zrušit</Button>
            <Button type="submit" loading={savingStatus} className="flex-1">{editingStatus ? "Uložit" : "Vytvořit"}</Button>
          </div>
        </form>
      </Modal>

      {/* Priority modal */}
      <Modal open={prioModal} onClose={() => setPrioModal(false)} title={editingPrio ? "Upravit prioritu" : "Nová priorita"}>
        <form onSubmit={handleSavePrio} className="space-y-5">
          <Input label="Název priority" placeholder="Např. Kritická, Počká..." value={prioForm.label} onChange={(e) => setPrioForm((f) => ({ ...f, label: e.target.value }))} required />
          {editingPrio?.isUrgent ? (
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl" style={{ background: "#EF44440F", border: "1px solid rgba(239,68,68,0.22)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#EF4444" }} />
              <p className="text-[12.5px]" style={{ color: "var(--text-2)" }}>Urgentní priorita je vždy červená — lze změnit jen název.</p>
            </div>
          ) : (
            <div>
              <label className="text-[12px] font-medium block mb-2" style={{ color: "var(--text-2)" }}>Barva</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setPrioForm((f) => ({ ...f, color: c }))}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                    style={{ backgroundColor: c, outline: prioForm.color === c ? `3px solid ${c}` : undefined, outlineOffset: "2px" }} />
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPrioModal(false)} className="flex-1">Zrušit</Button>
            <Button type="submit" loading={savingPrio} className="flex-1">{editingPrio ? "Uložit" : "Vytvořit"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
