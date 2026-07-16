import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// A custom role resolves into the two session fields the app already checks:
// its `finance` flag maps onto the "finance" role (member + billing access),
// and its permission list becomes the member's visible tabs. This keeps every
// existing canSeeTab / canSeeFinance call site working untouched.
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

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Heslo", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      // Fallback for legacy tokens that don't have id set
      if (!token.id && token.sub) token.id = token.sub;

      // Profile / team updates pushed from the client via useSession().update(...)
      if (trigger === "update" && session) {
        if (typeof session.name === "string") token.name = session.name;
        if (session.image !== undefined) token.picture = session.image;
        // Team switch — only honour it if the user really is a member of the
        // target team. Role is read from the membership record, never trusted
        // from the client.
        if (session.teamId !== undefined && token.id) {
          const member = await prisma.teamMember.findFirst({
            where: { userId: token.id as string, teamId: String(session.teamId) },
            select: { teamId: true, role: true, permissions: true, customRole: { select: { finance: true, permissions: true } } },
          });
          if (member) {
            const resolved = resolveMembership(member);
            token.teamId = member.teamId;
            token.teamRole = resolved.teamRole;
            token.permissions = resolved.permissions;
          }
        }
      }

      // Re-fetch team membership when teamId is absent (e.g. after team creation/join)
      if (token.id && (token.teamId === null || token.teamId === undefined)) {
        try {
          const member = await prisma.teamMember.findFirst({
            where: { userId: token.id as string },
            select: { teamId: true, role: true, permissions: true, customRole: { select: { finance: true, permissions: true } } },
            orderBy: { joinedAt: "asc" },
          });
          token.teamId = member?.teamId ?? null;
          const resolved = member ? resolveMembership(member) : { teamRole: null, permissions: null };
          token.teamRole = resolved.teamRole;
          token.permissions = resolved.permissions;
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = (token.id || token.sub) as string;
        session.user.role = token.role as string;
        session.user.teamId = token.teamId as string | null;
        session.user.teamRole = token.teamRole as string | null;
        session.user.permissions = token.permissions as string | null;
        if (typeof token.name === "string") session.user.name = token.name;
        if (token.picture !== undefined) session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getSession() {
  const session = await getServerSession(authOptions);
  if (session) return session;
  // Fall back to a personal Bearer token (external clients, e.g. the macOS app).
  const { sessionFromBearer } = await import("./apiToken");
  const bearer = await sessionFromBearer();
  return bearer as typeof session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
