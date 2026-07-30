// Shared vocabulary for the cold-outreach feature.
//
// This module deliberately imports nothing. src/lib/email.ts reads process.env
// at module scope and must never reach a client component, so the pieces the
// composer needs (sender names, requirement ids, token names) live here instead.

/**
 * What a recipient sees before they open the email. Only the display name
 * changes — every identity sends from RESEND_FROM_EMAIL (contact@jobmingle.co).
 */
export const SENDER_IDENTITIES = [
  { id: "LIMITED", name: "JobMingle Limited" },
  { id: "ACADEMY", name: "JobMingle Academy" },
  { id: "OMOLE", name: "Omole" },
] as const;

export type SenderIdentityId = (typeof SENDER_IDENTITIES)[number]["id"];

export const SENDER_IDENTITY_IDS = SENDER_IDENTITIES.map((s) => s.id) as [
  SenderIdentityId,
  ...SenderIdentityId[],
];

export function senderName(id: SenderIdentityId): string {
  return SENDER_IDENTITIES.find((s) => s.id === id)?.name ?? "JobMingle Limited";
}

/**
 * The tick-boxes. Each one narrows a send to contacts that actually have that
 * field filled in, so a template that leans on {{hiring_role}} is never sent to
 * someone whose hiring role we never found out.
 */
export const OUTREACH_REQUIREMENTS = [
  "firstName",
  "companyName",
  "jobTitle",
  "hiringRoles",
  "industry",
  "personalization",
  "triggerEvent",
] as const;

export type OutreachRequirement = (typeof OUTREACH_REQUIREMENTS)[number];

export const REQUIREMENT_LABELS: Record<OutreachRequirement, string> = {
  firstName: "Has first name",
  companyName: "Has company name",
  jobTitle: "Has job title",
  hiringRoles: "Has a role they're hiring for",
  industry: "Has industry",
  personalization: "Has personalization note",
  triggerEvent: "Has trigger event",
};

export function isOutreachRequirement(v: string): v is OutreachRequirement {
  return (OUTREACH_REQUIREMENTS as readonly string[]).includes(v);
}

/** Every token a template may use. Guarded by tests/unit/outreach-templates.test.ts. */
export const OUTREACH_TOKENS = [
  "first_name",
  "company",
  "job_title",
  "hiring_role",
  "industry",
  "personalization",
  "trigger",
  "location",
] as const;

export type OutreachToken = (typeof OUTREACH_TOKENS)[number];

export const OUTREACH_VARIANT_IDS = ["A", "B", "C", "D"] as const;
export type OutreachVariantId = (typeof OUTREACH_VARIANT_IDS)[number];

/**
 * "" and whitespace become null. The whole feature depends on this: a missing
 * field must be NULL so the "has this field" filters can be a plain
 * `{ not: null }`, and so a fallback token fires instead of rendering a gap.
 * Lives here, not in outreach.ts, so schemas.ts can use it as a zod transform
 * without dragging the Prisma-facing service module into the bundle.
 */
export function blankToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}
