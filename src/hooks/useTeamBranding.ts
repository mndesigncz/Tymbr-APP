"use client";

import { useState, useEffect } from "react";

export interface TeamBranding {
  color: string | null;
  logo: string | null;
  name: string | null;
}

const DEFAULT_ACCENT = "#f7592f";
const DEFAULT_HOVER = "#e84d24";
const DEFAULT_SOFT = "#fdeee8";

let cache: TeamBranding | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<(b: TeamBranding) => void>();

function clampHex(hex: string): string | null {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : null;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Darken by mixing toward black.
function darken(hex: string, amount = 0.12): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// A pale tint by mixing toward white.
function soften(hex: string, amount = 0.9): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** Apply (or reset) the accent CSS variables on :root. */
export function applyAccent(color: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const valid = color ? clampHex(color) : null;
  if (valid) {
    root.style.setProperty("--accent", valid);
    root.style.setProperty("--accent-hover", darken(valid));
    root.style.setProperty("--accent-soft", soften(valid));
  } else {
    root.style.setProperty("--accent", DEFAULT_ACCENT);
    root.style.setProperty("--accent-hover", DEFAULT_HOVER);
    root.style.setProperty("--accent-soft", DEFAULT_SOFT);
  }
}

function emit() {
  const b = cache ?? { color: null, logo: null, name: null };
  for (const l of listeners) l(b);
  applyAccent(b.color);
}

function load(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/teams", { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      cache = {
        color: data?.color ?? null,
        logo: data?.logo ?? null,
        name: data?.name ?? null,
      };
    } catch {
      cache = { color: null, logo: null, name: null };
    }
    emit();
    inflight = null;
  })();
  return inflight;
}

/** Force a refetch + re-apply (call after saving team branding). */
export function refreshTeamBranding(): Promise<void> {
  cache = null;
  return load();
}

/** Optimistically set branding without a round-trip (used by settings page). */
export function setTeamBranding(b: Partial<TeamBranding>) {
  cache = { color: null, logo: null, name: null, ...(cache ?? {}), ...b };
  emit();
}

export function useTeamBranding(): TeamBranding {
  const [branding, setBranding] = useState<TeamBranding>(cache ?? { color: null, logo: null, name: null });
  useEffect(() => {
    listeners.add(setBranding);
    if (cache) { setBranding(cache); applyAccent(cache.color); }
    else load();
    return () => { listeners.delete(setBranding); };
  }, []);
  return branding;
}
