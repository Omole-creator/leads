import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe base config (no Prisma here). Used by both middleware and the
 * full server config. Route protection: redirect unauthenticated users to
 * /login; role checks happen in server components and API routes.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [Google],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute = nextUrl.pathname.startsWith("/login");
      if (isAuthRoute) {
        if (isLoggedIn)
          return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
