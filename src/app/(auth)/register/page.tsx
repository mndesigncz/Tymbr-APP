"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", teamName: "" });
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
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, teamName: form.teamName }),
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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #f7592f 0%, #ff7a5a 35%, #ffab8a 70%, #ffd0b5 100%)" }}
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute bottom-16 -left-16 w-56 h-56 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
            <NoisiumMark size={18} />
          </div>
          <span className="text-white font-bold text-[19px] tracking-tight">Noisium</span>
        </div>

        <div className="relative z-10 space-y-5">
          <div>
            <p className="text-[13px] font-semibold mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>
              Začínáte dnes
            </p>
            <h2 className="text-[34px] font-bold leading-[1.15] text-white">
              Váš tým<br />začíná zde.
            </h2>
          </div>
          <p className="text-[14.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            Vytvořte si tým za 30 sekund a ihned začněte přidělovat úkoly a komunikovat.
          </p>
          <div className="space-y-2.5 pt-2">
            {["Bezplatná registrace", "Okamžitý přístup", "Žádná kreditní karta"].map((f) => (
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

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-[380px] py-6">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <NoisiumMark size={16} />
            </div>
            <span className="font-bold text-[17px] tracking-tight" style={{ color: "#1a1a1f" }}>Noisium</span>
          </div>

          <div className="mb-6">
            <span className="text-[36px] font-black leading-none" style={{ color: "var(--accent)" }}>✦</span>
            <h1 className="text-[28px] font-bold tracking-tight mt-4 mb-1.5" style={{ color: "#1a1a1f" }}>
              Vytvořit účet
            </h1>
            <p className="text-[14px]" style={{ color: "#9a9aa2" }}>
              Přístup k úkolům, poznámkám a projektům kdykoliv, kdekoliv.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {[
              { label: "Celé jméno", field: "name", type: "text", placeholder: "Jan Novák" },
              { label: "Váš email", field: "email", type: "email", placeholder: "jan@firma.cz" },
              { label: "Název týmu (volitelné)", field: "teamName", type: "text", placeholder: "Můj tým" },
              { label: "Heslo", field: "password", type: "password", placeholder: "••••••••••" },
              { label: "Potvrdit heslo", field: "confirm", type: "password", placeholder: "••••••••••" },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field} className="space-y-1">
                <label className="text-[12.5px] font-semibold" style={{ color: "#6b6b72" }}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[field as keyof typeof form]}
                  onChange={set(field)}
                  required={field !== "teamName"}
                  autoComplete={type === "password" ? "new-password" : type === "email" ? "email" : "off"}
                  className="w-full text-[14px] px-4 py-3 rounded-xl border outline-none transition-all"
                  style={{ background: "#f9f9fa", borderColor: "#e5e5e8", color: "#1a1a1f" }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(247,89,47,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e5e5e8"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            ))}

            {error && (
              <div className="px-3 py-2.5 rounded-xl text-[12.5px]" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-[14.5px] text-white transition-all mt-1 disabled:opacity-60 hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#1a1a1f" }}
            >
              {loading ? "Registruji…" : "Vytvořit účet"}
            </button>
          </form>

          <p className="text-center text-[13px] mt-5" style={{ color: "#9a9aa2" }}>
            Máte účet?{" "}
            <Link href="/login" className="font-semibold transition-opacity hover:opacity-70" style={{ color: "var(--accent)" }}>
              Přihlásit se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function NoisiumMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M4 15V5L10 13V5M10 13V15M10 13L16 5V15"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
