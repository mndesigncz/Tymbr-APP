"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckSquare, Mail, Lock, ArrowRight } from "lucide-react";

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
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      setError("Nesprávný email nebo heslo");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-10" style={{ background: "var(--accent)" }} />
        <div className="absolute bottom-20 -right-20 w-56 h-56 rounded-full opacity-10" style={{ background: "var(--accent)" }} />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full opacity-5" style={{ background: "#ffffff" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-[18px] tracking-tight">Tymbr</span>
        </div>

        {/* Middle content */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-[32px] font-bold leading-tight text-white mb-3">
              Organizujte práci<br />celého týmu
            </h2>
            <p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              Úkoly, výkazy, chat a přehledy — vše na jednom místě.
            </p>
          </div>

          {/* Feature chips */}
          <div className="space-y-2.5">
            {["Správa úkolů a podúkolů", "Sledování odpracovaného času", "Týmový chat v reálném čase"].map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent)" }} />
                <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="relative z-10 text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          © {new Date().getFullYear()} Tymbr
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10" style={{ background: "var(--bg-page)" }}>
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <CheckSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[17px] tracking-tight" style={{ color: "var(--text-1)" }}>Tymbr</span>
          </div>

          <div className="mb-8">
            <h1 className="text-[26px] font-bold tracking-tight mb-1.5" style={{ color: "var(--text-1)" }}>
              Přihlásit se
            </h1>
            <p className="text-[14px]" style={{ color: "var(--text-3)" }}>
              Vítejte zpět! Zadejte své přihlašovací údaje.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12.5px]" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full group" style={{ marginTop: "8px" }}>
              Přihlásit se
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>

          <p className="text-center text-[13px] mt-6" style={{ color: "var(--text-3)" }}>
            Nemáte účet?{" "}
            <Link href="/register" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: "var(--accent)" }}>
              Registrovat se
            </Link>
          </p>
        </div>
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
