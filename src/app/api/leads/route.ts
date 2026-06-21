import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/api";
import { listLeads, type LeadFilters } from "@/lib/leads";
import { ingestLead } from "@/lib/ingest";
import { ingestSchema } from "@/lib/schemas";
import type { Stage } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const sp = req.nextUrl.searchParams;
  const filters: LeadFilters = {
    cohortId: sp.get("cohortId") ?? undefined,
    repId: sp.get("repId") ?? undefined,
    stage: (sp.get("stage") as Stage) ?? undefined,
    trackId: sp.get("trackId") ?? undefined,
    from: sp.get("from") ? new Date(sp.get("from")!) : undefined,
    to: sp.get("to") ? new Date(sp.get("to")!) : undefined,
  };

  const leads = await listLeads(prisma, auth.user, filters);
  return NextResponse.json(leads);
}

// Admin manually adds a lead. Reuses the same ingest pipeline (track match /
// create, cohort find-or-create, round-robin assignment, follow-up rows).
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = ingestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const result = await ingestLead(prisma, parsed.data);
  return NextResponse.json(result, { status: 201 });
}
