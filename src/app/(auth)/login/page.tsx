"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckSquare, Mail, Lock } from "lucide-react";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setError("Nesprávný email nebo heslo");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-page)" }}>
      <div className="w-full max-w-[340px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
            style={{ background: "var(--accent)" }}>
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Přihlásit se do Noisium</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>Zadejte své přihlašovací údaje</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border p-5 space-y-4"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Email"
              type="email"
              placeholder="vas@email.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-3.5 h-3.5" />}
              required
              autoComplete="email"
            />
            <Input
              label="Heslo"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-3.5 h-3.5" />}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="text-[12px] text-red-400 px-1">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full" style={{ marginTop: "4px" }}>
              Přihlásit se
            </Button>
          </form>
        </div>

        <p className="text-center text-[12px] mt-4" style={{ color: "var(--text-3)" }}>
          Nemáte účet?{" "}
          <Link href="/register" className="font-medium hover:opacity-80 transition-opacity"
            style={{ color: "var(--accent)" }}>
            Registrovat se
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
