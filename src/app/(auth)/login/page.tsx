"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, Lock } from "lucide-react";

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
      {/* Left panel — warm gradient brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #f7592f 0%, #ff7a5a 35%, #ffab8a 70%, #ffd0b5 100%)" }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute bottom-16 -left-16 w-56 h-56 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
            <NoisiumMark size={18} />
          </div>
          <span className="text-white font-bold text-[19px] tracking-tight">Noisium</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-5">
          <div>
            <p className="text-[13px] font-semibold mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>
              Váš pracovní hub
            </p>
            <h2 className="text-[34px] font-bold leading-[1.15] text-white">
              Řiďte tým<br />bez chaosu.
            </h2>
          </div>
          <p className="text-[14.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            Úkoly, komunikace a přehledy — vše na jednom místě, přehledně a rychle.
          </p>

          <div className="space-y-2.5 pt-2">
            {[
              "Správa úkolů a projektů",
              "Týmový chat v reálném čase",
              "Výkazy a sledování času",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.25)" }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.75)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          © {new Date().getFullYear()} Noisium
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <NoisiumMark size={16} color="white" />
            </div>
            <span className="font-bold text-[17px] tracking-tight" style={{ color: "var(--text-1)" }}>Noisium</span>
          </div>

          {/* Decorative asterisk (like BrightNest) */}
          <div className="mb-7">
            <span className="text-[36px] font-black leading-none" style={{ color: "var(--accent)" }}>✦</span>
          </div>

          <div className="mb-7">
            <h1 className="text-[28px] font-bold tracking-tight mb-1.5" style={{ color: "var(--text-1)" }}>
              Přihlásit se
            </h1>
            <p className="text-[14px]" style={{ color: "#9a9aa2" }}>
              Přihlaste se ke svému pracovnímu prostoru.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold" style={{ color: "#6b6b72" }}>Váš email</label>
              <input
                type="email"
                placeholder="jan@firma.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full text-[14px] px-4 py-3 rounded-xl border outline-none transition-all"
                style={{
                  background: "#f9f9fa",
                  borderColor: "#e5e5e8",
                  color: "#1a1a1f",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(247,89,47,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e5e8"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12.5px] font-semibold" style={{ color: "#6b6b72" }}>Heslo</label>
              <input
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full text-[14px] px-4 py-3 rounded-xl border outline-none transition-all"
                style={{
                  background: "#f9f9fa",
                  borderColor: "#e5e5e8",
                  color: "#1a1a1f",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(247,89,47,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e5e8"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12.5px]"
                style={{ background: "#fee2e2", color: "#b91c1c" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-[14.5px] text-white transition-all mt-1 disabled:opacity-60 hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#1a1a1f" }}
            >
              {loading ? "Přihlašování…" : "Přihlásit se"}
            </button>
          </form>

          <p className="text-center text-[13px] mt-6" style={{ color: "#9a9aa2" }}>
            Nemáte účet?{" "}
            <Link href="/register" className="font-semibold transition-opacity hover:opacity-70" style={{ color: "var(--accent)" }}>
              Registrovat se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function NoisiumMark({ size = 20, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M4 15V5L10 13V5M10 13V15M10 13L16 5V15"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
