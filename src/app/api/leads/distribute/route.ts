import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { distributeUnassignedLeads, type LeadFilters } from "@/lib/leads";
import type { Stage } from "@prisma/client";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const b = await req.json().catch(() => ({}));
  const filters: LeadFilters = {
    cohortId: b?.cohortId || undefined,
    trackId: b?.trackId || undefined,
    stage: (b?.stage as Stage) || undefined,
    segment: b?.segment || undefined,
  };

  const assigned = await distributeUnassignedLeads(prisma, filters);
  return NextResponse.json({ assigned });
}
