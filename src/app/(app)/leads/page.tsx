import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { listLeads, type LeadFilters } from "@/lib/leads";
import { LeadsFilterBar } from "@/components/LeadsFilterBar";
import { StageBadge } from "@/components/StageBadge";
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
    repId: isAdmin ? sp.repId : undefined,
  };

  const [leads, cohorts, tracks, reps] = await Promise.all([
    listLeads(prisma, user, filters),
    prisma.cohort.findMany({ orderBy: { startDate: "desc" } }),
    prisma.track.findMany({ orderBy: { name: "asc" } }),
    isAdmin
      ? prisma.user.findMany({
          where: { role: "SALES_REP" },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <span className="text-sm text-muted-foreground">{leads.length} total</span>
      </div>

      <LeadsFilterBar
        cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
        tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
        reps={reps.map((r) => ({ id: r.id, name: r.name }))}
        showRepFilter={isAdmin}
      />

      <div className="overflow-x-auto rounded-xl border border-brand-black/10">
        <table className="w-full text-sm">
          <thead className="bg-brand-black/[0.03] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Track</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Rep</th>}
              <th className="px-4 py-3 font-medium">Source</th>
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
                </td>
                <td className="px-4 py-3">{lead.track.name}</td>
                <td className="px-4 py-3">
                  <StageBadge stage={lead.stage} />
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    {lead.assignedRep?.name ?? (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">{lead.howFoundUs}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 5 : 4}
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
