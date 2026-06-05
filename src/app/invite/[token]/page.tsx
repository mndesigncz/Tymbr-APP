"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckSquare, Mail, Lock, User, Users } from "lucide-react";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { data: session, status: sessionStatus } = useSession();

  const [invitation, setInvitation] = useState<{
    email: string;
    role: string;
    team: { name: string };
  } | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [form, setForm] = useState({ name: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/invitations/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setInviteError(d.error);
        else setInvitation(d);
      })
      .catch(() => setInviteError("Chyba při načítání pozvánky"));
  }, [token]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // Logged-in user accepting their own invite directly
  const handleAcceptLoggedIn = async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/invitations/${token}`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Nepodařilo se přijmout pozvánku");
      return;
    }
    router.push("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    if (form.password !== form.confirm) { setError("Hesla se neshodují"); return; }
    if (form.password.length < 6) { setError("Heslo musí mít alespoň 6 znaků"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: invitation.email,
        password: form.password,
        inviteToken: token,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Registrace selhala");
      return;
    }

    // Auto sign in after joining
    await signIn("credentials", {
      email: invitation.email,
      password: form.password,
      callbackUrl: "/dashboard",
    });
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-page)" }}>
      <div className="w-full max-w-[360px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
            style={{ background: "var(--accent)" }}>
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          {invitation ? (
            <>
              <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>
                Jsi pozvaný do týmu
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <p className="text-[15px] font-bold" style={{ color: "var(--accent)" }}>
                  {invitation.team.name}
                </p>
              </div>
              <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
                Vytvoř si účet a začni spolupracovat
              </p>
            </>
          ) : inviteError ? (
            <>
              <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Pozvánka neplatná</h1>
              <p className="text-[13px] mt-2 text-center" style={{ color: "var(--text-3)" }}>{inviteError}</p>
              <Link href="/login" className="mt-4 text-[13px] font-medium" style={{ color: "var(--accent)" }}>
                Přihlásit se
              </Link>
            </>
          ) : (
            <div className="w-6 h-6 border-2 rounded-full animate-spin mt-4"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          )}
        </div>

        {/* Already logged in and email matches → one-click accept */}
        {invitation && sessionStatus !== "loading" && session?.user?.email?.toLowerCase() === invitation.email.toLowerCase() && (
          <div className="rounded-xl border p-5 space-y-3"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
            <p className="text-[13.5px] text-center" style={{ color: "var(--text-2)" }}>
              Jsi přihlášen/a jako <strong>{session!.user.email}</strong>.
            </p>
            {error && <p className="text-[12px] text-red-400 text-center">{error}</p>}
            <Button onClick={handleAcceptLoggedIn} loading={loading} className="w-full">
              Přijmout pozvánku
            </Button>
          </div>
        )}

        {/* Not logged in, or logged in with a different email → show register form */}
        {invitation && sessionStatus !== "loading" && session?.user?.email?.toLowerCase() !== invitation.email.toLowerCase() && (
          <div className="rounded-xl border p-5 space-y-3"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-md)" }}>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: "var(--bg-subtle)" }}>
              <Mail className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
              <span className="text-[13px]" style={{ color: "var(--text-2)" }}>{invitation.email}</span>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                label="Celé jméno"
                type="text"
                placeholder="Jan Novák"
                value={form.name}
                onChange={set("name")}
                icon={<User className="w-3.5 h-3.5" />}
                required
              />
              <Input
                label="Heslo"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                icon={<Lock className="w-3.5 h-3.5" />}
                required
              />
              <Input
                label="Potvrdit heslo"
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={set("confirm")}
                icon={<Lock className="w-3.5 h-3.5" />}
                required
              />
              {error && <p className="text-[12px] text-red-400 px-1">{error}</p>}
              <Button type="submit" loading={loading} className="w-full" style={{ marginTop: "4px" }}>
                Vytvořit účet a připojit se
              </Button>
            </form>
          </div>
        )}

        {invitation && (
          <p className="text-center text-[12px] mt-4" style={{ color: "var(--text-3)" }}>
            Máte účet?{" "}
            <Link href="/login" className="font-medium hover:opacity-80" style={{ color: "var(--accent)" }}>
              Přihlásit se
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
