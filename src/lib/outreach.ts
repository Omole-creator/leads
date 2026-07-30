import type { CompanyContact, Prisma, PrismaClient } from "@prisma/client";
import { field, parseCsv, toCsv } from "./csv";
import { blankToNull, isOutreachRequirement } from "./outreach-constants";
import type { OutreachRequirement } from "./outreach-constants";

export { blankToNull };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Every optional text column, in one place. */
export const CONTACT_TEXT_FIELDS = [
  "firstName",
  "companyName",
  "jobTitle",
  "industry",
  "companySize",
  "location",
  "hiringRoles",
  "hiringSource",
  "triggerEvent",
  "personalization",
] as const;

export type ContactTextField = (typeof CONTACT_TEXT_FIELDS)[number];

export interface ContactInput {
  email: string;
  firstName?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  companySize?: string | null;
  location?: string | null;
  hiringRoles?: string | null;
  hiringSource?: string | null;
  triggerEvent?: string | null;
  personalization?: string | null;
  batchId?: string | null;
}

/** Accepted CSV header names per field (matched case-insensitively). */
export const CSV_ALIASES: Record<ContactTextField | "email", string[]> = {
  email: ["email", "email address", "e-mail", "work email"],
  firstName: ["first name", "firstname", "first", "name", "contact name"],
  companyName: ["company", "company name", "organisation", "organization"],
  jobTitle: ["job title", "title", "jobtitle", "role", "position"],
  industry: ["industry", "sector", "vertical"],
  companySize: ["company size", "size", "headcount", "employees"],
  location: ["location", "city", "country", "based in"],
  hiringRoles: [
    "hiring role",
    "hiring roles",
    "role hiring for",
    "open role",
    "open roles",
    "vacancy",
  ],
  hiringSource: ["hiring source", "source", "found via", "where found"],
  triggerEvent: ["trigger", "trigger event", "event", "recent event", "signal"],
  personalization: ["personalization", "personalisation", "note", "notes"],
};

/**
 * Export column order. The headers double as import aliases (parseCsv
 * lower-cases them), so an exported file re-imports without editing.
 */
export const EXPORT_HEADERS = [
  "First Name",
  "Company",
  "Job Title",
  "Email",
  "Industry",
  "Company Size",
  "Location",
  "Hiring Role",
  "Hiring Source",
  "Trigger",
  "Personalization",
  "Batch",
  "Imported At",
  "Unsubscribed",
  "Last Emailed At",
] as const;

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface OutreachFilters {
  /** Free text across email, company and first name. */
  q?: string;
  /** A batch id, or "none" for contacts with no batch. */
  batchId?: string;
  /** Date IMPORTED into the app, not any send date. */
  addedFrom?: Date;
  addedTo?: Date;
  industry?: string;
  jobTitle?: string;
  location?: string;
  companySize?: string;
  hiringSource?: string;
  /** Tick-boxes: the contact must HAVE each of these fields filled in. */
  require?: OutreachRequirement[];
  /** Never emailed, or not emailed since this date. */
  notEmailedSince?: Date;
  /** List view only. The send path always forces unsubscribed:false. */
  includeUnsubscribed?: boolean;
  /** The composer's per-row tick list. */
  onlyIds?: string[];
}

export function outreachWhere(
  f: OutreachFilters = {},
): Prisma.CompanyContactWhereInput {
  const where: Prisma.CompanyContactWhereInput = {};
  const and: Prisma.CompanyContactWhereInput[] = [];

  if (f.q) {
    and.push({
      OR: [
        { email: { contains: f.q, mode: "insensitive" } },
        { companyName: { contains: f.q, mode: "insensitive" } },
        { firstName: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }

  if (f.batchId) where.batchId = f.batchId === "none" ? null : f.batchId;

  if (f.addedFrom || f.addedTo) {
    where.importedAt = {
      ...(f.addedFrom ? { gte: f.addedFrom } : {}),
      ...(f.addedTo ? { lte: f.addedTo } : {}),
    };
  }

  // Facet options come from the DB itself, so these can match exactly. Job
  // title is the exception: "Head of Talent" and "Head of Talent Acquisition"
  // are the same person to us.
  if (f.industry) where.industry = f.industry;
  if (f.location) where.location = f.location;
  if (f.companySize) where.companySize = f.companySize;
  if (f.hiringSource) where.hiringSource = f.hiringSource;
  if (f.jobTitle)
    where.jobTitle = { contains: f.jobTitle, mode: "insensitive" };

  for (const k of f.require ?? []) {
    and.push({ [k]: { not: null } } as Prisma.CompanyContactWhereInput);
  }

  if (f.notEmailedSince) {
    and.push({
      OR: [
        { lastEmailedAt: null },
        { lastEmailedAt: { lt: f.notEmailedSince } },
      ],
    });
  }

  if (!f.includeUnsubscribed) where.unsubscribed = false;
  if (f.onlyIds) where.id = { in: f.onlyIds };

  if (and.length) where.AND = and;
  return where;
}

/**
 * `<input type="date">` gives "2026-07-31", which parses to midnight UTC. Using
 * that as `lte` silently drops everything imported that day, so push it to the
 * last millisecond.
 */
export function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(23, 59, 59, 999);
  return out;
}

/** Filters as they travel over the wire (dates as "YYYY-MM-DD" strings). */
export interface OutreachFiltersDTO {
  q?: string;
  batchId?: string;
  addedFrom?: string;
  addedTo?: string;
  industry?: string;
  jobTitle?: string;
  location?: string;
  companySize?: string;
  hiringSource?: string;
  require?: OutreachRequirement[];
  notEmailedSince?: string;
  includeUnsubscribed?: boolean;
}

const asDate = (s: string | undefined): Date | undefined => {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export function toOutreachFilters(
  dto: OutreachFiltersDTO = {},
): OutreachFilters {
  const addedTo = asDate(dto.addedTo);
  return {
    q: dto.q || undefined,
    batchId: dto.batchId || undefined,
    addedFrom: asDate(dto.addedFrom),
    addedTo: addedTo ? endOfDay(addedTo) : undefined,
    industry: dto.industry || undefined,
    jobTitle: dto.jobTitle || undefined,
    location: dto.location || undefined,
    companySize: dto.companySize || undefined,
    hiringSource: dto.hiringSource || undefined,
    require: dto.require?.length ? dto.require : undefined,
    notEmailedSince: asDate(dto.notEmailedSince),
    includeUnsubscribed: dto.includeUnsubscribed,
  };
}

/** Read the same filter shape out of a URL query string. */
export function filtersFromParams(sp: URLSearchParams): OutreachFiltersDTO {
  const req = (sp.get("require") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isOutreachRequirement);
  const get = (k: string) => sp.get(k) || undefined;
  return {
    q: get("q"),
    batchId: get("batchId"),
    addedFrom: get("addedFrom"),
    addedTo: get("addedTo"),
    industry: get("industry"),
    jobTitle: get("jobTitle"),
    location: get("location"),
    companySize: get("companySize"),
    hiringSource: get("hiringSource"),
    require: req.length ? req : undefined,
    notEmailedSince: get("notEmailedSince"),
    includeUnsubscribed: sp.get("includeUnsubscribed") === "1",
  };
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export function listContacts(
  prisma: PrismaClient,
  f: OutreachFilters = {},
  opts: { take?: number; skip?: number } = {},
) {
  return prisma.companyContact.findMany({
    where: outreachWhere(f),
    include: { batch: true },
    orderBy: [{ importedAt: "desc" }, { email: "asc" }],
    take: opts.take,
    skip: opts.skip,
  });
}

export function countContacts(prisma: PrismaClient, f: OutreachFilters = {}) {
  return prisma.companyContact.count({ where: outreachWhere(f) });
}

export interface OutreachFacets {
  industries: string[];
  jobTitles: string[];
  locations: string[];
  companySizes: string[];
  hiringSources: string[];
}

/** Distinct non-null values, so the dropdowns only offer what actually exists. */
export async function outreachFacets(
  prisma: PrismaClient,
): Promise<OutreachFacets> {
  const rows = await prisma.companyContact.findMany({
    select: {
      industry: true,
      jobTitle: true,
      location: true,
      companySize: true,
      hiringSource: true,
    },
  });
  const uniq = (vals: (string | null)[]) =>
    [...new Set(vals.filter((v): v is string => !!v))].sort((a, b) =>
      a.localeCompare(b),
    );
  return {
    industries: uniq(rows.map((r) => r.industry)),
    jobTitles: uniq(rows.map((r) => r.jobTitle)),
    locations: uniq(rows.map((r) => r.location)),
    companySizes: uniq(rows.map((r) => r.companySize)),
    hiringSources: uniq(rows.map((r) => r.hiringSource)),
  };
}

// ─── Import ──────────────────────────────────────────────────────────────────

export interface OutreachImportResult {
  created: number;
  updated: number;
  skipped: number;
  batchId: string;
}

/** Map one parsed CSV row to a contact, or null when the email is unusable. */
export function rowToContact(
  row: Record<string, string>,
): Omit<ContactInput, "batchId"> | null {
  const email = field(row, CSV_ALIASES.email).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  const out: Omit<ContactInput, "batchId"> = { email };
  for (const k of CONTACT_TEXT_FIELDS) {
    out[k] = blankToNull(field(row, CSV_ALIASES[k]));
  }
  return out;
}

const CHUNK = 500;

/**
 * Rows may be missing everything except an email; that is the normal case for a
 * scraped list. Only a bad or absent email gets a row rejected.
 *
 * Writes go through chunked createMany rather than a row-per-row loop: a few
 * thousand sequential creates blow the serverless function timeout, and the
 * runtime DATABASE_URL is the pgbouncer transaction pooler, where interactive
 * $transaction callbacks are not available.
 */
export async function importContactsFromCsv(
  prisma: PrismaClient,
  csvText: string,
  batchName: string,
  opts: { updateExisting?: boolean } = {},
): Promise<OutreachImportResult> {
  const rows = parseCsv(csvText);
  let skipped = 0;

  // First occurrence of an email wins; later repeats inside the same file are
  // counted as skipped rather than silently overwriting.
  const byEmail = new Map<string, Omit<ContactInput, "batchId">>();
  for (const row of rows) {
    const contact = rowToContact(row);
    if (!contact || byEmail.has(contact.email)) {
      skipped++;
      continue;
    }
    byEmail.set(contact.email, contact);
  }

  const batch =
    (await prisma.outreachBatch.findUnique({ where: { name: batchName } })) ??
    (await prisma.outreachBatch.create({ data: { name: batchName } }));

  const all = [...byEmail.values()];
  const existing = await prisma.companyContact.findMany({
    where: { email: { in: all.map((c) => c.email) } },
    select: { id: true, email: true },
  });
  const existingByEmail = new Map(existing.map((e) => [e.email, e.id]));

  const fresh = all.filter((c) => !existingByEmail.has(c.email));
  let created = 0;
  for (let i = 0; i < fresh.length; i += CHUNK) {
    const res = await prisma.companyContact.createMany({
      data: fresh
        .slice(i, i + CHUNK)
        .map((c) => ({ ...c, batchId: batch.id, importedAt: new Date() })),
      skipDuplicates: true,
    });
    created += res.count;
  }

  let updated = 0;
  const dupes = all.filter((c) => existingByEmail.has(c.email));
  if (opts.updateExisting) {
    // Values differ per row, so this cannot be an updateMany. Kept in small
    // parallel batches to stay well inside the function timeout.
    for (let i = 0; i < dupes.length; i += 20) {
      await Promise.all(
        dupes.slice(i, i + 20).map((c) =>
          prisma.companyContact.update({
            where: { email: c.email },
            data: { ...c, batchId: batch.id, importedAt: new Date() },
          }),
        ),
      );
      updated += Math.min(20, dupes.length - i);
    }
  } else {
    skipped += dupes.length;
  }

  return { created, updated, skipped, batchId: batch.id };
}

// ─── Export ──────────────────────────────────────────────────────────────────

type ContactWithBatch = CompanyContact & { batch?: { name: string } | null };

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** Every column for every row, blank where we never learned the value. */
export function contactsToCsv(contacts: ContactWithBatch[]): string {
  return toCsv(
    [...EXPORT_HEADERS],
    contacts.map((c) => ({
      "First Name": c.firstName,
      Company: c.companyName,
      "Job Title": c.jobTitle,
      Email: c.email,
      Industry: c.industry,
      "Company Size": c.companySize,
      Location: c.location,
      "Hiring Role": c.hiringRoles,
      "Hiring Source": c.hiringSource,
      Trigger: c.triggerEvent,
      Personalization: c.personalization,
      Batch: c.batch?.name ?? "",
      "Imported At": iso(c.importedAt),
      Unsubscribed: c.unsubscribed ? "yes" : "",
      "Last Emailed At": iso(c.lastEmailedAt),
    })),
  );
}

// ─── Templating ──────────────────────────────────────────────────────────────

/**
 * {{token}} values for one contact. A NULL column becomes "" so renderTemplate
 * falls through to the template's `|fallback` instead of leaving a hole.
 */
export function outreachVars(c: CompanyContact): Record<string, string> {
  return {
    first_name: c.firstName ?? "",
    company: c.companyName ?? "",
    job_title: c.jobTitle ?? "",
    hiring_role: c.hiringRoles ?? "",
    industry: c.industry ?? "",
    personalization: c.personalization ?? "",
    trigger: c.triggerEvent ?? "",
    location: c.location ?? "",
  };
}
