import { z } from "zod";

// Ingest captures only the 6 owner-confirmed fields. No amountPaid (the form
// has no payment field); leads start at amountPaid=0, balanceLeft=track.cost.
export const ingestSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(1).max(50),
  trackSelected: z.string().min(1), // matched to Track.name case-insensitively
  startTimeline: z.string().min(1).max(200), // -> Cohort (find or create)
  howFoundUs: z.string().min(1).max(500),
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
  role: z.enum(["ADMIN", "SALES_REP"]).default("SALES_REP"),
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
});
