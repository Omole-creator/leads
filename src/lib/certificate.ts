// Certificate of Completion — the text that goes on the artwork. Pure functions
// only (no DB, no React) so the API route, the dialog defaults and the unit
// tests all derive the same wording.
//
// Every field is auto-filled but EDITABLE in the admin dialog: `ingest.ts`
// auto-creates tracks from whatever the enquiry form sends, so no lookup table
// here can ever be exhaustive. The maps below are a good default, not a gate.
import { DEFAULT_DISPLAY_FONT } from "./certificate-fonts";

export interface CertificateFields {
  /** Recipient's name, printed in the chosen display face. */
  name: string;
  /** Course line, e.g. "PRODUCT DESIGN COURSE". */
  course: string;
  /** Issue date, e.g. "29 JULY, 2026". Always the generation date. */
  issuedOn: string;
  /** Industry phrase dropped into the achievement statement. */
  industry: string;
  /** Display face for the name/course/date — a `DISPLAY_FONTS` id. */
  font: string;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// Keyed by normalized track name. Only tracks whose industry phrase isn't just
// the lower-cased track name need an entry.
const INDUSTRIES: Record<string, string> = {
  "product design": "product (UI/UX) design",
  "product (ui/ux) design": "product (UI/UX) design",
  "ui/ux design": "product (UI/UX) design",
  "ai engineering": "AI engineering",
  "ai and automation": "AI and automation",
  "cloud/devops engineering": "cloud and DevOps engineering",
  "frontend/backend/fullstack": "software development",
  "frontend / backend / fullstack development": "software development",
  "frontend development": "frontend development",
  "backend development": "backend development",
  "fullstack development": "fullstack development",
  fullstack: "fullstack development",
};

/**
 * Industry phrase for the achievement statement. Unknown (auto-created) tracks
 * fall back to the lower-cased track name with a trailing "course" stripped —
 * the admin can correct it in the dialog before sending.
 */
export function certificateIndustry(trackName: string): string {
  const key = norm(trackName);
  const mapped = INDUSTRIES[key];
  if (mapped) return mapped;
  return key.replace(/\s+course$/, "") || "technology";
}

/** Course line: the track name in caps, with " COURSE" appended once. */
export function certificateCourseTitle(trackName: string): string {
  const base = trackName.trim().replace(/\s+/g, " ").toUpperCase();
  if (!base) return "COURSE";
  return base.endsWith("COURSE") ? base : `${base} COURSE`;
}

/** The achievement statement, with the industry placeholder filled in. */
export function certificateStatement(industry: string): string {
  return `This achievement demonstrates a dedication to developing the skills, knowledge, and practical expertise required to make meaningful contributions to the ${industry.trim()} industry.`;
}

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

/** "29 JULY, 2026" — matches the reference certificate's date styling. */
export function formatIssueDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

/** Prefilled certificate fields for a student. `now` defaults to today. */
export function certificateDefaults(
  fullName: string,
  trackName: string,
  now: Date = new Date(),
): CertificateFields {
  return {
    name: fullName.trim(),
    course: certificateCourseTitle(trackName),
    issuedOn: formatIssueDate(now),
    industry: certificateIndustry(trackName),
    font: DEFAULT_DISPLAY_FONT,
  };
}

/** Filename stem for downloads/attachments, e.g. "JobMingle-Certificate-Ada-Obi". */
export function certificateFileName(name: string): string {
  const slug =
    name
      .trim()
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "Student";
  return `JobMingle-Certificate-${slug}`;
}
