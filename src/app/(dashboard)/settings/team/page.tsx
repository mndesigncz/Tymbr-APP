"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Users, Mail, Trash2, Crown, Copy, Check, Plus, Hash, UserPlus, X, Palette, Image as ImageIcon, RefreshCw, AlertTriangle } from "lucide-react";
import type { Team, TeamMember, TeamInvitation, TeamRole } from "@/types";
import { ROLE_LABELS } from "@/types";
import { switchTeam, refreshTeams } from "@/hooks/useTeams";
import { setTeamBranding, refreshTeamBranding, applyAccent } from "@/hooks/useTeamBranding";

const COLOR_PRESETS = [
  "#f7592f", "#EF4444", "#F97316", "#EAB308",
  "#22C55E", "#14B8A6", "#3B82F6", "#6366F1",
  "#8B5CF6", "#EC4899", "#64748B", "#0EA5E9",
];

// Resize an uploaded logo to a small square data URL so it stays tiny.
function fileToLogoDataUrl(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ROLE_OPTIONS = [
  { value: "owner", label: "Vlastník" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Člen" },
];

interface JoinRequest {
  id: string;
  status: string;
  message?: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; avatar?: string | null };
}

interface CreateJoinProps {
  title: string;
  subtitle: string;
  onCreated: (team: Team) => void | Promise<void>;
  onCancel?: () => void;
}

function CreateJoinForms({ title, subtitle, onCreated, onCancel }: CreateJoinProps) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/teams/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName.trim() }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Chyba");
      setLoading(false);
      return;
    }
    const team = await res.json();
    await onCreated(team);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/teams/join-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: joinCode.trim(), message: joinMessage }),
    });
    setLoading(false);
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Chyba"); return; }
    setSuccess(`Žádost o přidání do týmu „${d.teamName}" byla odeslána. Čeká na schválení administrátora.`);
  };

  if (success) {
    return (
      <div className="rounded-3xl border p-8 text-center max-w-md mx-auto"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "#22C55E15" }}>
          <Check className="w-6 h-6" style={{ color: "#22C55E" }} />
        </div>
        <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--text-1)" }}>Žádost odeslána</p>
        <p className="text-[13px] mb-5" style={{ color: "var(--text-3)" }}>{success}</p>
        {onCancel && <Button variant="secondary" onClick={onCancel} className="w-full">Zavřít</Button>}
      </div>
    );
  }

  if (mode === "choose") {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="rounded-3xl border p-8 text-center relative" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          {onCancel && (
            <button onClick={onCancel} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/[0.05]" style={{ color: "var(--text-3)" }}>
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--accent-soft)" }}>
            <Users className="w-6 h-6" style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-[16px] font-bold mb-1" style={{ color: "var(--text-1)" }}>{title}</p>
          <p className="text-[13px] mb-6" style={{ color: "var(--text-3)" }}>{subtitle}</p>
          <div className="space-y-3">
            <button
              onClick={() => setMode("create")}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all hover:border-[var(--accent)]"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent)" }}>
                <Plus className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>Vytvořit nový tým</p>
                <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Začni s vlastním týmem a pozvi členy</p>
              </div>
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all hover:border-[var(--accent)]"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border-md)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#3B82F615" }}>
                <Hash className="w-4 h-4" style={{ color: "#3B82F6" }} />
              </div>
              <div className="text-left">
                <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>Připojit se ke týmu</p>
                <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Zadej kód týmu — admin tě schválí</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="max-w-md mx-auto">
        <button onClick={() => setMode("choose")} className="flex items-center gap-1.5 mb-4 text-[13px] font-medium hover:opacity-80" style={{ color: "var(--text-3)" }}>
          <X className="w-4 h-4" /> Zpět
        </button>
        <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--text-1)" }}>Vytvořit tým</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Název týmu" placeholder="Např. Marketing team" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">Vytvořit tým</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <button onClick={() => setMode("choose")} className="flex items-center gap-1.5 mb-4 text-[13px] font-medium hover:opacity-80" style={{ color: "var(--text-3)" }}>
        <X className="w-4 h-4" /> Zpět
      </button>
      <div className="rounded-3xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--text-1)" }}>Připojit se ke týmu</h2>
        <form onSubmit={handleJoin} className="space-y-4">
          <Input label="Kód týmu" placeholder="např. a1b2c3d4e5" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} icon={<Hash className="w-3.5 h-3.5" />} required />
          <Input label="Zpráva (volitelné)" placeholder="Představ se adminu..." value={joinMessage} onChange={(e) => setJoinMessage(e.target.value)} />
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Odeslat žádost</Button>
        </form>
      </div>
    </div>
  );
}

function NoTeamView() {
  return (
    <div className="mt-8">
      <CreateJoinForms
        title="Nejsi součástí žádného týmu"
        subtitle="Vytvoř nový tým nebo se připoj k existujícímu"
        onCreated={() => window.location.reload()}
      />
    </div>
  );
}

function TeamSettingsContent() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [team, setTeam] = useState<(Team & { joinRequests?: JoinRequest[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowAdd(true);
  }, [searchParams]);

  const closeAdd = useCallback(() => {
    setShowAdd(false);
    if (searchParams.get("new")) router.replace("/settings/team");
  }, [searchParams, router]);

  const handleTeamCreated = useCallback(async (created: Team) => {
    await refreshTeams();
    await switchTeam(created.id, session?.user?.teamId ?? null, update);
  }, [session, update]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [emailWarning, setEmailWarning] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [color, setColor] = useState<string>("#f7592f");
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/teams");
    const data = await res.json();
    setTeam(data);
    setTeamName(data?.name ?? "");
    if (data?.color) setColor(data.color);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isOwnerOrAdmin = team?.ownerId === session?.user?.id ||
    (team?.members as TeamMember[])?.find((m) => m.userId === session?.user?.id)?.role === "admin";

  const handleSaveName = async () => {
    if (!teamName.trim()) return;
    setSavingName(true);
    await fetch("/api/teams", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: teamName }) });
    setSavingName(false);
    load();
  };

  const saveBranding = async (patch: { color?: string | null; logo?: string | null }) => {
    setSavingBranding(true);
    setBrandingMsg("");
    try {
      const res = await fetch("/api/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setBrandingMsg(d.error || "Uložení selhalo");
        return false;
      }
      await refreshTeamBranding();
      await load();
      setBrandingMsg("Uloženo");
      return true;
    } finally {
      setSavingBranding(false);
    }
  };

  const handleColorSelect = (hex: string) => {
    setColor(hex);
    applyAccent(hex); // instant preview
    setTeamBranding({ color: hex });
    saveBranding({ color: hex });
  };

  const handleResetColor = () => {
    setColor("#f7592f");
    applyAccent(null);
    setTeamBranding({ color: null });
    saveBranding({ color: null });
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setBrandingMsg("Vyber prosím obrázek"); return; }
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      setTeamBranding({ logo: dataUrl });
      await saveBranding({ logo: dataUrl });
    } catch {
      setBrandingMsg("Logo se nepodařilo načíst");
    } finally {
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setTeamBranding({ logo: null });
    saveBranding({ logo: null });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setEmailWarning("");
    const res = await fetch("/api/teams/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    setInviting(false);
    if (!res.ok) { const d = await res.json(); setInviteError(d.error || "Chyba"); return; }
    const d = await res.json();
    if (d.emailSent === false) {
      setEmailWarning("Pozvánka vytvořena, ale e-mail se nepodařilo odeslat. Zkopírujte odkaz ručně.");
    }
    setInviteEmail("");
    load();
  };

  const handleResendInvitation = async (id: string) => {
    setResendingId(id);
    const res = await fetch("/api/teams/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setResendingId(null);
    const d = await res.json().catch(() => ({}));
    if (!d.emailSent) {
      setEmailWarning("E-mail se nepodařilo znovu odeslat. Zkopírujte odkaz ručně.");
    } else {
      setEmailWarning("");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Opravdu chceš odebrat tohoto člena?")) return;
    await fetch("/api/teams/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    load();
  };

  const handleChangeRole = async (userId: string, role: string) => {
    await fetch("/api/teams/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) });
    load();
  };

  const handleDeleteInvitation = async (id: string) => {
    await fetch("/api/teams/invitations", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const handleJoinRequest = async (requestId: string, action: "approve" | "reject") => {
    await fetch("/api/teams/join-request", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, action }) });
    load();
  };

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const copyJoinCode = () => {
    if (!(team as any)?.joinCode) return;
    navigator.clipboard.writeText((team as any).joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div>
        <Header title="Tým" subtitle="Správa členů a pozvánek" />
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 border-[2.5px] rounded-full animate-spin"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div>
        <Header title="Tým" subtitle="Správa členů a pozvánek" />
        <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12">
          <NoTeamView />
        </div>
      </div>
    );
  }

  const joinRequests: JoinRequest[] = (team as any).joinRequests ?? [];

  return (
    <div>
      <Header
        title="Tým"
        subtitle={team.name}
        actions={
          <Button variant="secondary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>
            Přidat tým
          </Button>
        }
      />

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.4)" }} onClick={closeAdd}>
          <div className="w-full max-w-md my-8" onClick={(e) => e.stopPropagation()}>
            <CreateJoinForms
              title="Přidat tým"
              subtitle="Vytvoř další tým nebo se připoj k existujícímu"
              onCreated={handleTeamCreated}
              onCancel={closeAdd}
            />
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-6 max-w-3xl">
        {/* Join code */}
        {(team as any).joinCode && (
          <div className="rounded-3xl border p-5"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>Kód pro připojení</p>
                <p className="text-[20px] font-bold tracking-widest font-mono" style={{ color: "var(--text-1)" }}>
                  {(team as any).joinCode}
                </p>
                <p className="text-[12px] mt-1" style={{ color: "var(--text-3)" }}>Sdílej tento kód — zájemce pošle žádost, ty ji schválíš</p>
              </div>
              <button onClick={copyJoinCode}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all hover:bg-black/[0.03]"
                style={copiedCode
                  ? { background: "#22C55E15", color: "#22C55E", borderColor: "#22C55E" }
                  : { background: "var(--bg-subtle)", borderColor: "var(--border-md)", color: "var(--text-2)" }}>
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? "Zkopírováno" : "Kopírovat"}
              </button>
            </div>
          </div>
        )}

        {/* Pending join requests — managers only */}
        {isOwnerOrAdmin && joinRequests.length > 0 && (
          <div className="rounded-3xl border overflow-hidden"
            style={{ background: "var(--bg-card)", borderColor: "rgba(234,179,8,0.3)", boxShadow: "var(--shadow-sm)" }}>
            <div className="px-6 pt-5 pb-3">
              <p className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>
                Žádosti o přidání ({joinRequests.length})
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {joinRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar name={req.user.name} src={req.user.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>{req.user.name}</p>
                    <p className="text-[12px]" style={{ color: "var(--text-3)" }}>{req.user.email}</p>
                    {req.message && <p className="text-[12px] mt-0.5 italic" style={{ color: "var(--text-2)" }}>„{req.message}"</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => handleJoinRequest(req.id, "approve")}
                      icon={<UserPlus className="w-3.5 h-3.5" />}>
                      Přijmout
                    </Button>
                    <button onClick={() => handleJoinRequest(req.id, "reject")}
                      className="p-2 rounded-xl transition-colors hover:bg-red-50 hover:text-red-500"
                      style={{ color: "var(--text-3)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team name */}
        <div className="rounded-3xl border p-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--text-1)" }}>Název týmu</h2>
          <div className="flex gap-3">
            <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Název týmu" disabled={!isOwnerOrAdmin} />
            {isOwnerOrAdmin && <Button onClick={handleSaveName} loading={savingName} variant="secondary">Uložit</Button>}
          </div>
        </div>

        {/* Team appearance — managers only */}
        {isOwnerOrAdmin && (
          <div className="rounded-3xl border p-6"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Palette className="w-[18px] h-[18px]" style={{ color: "var(--accent)" }} />
              <h2 className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>Vzhled týmu</h2>
              {savingBranding && <span className="text-[11px] ml-auto" style={{ color: "var(--text-3)" }}>Ukládám…</span>}
              {!savingBranding && brandingMsg && (
                <span className="text-[11px] ml-auto" style={{ color: brandingMsg === "Uloženo" ? "#16A34A" : "#EF4444" }}>{brandingMsg}</span>
              )}
            </div>
            <p className="text-[12.5px] mb-5" style={{ color: "var(--text-3)" }}>
              Barva a logo se projeví v celé aplikaci pro všechny členy týmu.
            </p>

            {/* Logo */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative group">
                {(team as any).logo ? (
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm" style={{ background: "var(--bg-subtle)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={(team as any).logo} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: color }}>
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105"
                  style={{ background: "var(--accent)", color: "#fff" }}
                  title="Nahrát logo"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold" style={{ color: "var(--text-1)" }}>Logo týmu</p>
                <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Čtvercový obrázek, ideálně 256×256 px</p>
                {(team as any).logo && (
                  <button type="button" onClick={handleRemoveLogo}
                    className="text-[12px] font-medium mt-1.5 inline-flex items-center gap-1 transition-colors hover:opacity-80"
                    style={{ color: "#EF4444" }}>
                    <Trash2 className="w-3 h-3" /> Odebrat logo
                  </button>
                )}
              </div>
            </div>

            {/* Accent color */}
            <p className="text-[13px] font-medium mb-2.5" style={{ color: "var(--text-2)" }}>Barva týmu</p>
            <div className="flex flex-wrap items-center gap-2.5">
              {COLOR_PRESETS.map((preset) => {
                const selected = color.toLowerCase() === preset.toLowerCase();
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleColorSelect(preset)}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ background: preset, outline: selected ? "2px solid var(--text-1)" : "none", outlineOffset: "2px" }}
                    title={preset}
                  >
                    {selected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
              {/* Custom color */}
              <label className="w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors hover:border-[var(--accent)] relative overflow-hidden"
                style={{ borderColor: "var(--border-md)" }} title="Vlastní barva">
                <Palette className="w-4 h-4" style={{ color: "var(--text-3)" }} />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </div>
            <button type="button" onClick={handleResetColor}
              className="text-[12px] font-medium mt-4 transition-colors hover:opacity-80"
              style={{ color: "var(--text-3)" }}>
              Obnovit výchozí barvu
            </button>
          </div>
        )}

        {/* Members */}
        <div className="rounded-3xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>
              Členové ({team.members?.length ?? 0})
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {(team.members as TeamMember[])?.map((member) => {
              const isMe = member.userId === session?.user?.id;
              const isMemberOwner = member.role === "owner";
              return (
                <div key={member.id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar name={member.user?.name ?? "?"} src={member.user?.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold flex items-center gap-1.5" style={{ color: "var(--text-1)" }}>
                      {member.user?.name}
                      {isMemberOwner && <Crown className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />}
                      {isMe && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>Já</span>}
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--text-3)" }}>{member.user?.email}</p>
                  </div>
                  {isOwnerOrAdmin && !isMemberOwner && !isMe ? (
                    <div className="flex items-center gap-2">
                      <Select options={ROLE_OPTIONS.filter((r) => r.value !== "owner")} value={member.role} onChange={(e) => handleChangeRole(member.userId, e.target.value)} />
                      <button onClick={() => handleRemoveMember(member.userId)} className="p-2 rounded-xl transition-colors hover:bg-red-50 hover:text-red-500" style={{ color: "var(--text-3)" }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[12.5px] font-semibold px-2.5 py-1 rounded-xl" style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}>
                      {ROLE_LABELS[member.role as TeamRole] ?? member.role}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite */}
        {isOwnerOrAdmin && (
          <div className="rounded-3xl border p-6"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--text-1)" }}>Pozvat e-mailem</h2>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input type="email" placeholder="email@priklad.cz" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} icon={<Mail className="w-3.5 h-3.5" />} />
                </div>
                <Select options={ROLE_OPTIONS.filter((r) => r.value !== "owner")} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamRole)} />
                <Button type="submit" loading={inviting}>Pozvat</Button>
              </div>
              {inviteError && <p className="text-[12px] text-red-400">{inviteError}</p>}
              {emailWarning && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[12px]" style={{ background: "#fef3c7", color: "#92400e" }}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{emailWarning}</span>
                </div>
              )}
            </form>

            {(team.invitations as TeamInvitation[])?.length > 0 && (
              <div className="mt-5 space-y-2">
                <p className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>Čekající pozvánky</p>
                {(team.invitations as TeamInvitation[]).map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "var(--bg-subtle)" }}>
                    <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>{inv.email}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{ROLE_LABELS[inv.role as TeamRole]} · čeká na přijetí</p>
                    </div>
                    <button onClick={() => handleResendInvitation(inv.id)} disabled={resendingId === inv.id} className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.05] disabled:opacity-50" title="Znovu odeslat e-mail" style={{ color: "var(--text-3)" }}>
                      <RefreshCw className={`w-3.5 h-3.5 ${resendingId === inv.id ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={() => copyInviteLink(inv.token)} className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.05]" title="Kopírovat odkaz" style={{ color: "var(--text-3)" }}>
                      {copiedToken === inv.token ? <Check className="w-3.5 h-3.5" style={{ color: "#22C55E" }} /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDeleteInvitation(inv.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500" style={{ color: "var(--text-3)" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamSettingsPage() {
  return (
    <Suspense>
      <TeamSettingsContent />
    </Suspense>
  );
}
