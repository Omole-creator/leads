import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  activeStudents,
  attendanceForDate,
  attendanceTotals,
  cohortOptions,
  resolveCohort,
} from "@/lib/students";
import { AttendanceSheet } from "@/components/AttendanceSheet";
import { CohortFilter } from "@/components/CohortFilter";

export const dynamic = "force-dynamic";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function TakeAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ trackId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TUTOR" && user.role !== "ADMIN") redirect("/dashboard");
  const { trackId } = await params;
  const sp = await searchParams;

  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) notFound();
  if (user.role !== "ADMIN" && track.tutorId !== user.id) redirect("/attendance");

  const dateStr = sp.date || todayStr();
  const date = new Date(dateStr + "T00:00:00Z");
  const { cohorts, activeId } = await cohortOptions(prisma);
  const { cohortId, value: cohortValue } = resolveCohort(sp.cohort, activeId);
  const [students, existing, totals] = await Promise.all([
    activeStudents(prisma, trackId, cohortId),
    attendanceForDate(prisma, trackId, date, cohortId),
    attendanceTotals(prisma, trackId, cohortId),
  ]);

  return (
    <div className="space-y-5">
      <Link
        href="/attendance"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← All classes
      </Link>
      <h1 className="text-2xl font-bold">{track.name} — attendance</h1>
      {cohorts.length > 0 && (
        <CohortFilter cohorts={cohorts} value={cohortValue} />
      )}
      <AttendanceSheet
        key={`${cohortValue}:${dateStr}`}
        trackId={trackId}
        date={dateStr}
        students={students.map((s) => ({ id: s.id, fullName: s.fullName }))}
        existing={existing}
        totals={totals}
      />
    </div>
  );
}
