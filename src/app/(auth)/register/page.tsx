"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckSquare, Mail, Lock, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Hesla se neshodují"); return; }
    if (form.password.length < 6) { setError("Heslo musí mít alespoň 6 znaků"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Registrace selhala");
      return;
    }
    router.push("/login?registered=1");
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center mb-4">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Registrace</h1>
          <p className="text-gray-500 text-sm mt-1">Vytvořte si účet v Tymbr</p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Celé jméno"
              type="text"
              placeholder="Jan Novák"
              value={form.name}
              onChange={set("name")}
              icon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="vas@email.cz"
              value={form.email}
              onChange={set("email")}
              icon={<Mail className="w-4 h-4" />}
              required
            />
            <Input
              label="Heslo"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set("password")}
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <Input
              label="Potvrdit heslo"
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={set("confirm")}
              icon={<Lock className="w-4 h-4" />}
              required
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Registrovat se
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Máte účet?{" "}
          <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
            Přihlásit se
          </Link>
        </p>
      </div>
    </div>
  );
}
