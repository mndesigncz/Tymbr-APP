"use client";

import { useTeamBranding } from "@/hooks/useTeamBranding";

// Mounting this triggers the team-branding fetch which applies the team's
// accent color to the :root CSS variables. Renders nothing.
export function TeamBrandingLoader() {
  useTeamBranding();
  return null;
}
