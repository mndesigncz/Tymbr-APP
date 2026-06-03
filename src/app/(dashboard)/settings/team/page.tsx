"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Users, Mail, Trash2, Crown, Copy, Check } from "lucide-react";
import type { Team, TeamMember, TeamInvitation, TeamRole } from "@/types";
import { ROLE_LABELS } from "@/types";

const ROLE_OPTIONS = [
  { value: "owner", label: "Vlastník" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Člen" },
];

export default function TeamSettingsPage() {
  const { data: session } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
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

  const isOwner = team?.ownerId === session?.user?.id;

  const handleSaveName = async () => {
    if (!teamName.trim()) return;
    setSavingName(true);
    await fetch("/api/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName }),
    });
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
    if (!res.ok) {
      const d = await res.json();
      setInviteError(d.error || "Chyba");
      return;
    }
    setInviteEmail("");
    load();
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Opravdu chceš odebrat tohoto člena?")) return;
    await fetch("/api/teams/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    load();
  };

  const handleChangeRole = async (userId: string, role: string) => {
    await fetch("/api/teams/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    load();
  };

  const handleDeleteInvitation = async (id: string) => {
    await fetch("/api/teams/invitations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div>
        <Header title="Nastavení týmu" subtitle="Správa členů a pozvánek" />
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
        <Header title="Nastavení týmu" subtitle="Správa členů a pozvánek" />
        <div className="px-6 lg:px-8 pt-6">
          <div className="rounded-3xl border p-8 text-center"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "var(--text-3)" }} />
            <p className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>Nejsi součástí žádného týmu</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Nastavení týmu" subtitle={team.name} />

      <div className="px-6 lg:px-8 pt-2 pb-12 space-y-6 max-w-3xl">
        {/* Team name */}
        <div className="rounded-3xl border p-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--text-1)" }}>Název týmu</h2>
          <div className="flex gap-3">
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Název týmu"
              disabled={!isOwner}
            />
            {isOwner && (
              <Button onClick={handleSaveName} loading={savingName} variant="secondary">
                Uložit
              </Button>
            )}
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
                      {isMe && (
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                          style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>
                          Já
                        </span>
                      )}
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--text-3)" }}>{member.user?.email}</p>
                  </div>
                  {isOwner && !isMemberOwner && !isMe ? (
                    <div className="flex items-center gap-2">
                      <Select
                        options={ROLE_OPTIONS.filter((r) => r.value !== "owner")}
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                      />
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-2 rounded-xl transition-colors hover:bg-red-50 hover:text-red-500"
                        style={{ color: "var(--text-3)" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[12.5px] font-semibold px-2.5 py-1 rounded-xl"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}>
                      {ROLE_LABELS[member.role as TeamRole] ?? member.role}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite */}
        <div className="rounded-3xl border p-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--text-1)" }}>Pozvat člena</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="email@priklad.cz"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  icon={<Mail className="w-3.5 h-3.5" />}
                />
              </div>
              <Select
                options={ROLE_OPTIONS.filter((r) => r.value !== "owner")}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamRole)}
              />
              <Button type="submit" loading={inviting}>
                Pozvat
              </Button>
            </div>
            {inviteError && <p className="text-[12px] text-red-400">{inviteError}</p>}
          </form>

          {/* Pending invitations */}
          {(team.invitations as TeamInvitation[])?.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>
                Čekající pozvánky
              </p>
              {(team.invitations as TeamInvitation[]).map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: "var(--bg-subtle)" }}>
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>{inv.email}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                      {ROLE_LABELS[inv.role as TeamRole]} · čeká na přijetí
                    </p>
                  </div>
                  <button
                    onClick={() => copyInviteLink(inv.token)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.05]"
                    title="Kopírovat odkaz"
                    style={{ color: "var(--text-3)" }}
                  >
                    {copiedToken === inv.token
                      ? <Check className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
                      : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDeleteInvitation(inv.id)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                    style={{ color: "var(--text-3)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
