"use client";

import { useState, useEffect } from "react";

export interface TeamSummary {
  id: string;
  name: string;
  role: string;
  memberCount: number;
}

// Module-level cache so the team list is fetched once and shared across the
// sidebar switcher and the mobile profile menu.
let cache: TeamSummary[] | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<(t: TeamSummary[]) => void>();

function emit() {
  for (const l of listeners) l(cache ?? []);
}

function load(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/users/teams");
      cache = res.ok ? await res.json() : [];
    } catch {
      cache = [];
    }
    emit();
    inflight = null;
  })();
  return inflight;
}

export function refreshTeams(): Promise<void> {
  cache = null;
  return load();
}

export function useTeams(): TeamSummary[] {
  const [teams, setTeams] = useState<TeamSummary[]>(cache ?? []);
  useEffect(() => {
    listeners.add(setTeams);
    if (cache === null) load();
    else setTeams(cache);
    return () => {
      listeners.delete(setTeams);
    };
  }, []);
  return teams;
}

type UpdateFn = (data: Record<string, unknown>) => Promise<unknown>;

// Switches the active team: pushes the new teamId into the JWT (server verifies
// membership), then hard-navigates so every team-scoped query refetches.
export async function switchTeam(
  teamId: string,
  currentTeamId: string | null | undefined,
  update: UpdateFn,
): Promise<void> {
  if (!teamId || teamId === currentTeamId) return;
  await update({ teamId });
  window.location.assign("/dashboard");
}
