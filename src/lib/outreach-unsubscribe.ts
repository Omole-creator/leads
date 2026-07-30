import { createHmac, timingSafeEqual } from "crypto";

// The unsubscribe link is public: anyone who receives the email can click it
// without logging in. A signed token keeps that from becoming "anyone can
// unsubscribe anyone" by guessing ids. Keyed on AUTH_SECRET, which every
// deployment already sets, so this adds no new env var.
const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export function unsubscribeToken(contactId: string): string {
  return createHmac("sha256", SECRET)
    .update(`unsubscribe:${contactId}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(
  contactId: string,
  token: string,
): boolean {
  const expected = Buffer.from(unsubscribeToken(contactId));
  const given = Buffer.from(token ?? "");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(contactId: string): string {
  return `${APP_URL}/api/outreach/unsubscribe?c=${contactId}&t=${unsubscribeToken(contactId)}`;
}
