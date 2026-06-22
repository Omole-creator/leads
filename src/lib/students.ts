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
          stage: "CLOSED_WON",
          studentStatus: "ACTIVE",
        },
      }),
    })),
  );
}

/** Active students (won leads) in a track. */
export function activeStudents(prisma: PrismaClient, trackId: string) {
  return prisma.lead.findMany({
    where: {
      studentTrackId: trackId,
      stage: "CLOSED_WON",
      studentStatus: "ACTIVE",
    },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true },
  });
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
    where: { studentLeads: { some: { stage: "CLOSED_WON" } } },
    orderBy: { name: "asc" },
    include: { tutor: true },
  });

  const out: TrackAttendanceStats[] = [];
  for (const t of tracks) {
    const students = await prisma.lead.findMany({
      where: { studentTrackId: t.id, stage: "CLOSED_WON" },
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
