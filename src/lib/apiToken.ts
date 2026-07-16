import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "./prisma";

// Personal Bearer tokens for external clients (macOS app, integrations).
// Only a SHA-256 hash is stored; the raw token is shown to the user once.

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateToken(): { raw: string; hash: string; prefix: string } {
  const raw = "tymbr_" + crypto.randomBytes(24).toString("base64url");
  return { raw, hash: hashToken(raw), prefix: raw.slice(0, 12) };
}

// Mirror of the session's team resolution (custom role → member/finance + perms).
function resolveMembership(member: {
  role: string;
  permissions: string | null;
  customRole?: { finance: boolean; permissions: string } | null;
}): { teamRole: string; permissions: string | null } {
  if (member.customRole) {
    return {
      teamRole: member.customRole.finance ? "finance" : "member",
      permissions: member.customRole.permissions ?? "[]",
    };
  }
  return { teamRole: member.role, permissions: member.permissions ?? null };
}

// Build a session-shaped object from an Authorization: Bearer <token> header,
// or null if there's no valid token. Same user shape the rest of the app reads.
export async function sessionFromBearer(): Promise<any | null> {
  let authHeader: string | null = null;
  try {
    authHeader = (await headers()).get("authorization");
  } catch {
    return null;
  }
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;

  const tok = await prisma.personalToken.findUnique({
    where: { tokenHash: hashToken(m[1].trim()) },
    select: { id: true, userId: true },
  });
  if (!tok) return null;

  const user = await prisma.user.findUnique({
    where: { id: tok.userId },
    select: { id: true, name: true, email: true, avatar: true, role: true },
  });
  if (!user) return null;

  const member = await prisma.teamMember.findFirst({
    where: { userId: user.id },
    select: { teamId: true, role: true, permissions: true, customRole: { select: { finance: true, permissions: true } } },
    orderBy: { joinedAt: "asc" },
  });
  const resolved = member ? resolveMembership(member) : { teamRole: null, permissions: null };

  // Touch lastUsedAt (fire-and-forget).
  prisma.personalToken.update({ where: { id: tok.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.avatar,
      role: user.role,
      teamId: member?.teamId ?? null,
      teamRole: resolved.teamRole,
      permissions: resolved.permissions,
    },
  };
}
