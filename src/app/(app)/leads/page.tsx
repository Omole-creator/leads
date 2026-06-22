import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { listLeads, unassignedWhere, type LeadFilters } from "@/lib/leads";
import { LeadsFilterBar } from "@/components/LeadsFilterBar";
import { StageBadge } from "@/components/StageBadge";
import { AssignUnassignedButton } from "@/components/AssignUnassignedButton";
import { BulkAssignControl } from "@/components/BulkAssignControl";
import { DeleteLeadButton } from "@/components/DeleteLeadButton";
import { ReassignControl } from "@/components/ReassignControl";
import { Button } from "@/components/ui/button";
import type { Stage } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const isAdmin = user.role === "ADMIN";

  const filters: LeadFilters = {
    cohortId: sp.cohortId,
    trackId: sp.trackId,
    stage: sp.stage as Stage | undefined,
    segment: sp.segment,
    repId: isAdmin ? sp.repId : undefined,
  };

  const [leads, cohorts, tracks, reps, unassignedCount, segmentRows] =
    await Promise.all([
      listLeads(prisma, user, filters),
      prisma.cohort.findMany({ orderBy: { startDate: "desc" } }),
      prisma.track.findMany({ orderBy: { name: "asc" } }),
      isAdmin
        ? prisma.user.findMany({
            where: { role: "SALES_REP" },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      isAdmin
        ? prisma.lead.count({
            where: unassignedWhere({
              cohortId: sp.cohortId,
              trackId: sp.trackId,
              stage: sp.stage as Stage | undefined,
              segment: sp.segment,
            }),
          })
        : Promise.resolve(0),
      prisma.lead.findMany({ distinct: ["segment"], select: { segment: true } }),
    ]);
  const segments = segmentRows.map((r) => r.segment).sort();
  const repOptions = reps.map((r) => ({ id: r.id, name: r.name }));
  const filterActive = Boolean(
    sp.cohortId || sp.trackId || sp.stage || sp.segment,
  );

  const colCount = isAdmin ? 7 : 5;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {leads.length} total
          </span>
          {isAdmin && (
            <AssignUnassignedButton
              count={unassignedCount}
              filtered={filterActive}
            />
          )}
          {isAdmin && (
            <BulkAssignControl count={leads.length} reps={repOptions} />
          )}
          {isAdmin && (
            <Button asChild size="sm">
              <Link href="/leads/new">+ Add lead</Link>
            </Button>
          )}
        </div>
      </div>

      <LeadsFilterBar
        cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
        tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
        reps={reps.map((r) => ({ id: r.id, name: r.name }))}
        segments={segments}
        showRepFilter={isAdmin}
      />

      <div className="overflow-x-auto rounded-xl border border-brand-black/10">
        <table className="w-full text-sm">
          <thead className="bg-brand-black/[0.03] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Track</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Closer</th>}
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 text-center font-medium">Follow-ups</th>
              {isAdmin && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-t border-brand-black/5 hover:bg-brand-yellow/10"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium hover:underline"
                  >
                    {lead.fullName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{lead.phone}</div>
                  {lead.segment !== "APPLICATION" && (
                    <span className="mt-1 inline-block rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-blue">
                      {lead.segment}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{lead.track.name}</td>
                <td className="px-4 py-3">
                  <StageBadge stage={lead.stage} />
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="w-40">
                      <ReassignControl
                        leadId={lead.id}
                        assignedRepId={lead.assignedRepId}
                        reps={repOptions}
                      />
                    </div>
                  </td>
                )}
                <td className="px-4 py-3">{lead.howFoundUs}</td>
                <td className="px-4 py-3 text-center">{lead._count.followUpLogs}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DeleteLeadButton leadId={lead.id} leadName={lead.fullName} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
