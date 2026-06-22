import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { attendanceStats, cohortOptions, resolveCohort } from "@/lib/students";
import { CohortFilter } from "@/components/CohortFilter";
import { PrintButton } from "@/components/admin/PrintButton";
import { formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GrantReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const { cohorts, activeId } = await cohortOptions(prisma);
  const { cohortId, value: cohortValue } = resolveCohort(sp.cohort, activeId);
  const cohortName =
    cohortValue === "all"
      ? "All cohorts"
      : (cohorts.find((c) => c.id === cohortValue)?.name ?? "All cohorts");

  const leadWhere = cohortId ? { cohortId } : {};
  const [stats, marks, applicantLeads] = await Promise.all([
    attendanceStats(prisma, cohortId),
    prisma.attendance.findMany({
      where: { ...(cohortId ? { lead: { cohortId } } : {}) },
      select: { present: true },
    }),
    prisma.lead.findMany({
      where: leadWhere,
      select: { track: { select: { name: true } } },
    }),
  ]);

  // Reach & demand: how many people applied and for which programs.
  const applicants = applicantLeads.length;
  const demandMap = new Map<string, number>();
  for (const l of applicantLeads) {
    const name = l.track?.name ?? "Unknown";
    demandMap.set(name, (demandMap.get(name) ?? 0) + 1);
  }
  const demandByTrack = [...demandMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const tracksInDemand = demandByTrack.length;

  const enrolled = stats.reduce((n, s) => n + s.students, 0);
  const active = stats.reduce((n, s) => n + s.active, 0);
  const completed = stats.reduce((n, s) => n + s.completed, 0);
  const dropped = stats.reduce((n, s) => n + s.dropped, 0);
  const deferred = stats.reduce((n, s) => n + s.deferred, 0);
  const completionRate = enrolled === 0 ? 0 : completed / enrolled;
  const present = marks.filter((m) => m.present).length;
  const engagementRate = marks.length === 0 ? 0 : present / marks.length;
  const conversionRate = applicants === 0 ? 0 : enrolled / applicants;

  const generatedOn = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const reachKpis: { label: string; value: string }[] = [
    { label: "Applicants", value: String(applicants) },
    { label: "Enrolled students", value: String(enrolled) },
    { label: "Conversion (enrolled ÷ applicants)", value: formatPercent(conversionRate) },
    { label: "Programs in demand", value: String(tracksInDemand) },
  ];
  const outcomeKpis: { label: string; value: string }[] = [
    { label: "Currently active", value: String(active) },
    { label: "Completed", value: String(completed) },
    { label: "Completion rate", value: formatPercent(completionRate) },
    { label: "Attendance (engagement)", value: formatPercent(engagementRate) },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Controls — hidden in the printout */}
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Training outcomes report</h1>
          <p className="text-sm text-muted-foreground">
            Pick a cohort, then “Download / Print PDF” to save a one-page report
            for grant applications. Reviewers need no login — you send the PDF.
          </p>
        </div>
        <div className="flex items-end gap-3">
          {cohorts.length > 0 && (
            <CohortFilter cohorts={cohorts} value={cohortValue} />
          )}
          <PrintButton />
        </div>
      </div>

      {/* The report itself */}
      <article className="space-y-6 rounded-xl border border-brand-black/10 p-8 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b border-brand-black/15 pb-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="JobMingle"
              width={140}
              height={40}
              className="h-10 w-auto object-contain"
            />
            <div>
              <p className="text-lg font-bold leading-tight">JobMingle Academy</p>
              <p className="text-sm text-muted-foreground">
                Training Outcomes Report
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{cohortName}</p>
            <p className="text-muted-foreground">Generated {generatedOn}</p>
          </div>
        </header>

        <section>
          <h2 className="mb-3 text-base font-semibold">Reach &amp; demand</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {reachKpis.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-brand-black/15 p-4"
              >
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          {demandByTrack.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Applicants by program</p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-y border-brand-black/15 text-left">
                    <th className="py-2 pr-2 font-medium">Program / track</th>
                    <th className="py-2 pl-2 text-center font-medium">Applicants</th>
                  </tr>
                </thead>
                <tbody>
                  {demandByTrack.map((d) => (
                    <tr key={d.name} className="border-b border-brand-black/10">
                      <td className="py-2 pr-2">{d.name}</td>
                      <td className="py-2 pl-2 text-center">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-brand-black/30 font-semibold">
                    <td className="py-2 pr-2">Total applicants</td>
                    <td className="py-2 pl-2 text-center">{applicants}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">Training outcomes</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {outcomeKpis.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-brand-black/15 p-4"
              >
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">Outcomes by track</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-brand-black/15 text-left">
                <th className="py-2 pr-2 font-medium">Track</th>
                <th className="py-2 pr-2 font-medium">Tutor</th>
                <th className="py-2 px-2 text-center font-medium">Enrolled</th>
                <th className="py-2 px-2 text-center font-medium">Active</th>
                <th className="py-2 px-2 text-center font-medium">Completed</th>
                <th className="py-2 px-2 text-center font-medium">Dropped</th>
                <th className="py-2 px-2 text-center font-medium">Deferred</th>
                <th className="py-2 px-2 text-center font-medium">Completion</th>
                <th className="py-2 pl-2 text-center font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.trackId} className="border-b border-brand-black/10">
                  <td className="py-2 pr-2 font-medium">{s.trackName}</td>
                  <td className="py-2 pr-2">{s.tutorName ?? "—"}</td>
                  <td className="py-2 px-2 text-center">{s.students}</td>
                  <td className="py-2 px-2 text-center">{s.active}</td>
                  <td className="py-2 px-2 text-center">{s.completed}</td>
                  <td className="py-2 px-2 text-center">{s.dropped}</td>
                  <td className="py-2 px-2 text-center">{s.deferred}</td>
                  <td className="py-2 px-2 text-center">
                    {formatPercent(s.completionRate)}
                  </td>
                  <td className="py-2 pl-2 text-center">
                    {formatPercent(s.engagementRate)}
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No enrolled students for this cohort yet.
                  </td>
                </tr>
              )}
            </tbody>
            {stats.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-brand-black/30 font-semibold">
                  <td className="py-2 pr-2">Total</td>
                  <td className="py-2 pr-2" />
                  <td className="py-2 px-2 text-center">{enrolled}</td>
                  <td className="py-2 px-2 text-center">{active}</td>
                  <td className="py-2 px-2 text-center">{completed}</td>
                  <td className="py-2 px-2 text-center">{dropped}</td>
                  <td className="py-2 px-2 text-center">{deferred}</td>
                  <td className="py-2 px-2 text-center">
                    {formatPercent(completionRate)}
                  </td>
                  <td className="py-2 pl-2 text-center">
                    {formatPercent(engagementRate)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>

        <footer className="border-t border-brand-black/15 pt-3 text-xs text-muted-foreground">
          <p>
            Conversion = enrolled students ÷ applicants. Completion = students
            marked Completed ÷ enrolled. Attendance (engagement) = present marks ÷
            total attendance marks recorded. Demand reflects each applicant&apos;s
            program of interest. Figures cover {cohortName.toLowerCase()}.
          </p>
        </footer>
      </article>
    </div>
  );
}
