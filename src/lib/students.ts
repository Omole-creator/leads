import type { PrismaClient } from "@prisma/client";

/** Cohorts for the attendance filter, newest first, + the active one's id. */
export async function cohortOptions(prisma: PrismaClient) {
  const cohorts = await prisma.cohort.findMany({
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });
  const active = cohorts.find((c) => c.active) ?? null;
  return { cohorts, activeId: active?.id ?? null };
}

/**
 * Resolve `?cohort=` into a filter + the value the dropdown should show.
 * - explicit id  → that cohort
 * - "all"        → no filter (every cohort)
 * - absent       → default to the active cohort (null filter if none is active)
 */
export function resolveCohort(
  selected: string | undefined,
  activeId: string | null,
): { cohortId: string | null; value: string } {
  if (selected === "all") return { cohortId: null, value: "all" };
  if (selected) return { cohortId: selected, value: selected };
  return { cohortId: activeId, value: activeId ?? "all" };
}

/** Tracks a tutor owns, with their active-student counts (scoped to a cohort). */
export async function tutorTracks(
  prisma: PrismaClient,
  tutorId: string,
  cohortId?: string | null,
) {
  const tracks = await prisma.track.findMany({
    where: { tutorId },
    orderBy: { name: "asc" },
  });
  return Promise.all(
    tracks.map(async (t) => ({
      ...t,
      activeCount: await prisma.lead.count({
        where: {
          studentTrackId: t.id,
          studentStatus: "ACTIVE",
          ...(cohortId ? { cohortId } : {}),
        },
      }),
    })),
  );
}

/**
 * Active students in a track. A student is any lead assigned to the track for
 * tutoring (`studentTrackId`) and still ACTIVE — won deals enroll automatically,
 * but the admin can also enroll past-cohort/imported leads manually, so this is
 * deliberately NOT gated on stage = CLOSED_WON. Optionally scoped to a cohort so
 * a tutor sees only the selected cohort's class (e.g. July, not April).
 */
export function activeStudents(
  prisma: PrismaClient,
  trackId: string,
  cohortId?: string | null,
) {
  return prisma.lead.findMany({
    where: {
      studentTrackId: trackId,
      studentStatus: "ACTIVE",
      ...(cohortId ? { cohortId } : {}),
    },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true },
  });
}

/** Cumulative attendance per student in a track, across every class date. */
export async function attendanceTotals(
  prisma: PrismaClient,
  trackId: string,
  cohortId?: string | null,
) {
  const rows = await prisma.attendance.findMany({
    where: { trackId, ...(cohortId ? { lead: { cohortId } } : {}) },
    select: { leadId: true, present: true },
  });
  const totals: Record<string, { present: number; total: number }> = {};
  for (const r of rows) {
    const t = (totals[r.leadId] ??= { present: 0, total: 0 });
    t.total++;
    if (r.present) t.present++;
  }
  return totals;
}

/** Normalize a date to midnight UTC so one class day upserts cleanly. */
function classDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Save attendance for a class date: one row per student (upsert). */
export async function saveAttendance(
  prisma: PrismaClient,
  trackId: string,
  date: Date,
  marks: { leadId: string; present: boolean }[],
  byId: string,
) {
  const day = classDay(date);
  for (const m of marks) {
    await prisma.attendance.upsert({
      where: { leadId_date: { leadId: m.leadId, date: day } },
      create: { leadId: m.leadId, trackId, date: day, present: m.present, byId },
      update: { present: m.present, byId, trackId },
    });
  }
  return marks.length;
}

/** Existing attendance for a track on a given date, keyed by leadId. */
export async function attendanceForDate(
  prisma: PrismaClient,
  trackId: string,
  date: Date,
  cohortId?: string | null,
) {
  const rows = await prisma.attendance.findMany({
    where: {
      trackId,
      date: classDay(date),
      ...(cohortId ? { lead: { cohortId } } : {}),
    },
    select: { leadId: true, present: true },
  });
  return Object.fromEntries(rows.map((r) => [r.leadId, r.present]));
}

export interface TrackAttendanceStats {
  trackId: string;
  trackName: string;
  tutorName: string | null;
  students: number; // enrolled (won) ever
  active: number;
  completed: number;
  dropped: number;
  deferred: number;
  completionRate: number; // finished / enrolled
  engagementRate: number; // present / total marks
}

/** Per-track completion + engagement (attendance) stats for the admin. */
export async function attendanceStats(
  prisma: PrismaClient,
  cohortId?: string | null,
): Promise<TrackAttendanceStats[]> {
  const tracks = await prisma.track.findMany({
    where: { studentLeads: { some: cohortId ? { cohortId } : {} } },
    orderBy: { name: "asc" },
    include: { tutor: true },
  });

  const out: TrackAttendanceStats[] = [];
  for (const t of tracks) {
    const students = await prisma.lead.findMany({
      where: { studentTrackId: t.id, ...(cohortId ? { cohortId } : {}) },
      select: { studentStatus: true },
    });
    const enrolled = students.length;
    const by = (s: string) => students.filter((x) => x.studentStatus === s).length;
    const completed = by("COMPLETED");
    const dropped = by("DROPPED");
    const deferred = by("DEFERRED");

    const marks = await prisma.attendance.findMany({
      where: { trackId: t.id, ...(cohortId ? { lead: { cohortId } } : {}) },
      select: { present: true },
    });
    const present = marks.filter((m) => m.present).length;

    out.push({
      trackId: t.id,
      trackName: t.name,
      tutorName: t.tutor?.name ?? null,
      students: enrolled,
      active: by("ACTIVE"),
      completed,
      dropped,
      deferred,
      completionRate: enrolled === 0 ? 0 : (enrolled - dropped - deferred) / enrolled,
      engagementRate: marks.length === 0 ? 0 : present / marks.length,
    });
  }
  return out;
}
