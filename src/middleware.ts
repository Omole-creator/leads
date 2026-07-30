import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protect everything except Next internals, the auth API, the ingest API
  // (secret-protected), the outreach unsubscribe link (HMAC-signed, and the
  // recipient is a company that has no login), static assets and the logo.
  matcher: [
    "/((?!api/auth|api/leads/ingest|api/outreach/unsubscribe|_next/static|_next/image|favicon.ico|logo.jpg).*)",
  ],
};
