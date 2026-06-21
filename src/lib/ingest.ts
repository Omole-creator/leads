import type { PrismaClient } from "@prisma/client";
import { pickNextRep, type ActiveRep } from "./round-robin";
import { sendLeadAssignedEmail } from "./email";
import { FOLLOW_UP_TYPES } from "./constants";
import type { IngestInput } from "./schemas";

export class TrackNotFoundError extends Error {
  constructor(public trackSelected: string) {
    super(`Unknown track: ${trackSelected}`);
    this.name = "TrackNotFoundError";
  }
}

/**
 * Normalize the form's "Interested Skill" into a track name.
 * The email sends e.g. "Cybersecurity - ₦470,000"; we keep only the name part
 * (track names never contain " - "). The seeded price is authoritative.
 */
export function parseTrackName(raw: string): string {
  const idx = raw.indexOf(" - ");
  return (idx === -1 ? raw : raw.slice(0, idx)).trim();
}

/** Extract the price from an "Interested Skill" string, e.g. "... - ₦300,000" -> 300000. */
export function parseTrackPrice(raw: string): number {
  const m = raw.match(/₦\s*([\d,]+)/);
  return m ? Number(m[1].replace(/[^\d]/g, "")) : 0;
}

/** Derive a clean cohort name from the form's "Start Timeline" value. */
export function parseCohortName(raw: string): string {
  return raw.trim();
}

export interface IngestResult {
  id: string;
  assignedRepId: string | null;
  cohortId: string;
  balanceLeft: number;
}

/**
 * Core ingestion: validate track, find/create cohort, round-robin assign,
 * create the lead (amountPaid=0, balanceLeft=track.cost), create 7 follow-ups,
 * write an activity log entry, and notify the assigned rep. Runs in a
 * transaction so concurrent ingests don't double-assign a rep.
 */
export async function ingestLead(
  prisma: PrismaClient,
  input: IngestInput,
): Promise<IngestResult> {
  const trackName = parseTrackName(input.trackSelected);
  const cohortName = parseCohortName(input.startTimeline);

  // Track match by name, case-insensitively. Unknown skills (the form offers
  // options we may not have seeded, e.g. "I'm not sure yet") are auto-created
  // from the email so no lead is ever dropped; admins can tidy tracks later.
  const safeTrackName = trackName || input.trackSelected.trim();
  const track =
    (await prisma.track.findFirst({
      where: { name: { equals: safeTrackName, mode: "insensitive" } },
    })) ??
    (await prisma.track.create({
      data: {
        name: safeTrackName,
        cost: parseTrackPrice(input.trackSelected),
        active: true,
      },
    }));

  const trackCost = Number(track.cost);

  const { lead, rep } = await prisma.$transaction(async (tx) => {
    // Find or create the cohort from the form's Start Timeline.
    const cohort =
      (await tx.cohort.findUnique({ where: { name: cohortName } })) ??
      (await tx.cohort.create({
        data: {
          name: cohortName,
          startDate: new Date(),
          endDate: new Date(),
          active: false,
        },
      }));

    // Round-robin over active reps (least-recently-assigned).
    const activeReps = await tx.user.findMany({
      where: { role: "SALES_REP", active: true },
      select: { id: true, lastAssignedAt: true },
      orderBy: { createdAt: "asc" },
    });
    const assignedRepId = pickNextRep(activeReps as ActiveRep[]);

    const lead = await tx.lead.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        trackId: track.id,
        amountPaid: 0,
        balanceLeft: trackCost,
        howFoundUs: input.howFoundUs,
        startTimeline: input.startTimeline,
        cohortId: cohort.id,
        assignedRepId,
        stage: "NEW",
        followUps: {
          create: FOLLOW_UP_TYPES.map((type) => ({ type, done: false })),
        },
        activityLog: {
          create: {
            action: "LEAD_CREATED",
            newValue: { stage: "NEW", assignedRepId },
          },
        },
      },
    });

    if (assignedRepId) {
      await tx.user.update({
        where: { id: assignedRepId },
        data: { lastAssignedAt: new Date() },
      });
    }

    const rep = assignedRepId
      ? await tx.user.findUnique({ where: { id: assignedRepId } })
      : null;

    return { lead, rep };
  });

  // Fire-and-forget notification (does not throw).
  if (rep) {
    await sendLeadAssignedEmail({
      repName: rep.name,
      repEmail: rep.email,
      leadId: lead.id,
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      trackName: track.name,
      amountPaid: Number(lead.amountPaid),
      balanceLeft: Number(lead.balanceLeft),
      howFoundUs: lead.howFoundUs,
    });
  }

  return {
    id: lead.id,
    assignedRepId: lead.assignedRepId,
    cohortId: lead.cohortId,
    balanceLeft: Number(lead.balanceLeft),
  };
}
