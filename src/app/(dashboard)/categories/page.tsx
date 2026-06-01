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
          <Button icon={<Plus className="w-4 h-4" />} size="sm" onClick={openNew}>
            <span className="hidden sm:inline">Nová kategorie</span>
          </Button>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                <Tag className="w-12 h-12 mb-3 text-gray-700" />
                <p className="text-lg font-medium">Žádné kategorie</p>
                <p className="text-sm mt-1">Vytvořte první kategorii</p>
                <Button icon={<Plus className="w-4 h-4" />} className="mt-4" onClick={openNew}>
                  Nová kategorie
                </Button>
              </div>
            )}
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-5 hover:border-[#3d3d3d] transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <Tag className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-white mb-1">{cat.name}</h3>
                <Link href={`/tasks?categoryId=${cat.id}`}>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    <CheckSquare className="w-3.5 h-3.5" />
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
            <label className="text-sm font-medium text-gray-300 block mb-2">Barva</label>
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
