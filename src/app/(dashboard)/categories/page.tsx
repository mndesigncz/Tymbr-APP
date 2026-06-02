"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { Category } from "@/types";
import { Plus, Tag, Trash2, Edit2, CheckSquare } from "lucide-react";
import Link from "next/link";

const COLORS = [
  "#F97316", "#3B82F6", "#22C55E", "#EAB308", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F59E0B", "#6366F1",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", color: "#F97316" });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", color: "#F97316" });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, color: cat.color });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    if (editing) {
      await fetch(`/api/categories/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
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

  return (
    <div>
      <Header
        title="Kategorie"
        subtitle="Spravujte kategorie úkolů"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={openNew}>
            <span className="hidden sm:inline">Nová kategorie</span>
          </Button>
        }
      />

      <div className="px-6 lg:px-8 pt-6 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {categories.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20"
                style={{ color: "var(--text-3)" }}>
                <Tag className="w-10 h-10 mb-3" />
                <p className="text-[14px] font-medium" style={{ color: "var(--text-2)" }}>Žádné kategorie</p>
                <p className="text-[13px] mt-1">Vytvořte první kategorii</p>
                <Button icon={<Plus className="w-3.5 h-3.5" />} className="mt-4" onClick={openNew}>
                  Nová kategorie
                </Button>
              </div>
            )}
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="border rounded-xl p-4 transition-all group"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-md)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${cat.color}15` }}>
                    <Tag className="w-4 h-4" style={{ color: cat.color }} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.05] hover:text-[var(--text-1)]"
                      style={{ color: "var(--text-3)" }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                      style={{ color: "var(--text-3)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[13.5px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>{cat.name}</p>
                <Link href={`/tasks?categoryId=${cat.id}`}>
                  <div className="flex items-center gap-1.5 text-[12px] transition-colors hover:opacity-80"
                    style={{ color: "var(--text-3)" }}>
                    <CheckSquare className="w-3 h-3" />
                    {cat._count?.tasks ?? 0} úkolů
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Upravit kategorii" : "Nová kategorie"}
      >
        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Název kategorie"
            placeholder="Např. Marketing, Vývoj..."
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />

          <div>
            <label className="text-[12px] font-medium block mb-2" style={{ color: "var(--text-2)" }}>Barva</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: form.color === c ? `3px solid ${c}` : undefined,
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Zrušit
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {editing ? "Uložit" : "Vytvořit"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
