import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

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
        if (session.teamId !== undefined) token.teamId = session.teamId;
        if (session.teamRole !== undefined) token.teamRole = session.teamRole;
      }

      // Re-fetch team membership when teamId is absent (e.g. after team creation/join)
      if (token.id && (token.teamId === null || token.teamId === undefined)) {
        try {
          const member = await prisma.teamMember.findFirst({
            where: { userId: token.id as string },
            select: { teamId: true, role: true },
            orderBy: { joinedAt: "asc" },
          });
          token.teamId = member?.teamId ?? null;
          token.teamRole = member?.role ?? null;
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
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
