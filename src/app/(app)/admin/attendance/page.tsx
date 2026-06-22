import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { attendanceStats } from "@/lib/students";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { StudentControls } from "@/components/admin/StudentControls";
import { EnrollStudent } from "@/components/admin/EnrollStudent";
import { MetricCard } from "@/components/MetricCard";
import { formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [stats, students, tracks, unenrolled] = await Promise.all([
    attendanceStats(prisma),
    prisma.lead.findMany({
      where: { OR: [{ stage: "CLOSED_WON" }, { studentTrackId: { not: null } }] },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        studentStatus: true,
        studentTrackId: true,
        studentTrack: { select: { name: true } },
      },
    }),
    prisma.track.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.lead.findMany({
      where: { studentTrackId: null },
      orderBy: [{ fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        cohort: { select: { name: true } },
      },
    }),
  ]);

  const totalStudents = students.length;
  const active = students.filter((s) => s.studentStatus === "ACTIVE").length;
  const completed = students.filter((s) => s.studentStatus === "COMPLETED").length;
  const overallCompletion =
    totalStudents === 0
      ? 0
      : students.filter((s) => ["ACTIVE", "COMPLETED"].includes(s.studentStatus))
          .length / totalStudents;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance & students</h1>
        <p className="text-sm text-muted-foreground">
          Completion = students still enrolled or finished. Engagement = present ÷
          total attendance marks.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Students" value={String(totalStudents)} tone="black" />
        <MetricCard label="Active" value={String(active)} tone="yellow" />
        <MetricCard label="Completed" value={String(completed)} tone="black" />
        <MetricCard
          label="Completion Rate"
          value={formatPercent(overallCompletion)}
          tone="yellow"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title="Engagement (attendance) rate by track"
          data={stats.map((s) => ({ label: s.trackName, value: s.engagementRate }))}
          format="percent"
          horizontal
          barColor="#FFD400"
        />
        <BarChartCard
          title="Completion rate by track"
          data={stats.map((s) => ({ label: s.trackName, value: s.completionRate }))}
          format="percent"
          horizontal
          barColor="#0A0A0A"
        />
      </div>

      {/* Per-track breakdown */}
      <div className="overflow-x-auto rounded-xl border border-brand-black/10">
        <table className="w-full text-sm">
          <thead className="bg-brand-black/[0.03] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Track</th>
              <th className="px-4 py-3 font-medium">Tutor</th>
              <th className="px-4 py-3 text-center font-medium">Active</th>
              <th className="px-4 py-3 text-center font-medium">Completed</th>
              <th className="px-4 py-3 text-center font-medium">Dropped</th>
              <th className="px-4 py-3 text-center font-medium">Deferred</th>
              <th className="px-4 py-3 text-center font-medium">Completion</th>
              <th className="px-4 py-3 text-center font-medium">Engagement</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.trackId} className="border-t border-brand-black/5">
                <td className="px-4 py-3 font-medium">{s.trackName}</td>
                <td className="px-4 py-3">{s.tutorName ?? "—"}</td>
                <td className="px-4 py-3 text-center">{s.active}</td>
                <td className="px-4 py-3 text-center">{s.completed}</td>
                <td className="px-4 py-3 text-center">{s.dropped}</td>
                <td className="px-4 py-3 text-center">{s.deferred}</td>
                <td className="px-4 py-3 text-center">{formatPercent(s.completionRate)}</td>
                <td className="px-4 py-3 text-center">{formatPercent(s.engagementRate)}</td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No students enrolled yet (win a deal to enroll a student).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Enroll a lead as a student (e.g. previous-cohort / imported leads) */}
      <section className="space-y-3 rounded-xl border border-brand-black/10 p-4">
        <div>
          <h2 className="text-lg font-semibold">Enroll a student</h2>
          <p className="text-sm text-muted-foreground">
            Add any lead (including previous-cohort or imported leads) onto a track
            — they&apos;re routed to that track&apos;s tutor for attendance.
          </p>
        </div>
        <EnrollStudent leads={unenrolled.map((l) => ({
          id: l.id,
          fullName: l.fullName,
          cohort: l.cohort?.name ?? null,
        }))} tracks={tracks} />
      </section>

      {/* Student management */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Students ({totalStudents})</h2>
        <div className="space-y-2">
          {students.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-black/10 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{s.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {s.studentTrack?.name ?? "No track"} · {s.studentStatus}
                </p>
              </div>
              <StudentControls
                leadId={s.id}
                status={s.studentStatus}
                trackId={s.studentTrackId}
                tracks={tracks}
              />
            </div>
          ))}
          {totalStudents === 0 && (
            <p className="text-sm text-muted-foreground">No students yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
