import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { computeDashboardMetrics } from "@/lib/metrics-service";
import type { LeadFilters } from "@/lib/leads";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const sp = req.nextUrl.searchParams;
  const filters: LeadFilters = {
    cohortId: sp.get("cohortId") ?? undefined,
    repId: sp.get("repId") ?? undefined,
    from: sp.get("from") ? new Date(sp.get("from")!) : undefined,
    to: sp.get("to") ? new Date(sp.get("to")!) : undefined,
  };

  const metrics = await computeDashboardMetrics(prisma, auth.user, filters);
  return NextResponse.json(metrics);
}
