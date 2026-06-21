import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { computeDashboardMetrics } from "@/lib/metrics-service";
import { MetricCard } from "@/components/MetricCard";
import { CohortSelector } from "@/components/CohortSelector";
import { BarChartCard, CHART_COLORS } from "@/components/charts/BarChartCard";
import { PieChartCard } from "@/components/charts/PieChartCard";
import { STAGE_LABELS } from "@/lib/constants";
import { formatPercent } from "@/lib/utils";
import type { Stage } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const [m, cohorts] = await Promise.all([
    computeDashboardMetrics(prisma, user, { cohortId: sp.cohortId }),
    prisma.cohort.findMany({ orderBy: { startDate: "desc" } }),
  ]);

  const funnelData = (Object.keys(m.funnel) as Stage[]).map((s) => ({
    label: STAGE_LABELS[s],
    value: m.funnel[s],
  }));

  const toBars = (rows: { label: string; count: number }[]) =>
    rows.map((r) => ({ label: r.label, value: r.count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Overview</h1>
        <CohortSelector cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Total Leads" value={String(m.totalLeads)} tone="black" />
        <MetricCard label="Open" value={String(m.openLeads)} sub="in pipeline" tone="white" />
        <MetricCard label="Sales Won" value={String(m.closedWon)} tone="yellow" />
        <MetricCard label="Sales Lost" value={String(m.closedLost)} tone="black" />
        <MetricCard
          label="Close Rate"
          value={formatPercent(m.closeRate)}
          sub="won / closed"
          tone="yellow"
        />
      </div>

      {/* Charts: a mix of pie + bar */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PieChartCard
          title="Leads by Source"
          description="Where leads come from"
          data={toBars(m.leadsBySource)}
        />
        <BarChartCard
          title="Pipeline by Stage"
          description="How leads are distributed across the pipeline"
          data={funnelData}
        />
        <BarChartCard
          title="Leads by Track"
          description="Which skills draw the most demand"
          data={toBars(m.leadsByTrack)}
          horizontal
          colors={CHART_COLORS}
        />
        <BarChartCard
          title="Conversion Rate by Track"
          description="Which skills close best"
          data={m.conversionByTrack.map((r) => ({ label: r.label, value: r.rate }))}
          format="percent"
          horizontal
          colors={CHART_COLORS}
        />
        <BarChartCard
          title="Leads per Closer"
          description="Workload across the closing team"
          data={m.perRep.map((r) => ({ label: r.name, value: r.leads }))}
          horizontal
          colors={CHART_COLORS}
        />
        <BarChartCard
          title="Sales Won per Closer"
          description="Deals won leaderboard"
          data={m.perRep.map((r) => ({ label: r.name, value: r.won }))}
          horizontal
          colors={CHART_COLORS}
        />
        <BarChartCard
          title="Sales Lost per Closer"
          description="Deals lost per closer"
          data={m.perRep.map((r) => ({ label: r.name, value: r.lost }))}
          horizontal
          colors={CHART_COLORS}
        />
      </div>
    </div>
  );
}
