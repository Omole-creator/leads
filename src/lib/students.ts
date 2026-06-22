import type { PrismaClient } from "@prisma/client";

/** Tracks a tutor owns, with their active-student counts. */
export async function tutorTracks(prisma: PrismaClient, tutorId: string) {
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
        },
      }),
    })),
  );
}

/**
 * Active students in a track. A student is any lead assigned to the track for
 * tutoring (`studentTrackId`) and still ACTIVE — won deals enroll automatically,
 * but the admin can also enroll past-cohort/imported leads manually, so this is
 * deliberately NOT gated on stage = CLOSED_WON.
 */
export function activeStudents(prisma: PrismaClient, trackId: string) {
  return prisma.lead.findMany({
    where: {
      studentTrackId: trackId,
      studentStatus: "ACTIVE",
    },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true },
  });
}

/** Cumulative attendance per student in a track, across every class date. */
export async function attendanceTotals(prisma: PrismaClient, trackId: string) {
  const rows = await prisma.attendance.findMany({
    where: { trackId },
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
) {
  const rows = await prisma.attendance.findMany({
    where: { trackId, date: classDay(date) },
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
): Promise<TrackAttendanceStats[]> {
  const tracks = await prisma.track.findMany({
    where: { studentLeads: { some: {} } },
    orderBy: { name: "asc" },
    include: { tutor: true },
  });

  const out: TrackAttendanceStats[] = [];
  for (const t of tracks) {
    const students = await prisma.lead.findMany({
      where: { studentTrackId: t.id },
      select: { studentStatus: true },
    });
    const enrolled = students.length;
    const by = (s: string) => students.filter((x) => x.studentStatus === s).length;
    const completed = by("COMPLETED");
    const dropped = by("DROPPED");
    const deferred = by("DEFERRED");

    const marks = await prisma.attendance.findMany({
      where: { trackId: t.id },
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
