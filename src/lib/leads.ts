import type { PrismaClient, Prisma, Stage, FollowUpType } from "@prisma/client";
import type { SessionUser } from "./permissions";

export interface LeadFilters {
  cohortId?: string;
  repId?: string;
  stage?: Stage;
  trackId?: string;
  from?: Date;
  to?: Date;
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
  if (f.stage) where.stage = f.stage;
  if (f.trackId) where.trackId = f.trackId;
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
    include: { track: true, cohort: true, assignedRep: true },
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
  return prisma.lead.update({
    where: { id },
    data: {
      stage,
      closedAt: CLOSED_STAGES.includes(stage) ? closedAt ?? new Date() : null,
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

