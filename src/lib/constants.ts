import type { FollowUpType, Stage } from "@prisma/client";

/** The 7 follow-up steps created for every new lead (all done=false). */
export const FOLLOW_UP_TYPES: FollowUpType[] = [
  "INITIAL_CALL",
  "WHATSAPP",
  "PRICING_SENT",
  "PAYMENT_LINK",
  "PAYMENT_CONFIRMED",
  "FINAL_FOLLOWUP",
  "ONBOARDING",
];

export const STAGES: Stage[] = [
  "NEW",
  "CALLED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "NO_ANSWER",
  "SILENT",
];

export const STAGE_LABELS: Record<Stage, string> = {
  NEW: "New",
  CALLED: "Called",
  CLOSED_WON: "Closed — Won",
  CLOSED_LOST: "Closed — Lost",
  NO_ANSWER: "No Answer",
  SILENT: "Silent",
};

export const FOLLOW_UP_LABELS: Record<FollowUpType, string> = {
  INITIAL_CALL: "Initial Call",
  WHATSAPP: "WhatsApp",
  PRICING_SENT: "Pricing Sent",
  PAYMENT_LINK: "Payment Link",
  PAYMENT_CONFIRMED: "Payment Confirmed",
  FINAL_FOLLOWUP: "Final Follow-up",
  ONBOARDING: "Onboarding",
};
