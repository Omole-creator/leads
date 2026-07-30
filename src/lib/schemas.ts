import { z } from "zod";
import {
  DISPLAY_FONT_IDS,
  DEFAULT_DISPLAY_FONT,
} from "./certificate-fonts";
import {
  blankToNull,
  OUTREACH_REQUIREMENTS,
  OUTREACH_VARIANT_IDS,
  SENDER_IDENTITY_IDS,
} from "./outreach-constants";

// Ingest captures only the 6 owner-confirmed fields. No amountPaid (the form
// has no payment field); leads start at amountPaid=0, balanceLeft=track.cost.
export const ingestSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  // Optional fields may be blank on the form — defaulted during ingest.
  phone: z.string().max(50).optional().default(""),
  trackSelected: z.string().min(1), // matched to Track.name case-insensitively
  startTimeline: z.string().max(200).optional().default(""), // -> Cohort
  howFoundUs: z.string().max(500).optional().default(""),
});
export type IngestInput = z.infer<typeof ingestSchema>;

export const stageUpdateSchema = z.object({
  stage: z.enum([
    "NEW",
    "CALLED",
    "CLOSED_WON",
    "CLOSED_LOST",
    "NO_ANSWER",
    "SILENT",
  ]),
});

export const followUpUpdateSchema = z.object({
  type: z.enum([
    "INITIAL_CALL",
    "WHATSAPP",
    "PRICING_SENT",
    "PAYMENT_LINK",
    "PAYMENT_CONFIRMED",
    "FINAL_FOLLOWUP",
    "ONBOARDING",
  ]),
  done: z.boolean(),
});

export const noteCreateSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const reassignSchema = z.object({
  assignedRepId: z.string().uuid(),
});

export const repCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["ADMIN", "SALES_REP", "TUTOR"]).default("SALES_REP"),
});

export const repUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  active: z.boolean().optional(),
  role: z.enum(["ADMIN", "SALES_REP"]).optional(),
});

export const cohortCreateSchema = z.object({
  name: z.string().min(1).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  active: z.boolean().optional(),
});

export const cohortUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  active: z.boolean().optional(),
});

export const trackCreateSchema = z.object({
  name: z.string().min(1).max(200),
  cost: z.number().nonnegative(),
  active: z.boolean().optional(),
});

export const trackUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  cost: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
  tutorId: z.string().nullable().optional(),
});

export const studentUpdateSchema = z.object({
  studentStatus: z.enum(["ACTIVE", "COMPLETED", "DEFERRED", "DROPPED"]).optional(),
  studentTrackId: z.string().nullable().optional(),
  cohortId: z.string().optional(),
});

// Certificate of Completion. Every field is admin-editable before export, so
// they arrive as free text rather than being re-derived server-side.
export const certificateFieldsSchema = z.object({
  name: z.string().min(1).max(120),
  course: z.string().min(1).max(160),
  issuedOn: z.string().min(1).max(60),
  industry: z.string().min(1).max(120),
  // Display face for the name/course/date. Enumerated so a request can only
  // ever name a font that is actually vendored.
  font: z.enum(DISPLAY_FONT_IDS).default(DEFAULT_DISPLAY_FONT),
});

export const certificateRenderSchema = certificateFieldsSchema.extend({
  format: z.enum(["png", "pdf"]).default("png"),
  // "1" forces a download; otherwise it renders inline for the live preview.
  download: z.enum(["0", "1"]).optional(),
});

export const certificateSendSchema = certificateFieldsSchema.extend({
  leadId: z.string().min(1),
});

export const attendanceSchema = z.object({
  trackId: z.string().min(1),
  date: z.coerce.date(),
  marks: z.array(
    z.object({ leadId: z.string().min(1), present: z.boolean() }),
  ),
});

// ─── Cold outreach ───────────────────────────────────────────────────────────

// Every optional contact field runs through blankToNull, so "" is not
// representable in the parsed type and can never reach Prisma. That keeps the
// "has this field" send filters honest.
const optionalText = (max: number) =>
  z.string().max(max).optional().nullable().transform(blankToNull);

const contactTextFields = {
  firstName: optionalText(120),
  companyName: optionalText(200),
  jobTitle: optionalText(160),
  industry: optionalText(120),
  companySize: optionalText(60),
  location: optionalText(160),
  hiringRoles: optionalText(300),
  hiringSource: optionalText(120),
  triggerEvent: optionalText(300),
  personalization: optionalText(600),
};

// Trimmed before .email() runs: a pasted address often carries a stray space,
// and rejecting it as invalid would be baffling.
export const companyContactCreateSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .transform((e) => e.toLowerCase()),
  ...contactTextFields,
  batchId: z.string().uuid().optional().nullable(),
});

export const companyContactUpdateSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .optional()
    .transform((e) => (e ? e.toLowerCase() : undefined)),
  ...contactTextFields,
  batchId: z.string().uuid().nullable().optional(),
  unsubscribed: z.boolean().optional(),
});

export const outreachBatchCreateSchema = z.object({
  name: z.string().min(1).max(120),
  note: optionalText(300),
});

export const outreachBatchUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  note: optionalText(300),
});

export const outreachImportSchema = z.object({
  csv: z.string().min(1),
  batchName: z.string().min(1).max(120),
  updateExisting: z.boolean().optional().default(false),
});

/** Filters as they arrive over the wire: dates are ISO strings. */
export const outreachFilterSchema = z.object({
  q: z.string().max(200).optional(),
  batchId: z.string().max(64).optional(),
  addedFrom: z.string().max(40).optional(),
  addedTo: z.string().max(40).optional(),
  industry: z.string().max(120).optional(),
  jobTitle: z.string().max(160).optional(),
  location: z.string().max(160).optional(),
  companySize: z.string().max(60).optional(),
  hiringSource: z.string().max(120).optional(),
  require: z.array(z.enum(OUTREACH_REQUIREMENTS)).optional(),
  notEmailedSince: z.string().max(40).optional(),
  includeUnsubscribed: z.boolean().optional(),
});

export const outreachDraftSchema = z.object({
  subject: z.string().max(300).optional().default(""),
  body: z.string().max(20000).optional().default(""),
  // An enum of ids, never a free-form display name: the value lands in the From
  // header, where a CR/LF would let a caller append headers of its own.
  fromName: z.enum(SENDER_IDENTITY_IDS).default("LIMITED"),
  variant: z.enum(OUTREACH_VARIANT_IDS).optional().nullable(),
  filters: outreachFilterSchema.optional(),
});

export const outreachSendSchema = z.object({
  id: z.string().uuid().optional(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(20000),
  fromName: z.enum(SENDER_IDENTITY_IDS),
  variant: z.enum(OUTREACH_VARIANT_IDS).optional().nullable(),
  filters: outreachFilterSchema.optional().default({}),
  contactIds: z.array(z.string().uuid()).optional(),
});
