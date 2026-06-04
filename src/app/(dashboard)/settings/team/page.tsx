"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Users, Mail, Trash2, Crown, Copy, Check, Plus, Hash, UserPlus, X } from "lucide-react";
import type { Team, TeamMember, TeamInvitation, TeamRole } from "@/types";
import { ROLE_LABELS } from "@/types";
import { switchTeam, refreshTeams } from "@/hooks/useTeams";

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
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/teams");
    const data = await res.json();
    setTeam(data);
    setTeamName(data?.name ?? "");
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    const res = await fetch("/api/teams/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    setInviting(false);
    if (!res.ok) { const d = await res.json(); setInviteError(d.error || "Chyba"); return; }
    setInviteEmail("");
    load();
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
                      {isMemberOwner && <Crown className="w-3.5 h-3.5" style={{ color: "#f7592f" }} />}
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
