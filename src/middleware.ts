import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protect everything except Next internals, the auth API, the ingest API
  // (secret-protected), static assets and the logo.
  matcher: [
    "/((?!api/auth|api/leads/ingest|_next/static|_next/image|favicon.ico|logo.jpg).*)",
  ],
};
