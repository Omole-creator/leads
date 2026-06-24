import type { PrismaClient, Prisma, Stage, FollowUpType } from "@prisma/client";
import type { SessionUser } from "./permissions";
import { pickNextRep, type ActiveRep } from "./round-robin";
import { parseTrackName, parseTrackPrice, findOrCreateTrack } from "./ingest";
import { parseCsv, field } from "./csv";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface ImportResult {
  created: number;
  skipped: number;
}

/**
 * Bulk-import leads from CSV text into a chosen cohort + segment. Leads are
 * left UNASSIGNED (admin-only visibility until an admin assigns them). Tracks
 * are matched by name or auto-created.
 */
export async function importLeadsFromCsv(
  prisma: PrismaClient,
  csvText: string,
  cohortName: string,
  segment: string,
): Promise<ImportResult> {
  const rows = parseCsv(csvText);
  let created = 0;
  let skipped = 0;

  const cohort =
    (await prisma.cohort.findUnique({ where: { name: cohortName } })) ??
    (await prisma.cohort.create({
      data: {
        name: cohortName,
        startDate: new Date(),
        endDate: new Date(),
        active: false,
      },
    }));

  for (const row of rows) {
    const fullName = field(row, ["full name", "name", "fullname"]);
    const email = field(row, ["email", "email address"]);
    const phone = field(row, ["phone", "whatsapp", "phone number", "mobile"]);
    const trackRaw = field(row, ["track", "interested skill", "skill", "course"]);

    if (!fullName || !EMAIL_RE.test(email)) {
      skipped++;
      continue;
    }

    const trackName = parseTrackName(trackRaw) || "Undecided";
    const track = await findOrCreateTrack(
      prisma,
      trackName,
      parseTrackPrice(trackRaw),
    );

    await prisma.lead.create({
      data: {
        fullName,
        email,
        phone: phone || "N/A",
        trackId: track.id,
        amountPaid: 0,
        balanceLeft: Number(track.cost),
        howFoundUs: segment,
        segment,
        startTimeline: cohortName,
        cohortId: cohort.id,
        assignedRepId: null,
        stage: "NEW",
        activityLog: { create: { action: "IMPORTED", newValue: { segment } } },
      },
    });
    created++;
  }

  return { created, skipped };
}

export interface LeadFilters {
  cohortId?: string;
  repId?: string;
  stage?: Stage;
  trackId?: string;
  segment?: string;
  from?: Date;
  to?: Date;
  /** Email-only: drop CLOSED_WON leads from the result (won leads never get blasts). */
  excludeWon?: boolean;
}

/** Build a where clause scoped to the user (reps see only their own leads). */
export function leadWhere(
  user: SessionUser,
  f: LeadFilters = {},
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  if (user.role !== "ADMIN") {
    where.assignedRepId = user.id; // reps: own leads only
  } else if (f.repId) {
    where.assignedRepId = f.repId;
  }
  if (f.cohortId) where.cohortId = f.cohortId;
  if (f.excludeWon && f.stage === "CLOSED_WON") {
    where.stage = { in: [] }; // match nothing: won leads are never emailed
  } else if (f.stage) {
    where.stage = f.stage;
  } else if (f.excludeWon) {
    where.stage = { not: "CLOSED_WON" };
  }
  if (f.trackId) where.trackId = f.trackId;
  if (f.segment) where.segment = f.segment;
  if (f.from || f.to) {
    where.createdAt = {};
    if (f.from) where.createdAt.gte = f.from;
    if (f.to) where.createdAt.lte = f.to;
  }
  return where;
}

export function listLeads(
  prisma: PrismaClient,
  user: SessionUser,
  f: LeadFilters = {},
) {
  return prisma.lead.findMany({
    where: leadWhere(user, f),
    include: {
      track: true,
      cohort: true,
      assignedRep: true,
      _count: { select: { followUpLogs: true } },
    },
    orderBy: { lastActivityAt: "desc" },
  });
}

export function getLeadDetail(prisma: PrismaClient, id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      track: true,
      cohort: true,
      assignedRep: true,
      followUps: true,
      followUpLogs: {
        include: { by: true },
        orderBy: { createdAt: "desc" },
      },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      activityLog: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

const CLOSED_STAGES: Stage[] = ["CLOSED_WON", "CLOSED_LOST"];

export async function updateStage(
  prisma: PrismaClient,
  user: SessionUser,
  id: string,
  stage: Stage,
) {
  const existing = await prisma.lead.findUniqueOrThrow({ where: { id } });
  const closedAt = stage === "CLOSED_WON" ? new Date() : existing.closedAt;
  // Winning a deal enrolls the lead as a student → routes to that track's tutor.
  const enroll =
    stage === "CLOSED_WON" && !existing.studentTrackId
      ? { studentTrackId: existing.trackId, studentStatus: "ACTIVE" }
      : {};
  return prisma.lead.update({
    where: { id },
    data: {
      stage,
      closedAt: CLOSED_STAGES.includes(stage) ? closedAt ?? new Date() : null,
      ...enroll,
      lastActivityAt: new Date(),
      activityLog: {
        create: {
          userId: user.id,
          action: "STAGE_CHANGED",
          oldValue: { stage: existing.stage },
          newValue: { stage },
        },
      },
    },
  });
}

export async function toggleFollowUp(
  prisma: PrismaClient,
  user: SessionUser,
  leadId: string,
  type: FollowUpType,
  done: boolean,
) {
  await prisma.followUp.update({
    where: { leadId_type: { leadId, type } },
    data: {
      done,
      completedAt: done ? new Date() : null,
      completedById: done ? user.id : null,
    },
  });
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      lastActivityAt: new Date(),
      activityLog: {
        create: {
          userId: user.id,
          action: "FOLLOWUP_TOGGLED",
          newValue: { type, done },
        },
      },
    },
  });
}

export async function addNote(
  prisma: PrismaClient,
  user: SessionUser,
  leadId: string,
  body: string,
) {
  const note = await prisma.note.create({
    data: { leadId, authorId: user.id, body },
  });
  await prisma.lead.update({
    where: { id: leadId },
    data: { lastActivityAt: new Date() },
  });
  return note;
}

export async function reassignLead(
  prisma: PrismaClient,
  user: SessionUser,
  leadId: string,
  assignedRepId: string,
) {
  const existing = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedRepId,
      lastActivityAt: new Date(),
      activityLog: {
        create: {
          userId: user.id,
          action: "REASSIGNED",
          oldValue: { assignedRepId: existing.assignedRepId },
          newValue: { assignedRepId },
        },
      },
    },
  });
}

/** Log one follow-up attempt (closer tapped Reached / No answer). */
export async function addFollowUpLog(
  prisma: PrismaClient,
  user: SessionUser,
  leadId: string,
  reached: boolean,
) {
  await prisma.followUpLog.create({
    data: { leadId, byId: user.id, reached },
  });
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      lastActivityAt: new Date(),
      activityLog: {
        create: {
          userId: user.id,
          action: "FOLLOWUP_LOGGED",
          newValue: { reached },
        },
      },
    },
  });
}

/** Undo the most recent follow-up log on a lead. */
export async function removeLastFollowUpLog(
  prisma: PrismaClient,
  leadId: string,
) {
  const last = await prisma.followUpLog.findFirst({
    where: { leadId },
    orderBy: { createdAt: "desc" },
  });
  if (last) await prisma.followUpLog.delete({ where: { id: last.id } });
  return last;
}

/** Where clause for unassigned leads matching optional list filters. */
export function unassignedWhere(f: LeadFilters = {}): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = { assignedRepId: null };
  if (f.cohortId) where.cohortId = f.cohortId;
  if (f.trackId) where.trackId = f.trackId;
  if (f.stage) where.stage = f.stage;
  if (f.segment) where.segment = f.segment;
  return where;
}

/**
 * Round-robin assign unassigned leads (optionally limited to the given filters)
 * to active closers, oldest first. Returns how many were assigned. Admin-only.
 */
export async function distributeUnassignedLeads(
  prisma: PrismaClient,
  filters: LeadFilters = {},
): Promise<number> {
  const reps = await prisma.user.findMany({
    where: { role: "SALES_REP", active: true },
    select: { id: true, lastAssignedAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (reps.length === 0) return 0;

  const unassigned = await prisma.lead.findMany({
    where: unassignedWhere(filters),
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const state: ActiveRep[] = reps.map((r) => ({
    id: r.id,
    lastAssignedAt: r.lastAssignedAt,
  }));

  let count = 0;
  for (const lead of unassigned) {
    const repId = pickNextRep(state);
    if (!repId) break;
    await prisma.lead.update({
      where: { id: lead.id },
      data: { assignedRepId: repId, lastActivityAt: new Date() },
    });
    const slot = state.find((s) => s.id === repId)!;
    slot.lastAssignedAt = new Date();
    count++;
  }

  // Persist the final assignment clock so future ingests stay balanced.
  await Promise.all(
    state.map((s) =>
      prisma.user.update({
        where: { id: s.id },
        data: { lastAssignedAt: s.lastAssignedAt ?? undefined },
      }),
    ),
  );
  return count;
}

