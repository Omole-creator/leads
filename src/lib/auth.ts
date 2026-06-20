import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { authConfig } from "./auth.config";

// Test-only provider: enabled solely when E2E_TEST_MODE=true so Playwright can
// log in as a seeded user without real Google OAuth. NEVER enabled in production.
const testProviders =
  process.env.E2E_TEST_MODE === "true"
    ? [
        Credentials({
          id: "e2e",
          name: "E2E",
          credentials: { email: { label: "Email", type: "text" } },
          async authorize(creds) {
            const email = creds?.email as string | undefined;
            if (!email) return null;
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || !user.active) return null;
            return { id: user.id, name: user.name, email: user.email };
          },
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, ...testProviders],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    // Only allow sign-in for emails that exist as active users in the DB.
    async signIn({ user }) {
      if (!user.email) return false;
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      });
      return !!dbUser && dbUser.active;
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});

/** Server helper: the current session user as { id, role } or null. */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: session.user.role };
}
