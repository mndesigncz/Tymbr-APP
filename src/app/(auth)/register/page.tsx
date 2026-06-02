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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-page)" }}>
      <div className="w-full max-w-[340px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
            style={{ background: "var(--accent)" }}>
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Registrace do Tymbr</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>Vytvořte si nový účet</p>
        </div>

        <div className="rounded-xl border p-5 space-y-3"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input label="Celé jméno" type="text" placeholder="Jan Novák"
              value={form.name} onChange={set("name")}
              icon={<User className="w-3.5 h-3.5" />} required />
            <Input label="Email" type="email" placeholder="vas@email.cz"
              value={form.email} onChange={set("email")}
              icon={<Mail className="w-3.5 h-3.5" />} required />
            <Input label="Heslo" type="password" placeholder="••••••••"
              value={form.password} onChange={set("password")}
              icon={<Lock className="w-3.5 h-3.5" />} required />
            <Input label="Potvrdit heslo" type="password" placeholder="••••••••"
              value={form.confirm} onChange={set("confirm")}
              icon={<Lock className="w-3.5 h-3.5" />} required />

            {error && <p className="text-[12px] text-red-400 px-1">{error}</p>}

            <Button type="submit" loading={loading} className="w-full" style={{ marginTop: "4px" }}>
              Registrovat se
            </Button>
          </form>
        </div>

        <p className="text-center text-[12px] mt-4" style={{ color: "var(--text-3)" }}>
          Máte účet?{" "}
          <Link href="/login" className="font-medium hover:opacity-80 transition-opacity"
            style={{ color: "var(--accent)" }}>
            Přihlásit se
          </Link>
        </p>
      </div>
    </div>
  );
}
